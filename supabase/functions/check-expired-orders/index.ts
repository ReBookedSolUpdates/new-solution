import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildExpiredBuyerCancelEmail,
  buildExpiredSellerCancelEmail,
  buildSellerConfirmReminderEmail,
  buildBuyerDeliveryReminderEmail,
  buildDisputeEscalatedOpsEmail
} from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-expired-orders] Running pending_commit 48h auto-decline...');

    const expiryCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: expiredOrders, error: expiredFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending_commit')
      .neq('order_type', 'pickup')
      .lt('created_at', expiryCutoff);

    if (expiredFetchError) {
      throw expiredFetchError;
    }

    const expired = expiredOrders || [];
    let processed = 0;

    for (const order of expired) {
      try {
        // STEP 1: Refund the buyer via bobpay-refund
        try {
          await fetch(`${supabaseUrl}/functions/v1/bobpay-refund`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              order_id: order.id,
              reason: "Order auto-cancelled: seller did not commit within 48 hours",
            }),
          });
        } catch (refundErr) {
          console.error(`[check-expired-orders] Refund failed for ${order.id}:`, refundErr);
        }

        // STEP 2: Mark order cancelled / declined
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Seller did not commit within 48 hours',
            decline_reason: 'Auto-decline: seller missed 48h commit window',
            declined_at: new Date().toISOString(),
            refund_status: 'completed',
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        // STEP 3: Relist the item
        if (order.item_id && order.item_type) {
          const tableMap: Record<string, string> = {
            'book': 'books',
            'textbook': 'books',
            'uniform': 'uniforms',
            'school_supply': 'school_supplies',
            'stationery': 'school_supplies'
          };
          const tableName = tableMap[order.item_type] || 'books';
          await supabase.from(tableName).update({ sold: false }).eq('id', order.item_id);
        }

        // STEP 4: Calculate 90% lost potential earnings for seller
        const items = Array.isArray(order.items) ? order.items : [];
        const itemTitle = items[0]?.title || items[0]?.name || items[0]?.book_title || "your listed item";
        const itemPrice = Number(items[0]?.price ?? items[0]?.amount ?? order.total_amount ?? 0);
        const lostEarnings = (itemPrice * 0.9).toFixed(2);
        const totalRefunded = Number(order.total_amount || 0).toFixed(2);

        // STEP 5: Email buyer — refund on the way
        if (order.buyer_email) {
          const buyerHtml = buildExpiredBuyerCancelEmail(order.buyer_full_name || "there", itemTitle, totalRefunded);
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              to: order.buyer_email,
              subject: "Refund on the way — Order auto-cancelled",
              html: buyerHtml,
            }),
          }).catch((e) => console.error("Buyer email failed:", e));
        }

        // STEP 6: Email seller — missed commit, lost earnings
        if (order.seller_email) {
          const sellerHtml = buildExpiredSellerCancelEmail(order.seller_full_name || "there", itemTitle, lostEarnings);
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              to: order.seller_email,
              subject: `You missed a commit — R${lostEarnings} in lost earnings`,
              html: sellerHtml,
            }),
          }).catch((e) => console.error("Seller email failed:", e));
        }

        // STEP 7: Notifications
        try {
          await supabase.from('order_notifications').insert([
            {
              order_id: order.id,
              user_id: order.buyer_id,
              type: 'order_cancelled',
              title: 'Order Cancelled — Refund On The Way',
              message: `Seller did not commit. R${totalRefunded} refund is being processed.`,
            },
            {
              order_id: order.id,
              user_id: order.seller_id,
              type: 'commit_missed',
              title: 'Missed commit — R' + lostEarnings + ' lost',
              message: `You did not commit to "${itemTitle}" within 48h.`,
            },
          ]);
        } catch (notifErr) {
          console.error('[check-expired-orders] notification insert failed:', notifErr);
        }

        processed += 1;
      } catch (orderError) {
        console.error(`[check-expired-orders] Failed to process order ${order.id}:`, orderError);
        continue;
      }
    }

    // Pickup orders that miss seller commitment
    const { data: expiredPickupCommits, error: expiredPickupCommitError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'pickup')
      .eq('status', 'pending_commit')
      .lt('created_at', expiryCutoff);

    let pickupCommitProcessed = 0;
    if (expiredPickupCommitError) {
      console.error('[check-expired-orders] Failed to fetch expired pickup commitments:', expiredPickupCommitError);
    } else {
      for (const order of expiredPickupCommits || []) {
        try {
          await supabase
            .from('orders')
            .update({
              pickup_status: 'expired',
              cancellation_reason: 'Pickup seller commitment window expired - manual review required',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          await supabase.from('order_activity_log').insert({
            order_id: order.id,
            user_id: order.seller_id || order.buyer_id,
            activity_type: 'pickup_commit_expired_manual_review',
            description: 'Pickup seller commitment window expired after 48 hours. Manual admin review required; no automatic refund was issued.',
            metadata: {
              order_type: 'pickup',
              pickup_status: 'expired',
              refund_automated: false,
              created_at: order.created_at,
            },
          });

          await supabase.from('order_notifications').insert([
            {
              order_id: order.id,
              user_id: order.buyer_id,
              type: 'pickup_review_required',
              title: 'Pickup Needs Review',
              message: 'The seller did not confirm the pickup order in time. ReBooked support will review before any refund decision.',
            },
            {
              order_id: order.id,
              user_id: order.seller_id,
              type: 'pickup_review_required',
              title: 'Pickup Needs Review',
              message: 'The pickup commitment window expired. ReBooked support will review before any refund decision.',
            },
          ]);

          pickupCommitProcessed += 1;
        } catch (err) {
          console.error(`[check-expired-orders] Failed to flag expired pickup commitment ${order.id}:`, err);
        }
      }
    }

    // Pickup meetup 7-day expiry review flag
    console.log('[check-expired-orders] Running pickup 7-day expiry review flag...');
    const meetupCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiredMeetups, error: expiredMeetupsError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'pickup')
      .in('status', ['committed', 'awaiting_confirmation'])
      .in('pickup_status', ['pending_pickup', 'awaiting_buyer_confirmation', 'awaiting_seller_confirmation'])
      .lt('pickup_committed_at', meetupCutoff);

    let meetupProcessed = 0;
    if (expiredMeetupsError) {
      console.error('[check-expired-orders] Failed to fetch expired pickup orders:', expiredMeetupsError);
    } else {
      for (const order of expiredMeetups || []) {
        try {
          await supabase
            .from('orders')
            .update({
              status: 'awaiting_confirmation',
              pickup_status: 'expired',
              cancellation_reason: 'Pickup meetup window expired - manual review required',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          await supabase.from('order_activity_log').insert({
            order_id: order.id,
            user_id: order.seller_id || order.buyer_id,
            activity_type: 'pickup_expired_manual_review',
            description: 'Pickup meetup window expired after 7 days. Manual admin review required; no automatic refund was issued.',
            metadata: {
              order_type: 'pickup',
              pickup_status: 'expired',
              pickup_committed_at: order.pickup_committed_at,
              buyer_confirmed_at: order.buyer_confirmed_at,
              seller_confirmed_at: order.seller_confirmed_at,
              refund_automated: false,
            },
          });

          await supabase.from('order_notifications').insert([
            {
              order_id: order.id,
              user_id: order.buyer_id,
              type: 'pickup_review_required',
              title: 'Pickup Needs Review',
              message: 'The 7-day pickup window expired. ReBooked support will review the order before any refund or payout decision.',
            },
            {
              order_id: order.id,
              user_id: order.seller_id,
              type: 'pickup_review_required',
              title: 'Pickup Needs Review',
              message: 'The 7-day pickup window expired. ReBooked support will review the order before any refund or payout decision.',
            },
          ]);

          meetupProcessed += 1;
        } catch (err) {
          console.error(`[check-expired-orders] Failed to flag pickup order ${order.id}:`, err);
        }
      }
    }

    // Auto-complete delivered orders after 48 hours if no buyer feedback exists
    console.log('[check-expired-orders] Running delivered 48h auto-completion...');
    const deliveryExpiryCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: deliveredOrders, error: deliveredFetchError } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, delivery_status, updated_at, total_amount')
      .neq('order_type', 'pickup')
      .neq('status', 'completed')
      .or('status.eq.delivered,delivery_status.eq.delivered')
      .lt('updated_at', deliveryExpiryCutoff);

    let deliveryAutoCompleted = 0;
    if (deliveredFetchError) {
      console.error('[check-expired-orders] Failed to fetch delivered orders:', deliveredFetchError);
    } else {
      for (const order of deliveredOrders || []) {
        try {
          const { data: feedbackData, error: feedbackError } = await supabase
            .from('buyer_feedback_orders')
            .select('id')
            .eq('order_id', order.id)
            .maybeSingle();

          if (feedbackError) {
            console.error(`[check-expired-orders] Failed to check feedback for order ${order.id}:`, feedbackError);
            continue;
          }

          if (!feedbackData) {
            console.log(`[check-expired-orders] Auto-completing order ${order.id} (delivered 48h ago, no feedback)...`);

            await supabase.from('buyer_feedback_orders').insert({
              order_id: order.id,
              buyer_id: order.buyer_id,
              seller_id: order.seller_id,
              buyer_status: 'received',
              buyer_feedback: 'System auto-completed after 48 hours',
              total_amount: order.total_amount,
              status: order.status,
              delivery_status: order.delivery_status
            });

            const { data: creditRes, error: creditErr } = await supabase.functions.invoke('credit-wallet-on-collection', {
              body: {
                order_id: order.id,
                seller_id: order.seller_id,
              },
            });

            if (creditErr) {
              console.error(`[check-expired-orders] Failed to credit wallet for auto-completed order ${order.id}:`, creditErr);
            } else {
              console.log(`[check-expired-orders] Successfully credited wallet for order ${order.id}:`, creditRes);
              deliveryAutoCompleted += 1;
            }
          }
        } catch (err) {
          console.error(`[check-expired-orders] Failed to auto-complete order ${order.id}:`, err);
        }
      }
    }

    // ==========================================
    // REMINDER CASCADES (T+12h, 24h, 36h, 47h)
    // ==========================================
    console.log('[check-expired-orders] Running reminder cascades...');

    // 1. Seller Commitment Reminders (pending_commit, not pickup, < 48h old)
    const { data: activeCommits, error: activeCommitsError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending_commit')
      .neq('order_type', 'pickup')
      .gt('created_at', expiryCutoff);

    let sellerRemindersSent = 0;
    if (activeCommitsError) {
      console.error('[check-expired-orders] Failed to fetch active commits for reminders:', activeCommitsError);
    } else {
      for (const order of activeCommits || []) {
        try {
          const elapsedMs = Date.now() - new Date(order.created_at).getTime();
          const elapsedHours = elapsedMs / (1000 * 60 * 60);

          let reminderCode: string | null = null;
          let hoursLeft = 48;
          if (elapsedHours >= 47) {
            reminderCode = '47h';
            hoursLeft = 1;
          } else if (elapsedHours >= 36) {
            reminderCode = '36h';
            hoursLeft = 12;
          } else if (elapsedHours >= 24) {
            reminderCode = '24h';
            hoursLeft = 24;
          } else if (elapsedHours >= 12) {
            reminderCode = '12h';
            hoursLeft = 36;
          }

          if (reminderCode) {
            const metadata = order.metadata || {};
            const sentReminders = metadata.commit_reminders_sent || [];
            if (!sentReminders.includes(reminderCode)) {
              console.log(`[check-expired-orders] Sending T+${reminderCode} commitment reminder for order ${order.id}...`);

              const items = Array.isArray(order.items) ? order.items : [];
              const itemTitle = items[0]?.title || items[0]?.name || items[0]?.book_title || "your listed item";
              const itemPrice = Number(items[0]?.price ?? items[0]?.amount ?? order.total_amount ?? 0);
              const lostEarnings = (itemPrice * 0.9).toFixed(2);

              if (order.seller_email) {
                const reminderHtml = buildSellerConfirmReminderEmail(order.seller_full_name || "Seller", itemTitle, lostEarnings, hoursLeft);

                await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: order.seller_email,
                    subject: `Urgent Reminder: Confirm your sale within ${hoursLeft}h | ReBooked Solutions`,
                    html: reminderHtml,
                  }),
                }).catch((e) => console.error("Seller reminder email failed:", e));
              }

              // Update metadata to track sent reminders
              sentReminders.push(reminderCode);
              metadata.commit_reminders_sent = sentReminders;
              await supabase
                .from('orders')
                .update({ metadata })
                .eq('id', order.id);

              sellerRemindersSent += 1;
            }
          }
        } catch (err) {
          console.error(`[check-expired-orders] Error processing reminder for order ${order.id}:`, err);
        }
      }
    }

    // 2. Buyer Delivery Receipt Reminders (delivered / delivery_status = delivered, not pickup, < 48h since status update)
    const { data: deliveredRemindersList, error: deliveredRemindersFetchError } = await supabase
      .from('orders')
      .select('*')
      .neq('order_type', 'pickup')
      .neq('status', 'completed')
      .or('status.eq.delivered,delivery_status.eq.delivered')
      .gt('updated_at', deliveryExpiryCutoff);

    let buyerRemindersSent = 0;
    if (deliveredRemindersFetchError) {
      console.error('[check-expired-orders] Failed to fetch delivered orders for reminders:', deliveredRemindersFetchError);
    } else {
      for (const order of deliveredRemindersList || []) {
        try {
          const elapsedMs = Date.now() - new Date(order.updated_at).getTime();
          const elapsedHours = elapsedMs / (1000 * 60 * 60);

          let reminderCode: string | null = null;
          let hoursLeft = 48;
          if (elapsedHours >= 47) {
            reminderCode = '47h';
            hoursLeft = 1;
          } else if (elapsedHours >= 36) {
            reminderCode = '36h';
            hoursLeft = 12;
          } else if (elapsedHours >= 24) {
            reminderCode = '24h';
            hoursLeft = 24;
          } else if (elapsedHours >= 12) {
            reminderCode = '12h';
            hoursLeft = 36;
          }

          if (reminderCode) {
            const metadata = order.metadata || {};
            const sentReminders = metadata.delivery_reminders_sent || [];
            if (!sentReminders.includes(reminderCode)) {
              console.log(`[check-expired-orders] Sending T+${reminderCode} delivery confirmation reminder for order ${order.id}...`);

              const items = Array.isArray(order.items) ? order.items : [];
              const itemTitle = items[0]?.title || items[0]?.name || items[0]?.book_title || "your purchased item";

              if (order.buyer_email) {
                const reminderHtml = buildBuyerDeliveryReminderEmail(order.buyer_full_name || "Buyer", itemTitle, hoursLeft);

                await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: order.buyer_email,
                    subject: `Action Required: Confirm receipt of "${itemTitle}" within ${hoursLeft}h`,
                    html: reminderHtml,
                  }),
                }).catch((e) => console.error("Buyer reminder email failed:", e));
              }

              // Update metadata to track sent reminders
              sentReminders.push(reminderCode);
              metadata.delivery_reminders_sent = sentReminders;
              await supabase
                .from('orders')
                .update({ metadata })
                .eq('id', order.id);

              buyerRemindersSent += 1;
            }
          }
        } catch (err) {
          console.error(`[check-expired-orders] Error processing buyer reminder for order ${order.id}:`, err);
        }
      }
    }

    // =====================================================================
    // STEP 6: Auto-escalate expired disputes (48-hour SLA)
    // =====================================================================
    console.log('[check-expired-orders] Running dispute SLA check...');
    let disputeEscalatedCount = 0;
    try {
      const { data: expiredDisputes, error: disputeErr } = await supabase
        .from('orders')
        .select('id, buyer_id, seller_id, dispute_reason, dispute_timer_expires_at, buyer_full_name, seller_full_name')
        .eq('status', 'disputed')
        .eq('dispute_escalated', false)
        .lt('dispute_timer_expires_at', new Date().toISOString());

      if (disputeErr) throw disputeErr;

      for (const order of (expiredDisputes || [])) {
        try {
          // 1. Update order in database to mark escalated
          const { error: updateErr } = await supabase
            .from('orders')
            .update({
              dispute_escalated: true,
              dispute_escalated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateErr) throw updateErr;

          // 2. Log event in order_events
          await supabase.from('order_events').insert({
            order_id: order.id,
            event_type: 'escalated',
            actor: 'system',
            details: { reason: 'Auto-escalated after 48-hour resolution window expired' }
          });

          // 3. Send email to ReBooked Solutions ops (info@rebookedsolutions.co.za)
          const opsEmailHtml = buildDisputeEscalatedOpsEmail(
            order.id,
            order.buyer_full_name || 'Buyer',
            order.seller_full_name || 'Seller',
            order.dispute_reason || 'No reason specified',
            order.dispute_timer_expires_at ? new Date(order.dispute_timer_expires_at).toLocaleString() : 'N/A'
          );

          await supabase.functions.invoke('send-email', {
            body: {
              to: 'info@rebookedsolutions.co.za',
              subject: `🚨 URGENT: Dispute SLA Expired — Order #${order.id.slice(-8).toUpperCase()}`,
              html: opsEmailHtml
            }
          });

          disputeEscalatedCount += 1;
          console.log(`[check-expired-orders] Successfully escalated dispute for order ${order.id}`);
        } catch (err: any) {
          console.error(`[check-expired-orders] Failed to escalate dispute for order ${order.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('[check-expired-orders] Dispute SLA check error:', err.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expired orders and reminder cascades processed',
        processed,
        meetup_processed: meetupProcessed,
        pickup_commit_processed: pickupCommitProcessed,
        delivery_auto_completed_processed: deliveryAutoCompleted,
        seller_reminders_sent: sellerRemindersSent,
        buyer_reminders_sent: buyerRemindersSent,
        dispute_escalated_processed: disputeEscalatedCount,
        total_found: expired.length + (expiredMeetups?.length || 0) + (deliveredOrders?.length || 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[check-expired-orders] Fatal error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
