import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildInactiveReminderEmail } from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Bracket {
  code: string;
  days: number;
  label: string;
}

const BRACKETS: Bracket[] = [
  { code: "12m", days: 365, label: "12 months" },
  { code: "11m", days: 330, label: "11 months" },
  { code: "10m", days: 300, label: "10 months" },
  { code: "9m", days: 270, label: "9 months" },
  { code: "8m", days: 240, label: "8 months" },
  { code: "7m", days: 210, label: "7 months" },
  { code: "6m", days: 180, label: "6 months" },
  { code: "5m", days: 150, label: "5 months" },
  { code: "4m", days: 120, label: "4 months" },
  { code: "3m", days: 90, label: "3 months" },
  { code: "2m", days: 60, label: "2 months" },
  { code: "1m", days: 30, label: "1 month" },
  { code: "2w", days: 14, label: "2 weeks" },
  { code: "1w", days: 7, label: "1 week" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-inactive-users] Scanning for inactive users...');

    // Fetch users who have last_active_at populated
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, last_active_at, email_preferences, inactive_reminders_sent')
      .not('last_active_at', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    let emailsSent = 0;
    const now = new Date();

    for (const profile of profiles || []) {
      const emailPrefs = profile.email_preferences || {};
      const wishlistAlerts = emailPrefs.wishlist_alerts !== false;
      const inactiveReminders = emailPrefs.inactive_reminders !== false;

      // Skip if unsubscribed from inactive reminders
      if (!inactiveReminders) {
        continue;
      }

      if (!profile.email) {
        continue;
      }

      const lastActive = new Date(profile.last_active_at);
      const elapsedMs = now.getTime() - lastActive.getTime();
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

      // Find the deepest bracket satisfied
      let activeBracket: Bracket | null = null;
      for (const bracket of BRACKETS) {
        if (elapsedDays >= bracket.days) {
          activeBracket = bracket;
          break; // BRACKETS is ordered from longest to shortest
        }
      }

      // If activeBracket is found and it is within 12 months, and hasn't been sent yet
      if (activeBracket && elapsedDays <= 390) { // Up to ~12.5 months max
        const sentList = profile.inactive_reminders_sent || [];
        
        if (!sentList.includes(activeBracket.code)) {
          console.log(`[check-inactive-users] Sending ${activeBracket.label} inactive reminder to ${profile.email}...`);

          const emailHtml = buildInactiveReminderEmail(
            profile.full_name || "there",
            activeBracket.label
          );

          // Invoke internal send-email
          const { error: sendError } = await supabase.functions.invoke("send-email", {
            body: {
              to: profile.email,
              subject: `We miss you on ReBooked Solutions!`,
              html: emailHtml,
            }
          });

          if (!sendError) {
            emailsSent++;
            // Update sent reminders
            const updatedSentList = [...sentList, activeBracket.code];
            await supabase
              .from('profiles')
              .update({ inactive_reminders_sent: updatedSentList })
              .eq('id', profile.id);
          } else {
            console.error(`Failed to send email to ${profile.email}:`, sendError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed inactive reminders. Sent ${emailsSent} emails.`,
        emails_sent: emailsSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[check-inactive-users] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
