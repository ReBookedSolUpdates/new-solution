import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';

interface CreateOrderRequest {
  buyer_id: string;
  seller_id: string;
  book_id: string;
  delivery_option: string;
  shipping_address_encrypted?: string;
  payment_reference?: string;
  selected_courier_slug?: string;
  selected_service_code?: string;
  selected_courier_name?: string;
  selected_service_name?: string;
  selected_shipping_cost?: number;
  pickup_type?: 'door' | 'locker';
  pickup_locker_data?: any;
  pickup_locker_location_id?: number;
  pickup_locker_provider_slug?: string;
  delivery_type?: 'door' | 'locker';
  delivery_locker_data?: any;
  delivery_locker_location_id?: number;
  delivery_locker_provider_slug?: string;
  seller_preferred_pickup_method?: 'locker' | 'pickup';
  order_type?: 'delivery' | 'pickup';
  use_wallet?: boolean;
  max_wallet_deduction?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: CreateOrderRequest = await req.json();

    // Validate required fields
    if (!requestData.buyer_id || !requestData.seller_id || !requestData.book_id || !requestData.delivery_option) {
      console.error("❌ Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: buyer_id, seller_id, book_id, delivery_option"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // If a payment_reference was provided, check for existing order (idempotency)
    if (requestData.payment_reference) {
      const { data: existingByRef, error: existingRefError } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_reference', requestData.payment_reference)
        .maybeSingle();

      if (existingRefError) {
        console.warn('⚠️ Failed to query existing order by payment_reference:', existingRefError);
      }

      if (existingByRef) {
        console.log('ℹ️ Existing order found by payment_reference. Returning existing order.');
        return new Response(
          JSON.stringify({ success: true, message: 'Order already exists', order: existingByRef }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for existing active order for this buyer/seller/book combination
    console.log('🔎 Checking for existing active order for buyer/seller/book');
    const { data: existingCombo, error: existingComboError } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', requestData.buyer_id)
      .eq('seller_id', requestData.seller_id)
      .eq('book_id', requestData.book_id)
      .in('status', ['pending_payment', 'pending', 'pending_commit', 'paid', 'committed', 'awaiting_confirmation'])
      .maybeSingle();

    if (existingComboError) {
      console.warn('⚠️ Failed to query existing order by combo:', existingComboError);
    }

    if (existingCombo) {
      console.log('ℹ️ Existing active order found for combo. Returning existing order.');
      return new Response(
        JSON.stringify({ success: true, message: 'Order already exists', order: existingCombo }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to find item across all tables
    const findItem = async (id: string) => {
      const tables = ['books', 'uniforms', 'school_supplies'];
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("id", id)
          .maybeSingle();
        
        if (data) return { data, table };
      }
      return { data: null, table: null };
    };

    // Fetch buyer, seller, and item info
    const [buyerResult, sellerResult, { data: book, table: itemTable }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, name, first_name, last_name, email, phone_number, preferred_delivery_locker_data, preferred_delivery_locker_location_id, preferred_delivery_locker_provider_slug, preferred_pickup_locker_data, preferred_pickup_locker_location_id, preferred_pickup_locker_provider_slug, shipping_address_encrypted")
        .eq("id", requestData.buyer_id)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name, name, first_name, last_name, email, phone_number, pickup_address_encrypted, preferred_pickup_locker_data, preferred_pickup_locker_location_id, preferred_pickup_locker_provider_slug, preferred_delivery_locker_data, preferred_delivery_locker_location_id, preferred_delivery_locker_provider_slug, is_away, pickup_enabled")
        .eq("id", requestData.seller_id)
        .single(),
      findItem(requestData.book_id)
    ]);

    const buyer = buyerResult.data;
    const seller = sellerResult.data;

    if (buyerResult.error || !buyer) {
      console.error("❌ Buyer fetch error:", buyerResult.error);
      return new Response(
        JSON.stringify({ success: false, error: "Buyer not found: " + (buyerResult.error?.message || "Not found") }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (sellerResult.error || !seller) {
      console.error("❌ Seller fetch error:", sellerResult.error);
      return new Response(
        JSON.stringify({ success: false, error: "Seller not found: " + (sellerResult.error?.message || "Not found") }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (seller.is_away) {
      return new Response(
        JSON.stringify({ success: false, error: "Seller is currently away and not accepting new orders" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!book) {
      console.error("❌ Item not found in any table:", requestData.book_id);
      return new Response(
        JSON.stringify({ success: false, error: "Item not found in any inventory" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if book is available (NOT sold yet)
    if (book.sold || book.available_quantity < 1) {
      console.error("❌ Book is not available");
      return new Response(
        JSON.stringify({ success: false, error: "Book is not available - it may have been purchased by someone else" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPickupOrder = requestData.order_type === 'pickup';

    // Verify seller actually has pickup enabled if buyer is attempting pickup
    if (isPickupOrder && !seller.pickup_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: "Seller does not have pickup enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📝 Creating order WITHOUT marking book as sold (deferred until payment confirmation)...");

    // Determine pickup type based on seller's preference (only for delivery orders where courier picks up)
    let pickupType: 'door' | 'locker' = 'door';
    let pickupLockerData = null;
    let pickupLockerLocationId = null;
    let pickupLockerProviderSlug = null;

    if (!isPickupOrder) {
      if (requestData.seller_preferred_pickup_method === 'locker') {
        console.log('📍 Seller preferred pickup method: locker');
        pickupType = 'locker';
        pickupLockerData = requestData.pickup_locker_data || seller.preferred_pickup_locker_data || seller.preferred_delivery_locker_data;
        pickupLockerLocationId = requestData.pickup_locker_location_id || seller.preferred_pickup_locker_location_id || seller.preferred_delivery_locker_location_id;
        pickupLockerProviderSlug = requestData.pickup_locker_provider_slug || seller.preferred_pickup_locker_provider_slug || seller.preferred_delivery_locker_provider_slug;

        if (!pickupLockerLocationId) {
          console.error("❌ Locker pickup selected but seller has no locker location saved");
          return new Response(
            JSON.stringify({ success: false, error: "Seller locker pickup selected but no locker location is configured. Please contact the seller." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (requestData.seller_preferred_pickup_method === 'pickup' || seller.pickup_address_encrypted) {
        console.log('🚪 Seller preferred pickup method: door');
        pickupType = 'door';
      } else {
        console.error("❌ No valid pickup method available");
        return new Response(
          JSON.stringify({ success: false, error: "Seller has not configured a pickup method (locker or address). Please contact the seller." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Determine delivery type and data
    const deliveryType = requestData.delivery_type || 'door';
    let deliveryLockerData = null;
    let deliveryLockerLocationId = null;
    let deliveryLockerProviderSlug = null;
    let shippingAddressEncrypted = requestData.shipping_address_encrypted;

    if (!isPickupOrder) {
      if (deliveryType === 'locker') {
        deliveryLockerData = requestData.delivery_locker_data || buyer.preferred_delivery_locker_data;
        deliveryLockerLocationId = requestData.delivery_locker_location_id || buyer.preferred_delivery_locker_location_id || buyer.preferred_pickup_locker_location_id;
        deliveryLockerProviderSlug = requestData.delivery_locker_provider_slug || buyer.preferred_delivery_locker_provider_slug || buyer.preferred_pickup_locker_provider_slug;
      } else {
        shippingAddressEncrypted = shippingAddressEncrypted || buyer.shipping_address_encrypted;
      }

      // Validate pickup address for door pickup
      if (pickupType === 'door' && !seller.pickup_address_encrypted) {
        console.error("❌ Door pickup selected but seller has no pickup address");
        return new Response(
          JSON.stringify({ success: false, error: "Seller door pickup selected but seller has no pickup address configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate delivery info
      if (deliveryType === 'locker' && !deliveryLockerLocationId) {
        console.error("❌ Locker delivery selected but no locker location provided");
        return new Response(
          JSON.stringify({ success: false, error: "Locker delivery requires locker location" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (deliveryType === 'door' && !shippingAddressEncrypted) {
        console.error("❌ Door delivery selected but no address provided");
        return new Response(
          JSON.stringify({ success: false, error: "Door delivery requires shipping address" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate unique order_id
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Prepare denormalized data
    const buyerFullName = buyer.full_name || buyer.name || `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || 'Unknown Buyer';
    const sellerFullName = seller.full_name || seller.name || `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || 'Unknown Seller';
    const buyerEmail = buyer.email || '';
    const sellerEmail = seller.email || '';
    const buyerPhone = buyer.phone_number || '';
    const sellerPhone = seller.phone_number || '';
    const pickupAddress = (!isPickupOrder && pickupType === 'door') ? seller.pickup_address_encrypted : '';

    // Resolve item_type from which table it was found in
    const itemTypeMap: Record<string, string> = {
      books: 'book',
      uniforms: 'uniform',
      school_supplies: 'school_supply',
    };
    const resolvedItemType = itemTypeMap[itemTable!] || 'book';

    // Calculate checkout pricing
    const buyerProtectionFee = 20.00;
    const shippingFeeCents = isPickupOrder ? 0 : Math.max(0, Number(requestData.selected_shipping_cost || 0));
    const shippingFee = shippingFeeCents / 100;
    const totalAmount = Number(book.price || 0) + buyerProtectionFee + shippingFee;
    const totalAmountCents = Math.round(totalAmount * 100);

    // Call atomic SQL RPC function to create the order and handle wallet deduction safely
    const { data: dbResult, error: dbError } = await supabase.rpc("create_order_with_wallet_deduction", {
      p_order_id: orderId,
      p_buyer_id: requestData.buyer_id,
      p_seller_id: requestData.seller_id,
      p_book_id: requestData.book_id,
      p_item_type: resolvedItemType,
      p_buyer_full_name: buyerFullName,
      p_seller_full_name: sellerFullName,
      p_buyer_email: buyerEmail,
      p_seller_email: sellerEmail,
      p_buyer_phone_number: buyerPhone,
      p_seller_phone_number: sellerPhone,
      p_pickup_address_encrypted: pickupAddress || "",
      p_shipping_address_encrypted: shippingAddressEncrypted || "",
      p_delivery_option: requestData.delivery_option,
      p_pickup_type: pickupType,
      p_pickup_locker_data: pickupLockerData,
      p_pickup_locker_location_id: pickupLockerLocationId ? String(pickupLockerLocationId) : null,
      p_pickup_locker_provider_slug: pickupLockerProviderSlug,
      p_delivery_type: deliveryType,
      p_delivery_locker_data: deliveryLockerData,
      p_delivery_locker_location_id: deliveryLockerLocationId ? String(deliveryLockerLocationId) : null,
      p_delivery_locker_provider_slug: deliveryLockerProviderSlug,
      p_delivery_data: {
        delivery_option: requestData.delivery_option,
        delivery_type: deliveryType,
        pickup_type: pickupType,
        requested_at: new Date().toISOString(),
        selected_courier_slug: isPickupOrder ? null : requestData.selected_courier_slug,
        selected_service_code: isPickupOrder ? null : requestData.selected_service_code,
        selected_courier_name: isPickupOrder ? null : requestData.selected_courier_name,
        selected_service_name: isPickupOrder ? null : requestData.selected_service_name,
        selected_shipping_cost: shippingFeeCents,
        buyer_protection_fee: buyerProtectionFee,
      },
      p_payment_reference: requestData.payment_reference,
      p_paystack_reference: requestData.payment_reference,
      p_selected_courier_slug: isPickupOrder ? null : requestData.selected_courier_slug,
      p_selected_service_code: isPickupOrder ? null : requestData.selected_service_code,
      p_selected_courier_name: isPickupOrder ? null : requestData.selected_courier_name,
      p_selected_service_name: isPickupOrder ? null : requestData.selected_service_name,
      p_selected_shipping_cost: shippingFeeCents,
      p_status: "pending_payment",
      p_payment_status: "pending",
      p_amount: totalAmountCents,
      p_total_amount: totalAmount,
      p_items: [{
        item_id: book.id,
        book_id: book.id,
        item_type: resolvedItemType,
        title: book.title,
        name: book.name || book.title,
        author: book.author,
        price: book.price,
        condition: book.condition,
        image_url: book.image_url || book.front_cover || null,
        front_cover: book.front_cover || book.image_url || null,
      }],
      p_order_type: isPickupOrder ? "pickup" : "delivery",
      p_use_wallet: requestData.use_wallet || false,
      p_platform_fee: buyerProtectionFee,
      p_max_wallet_deduction: requestData.max_wallet_deduction || null,
    });

    if (dbError || !dbResult || !dbResult.success) {
      console.error("❌ Failed to create order via RPC:", dbError || dbResult?.error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create order: " + (dbError?.message || dbResult?.error || "Unknown database error") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Order ${dbResult.type === 'intent' ? 'intent' : 'record'} created successfully.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: dbResult.payment_status === 'paid' ? "Order fully paid via wallet" : "Order intent created successfully - awaiting payment",
        order: {
          id: dbResult.type === 'intent' ? dbResult.intent_id : dbResult.id,
          order_id: dbResult.order_id,
          type: dbResult.type,
          intent_id: dbResult.intent_id,
          status: dbResult.status,
          payment_status: dbResult.payment_status,
          total_amount: totalAmount,
          wallet_deducted_total: dbResult.wallet_deducted_total,
          buyer_email: buyerEmail,
          seller_email: sellerEmail,
          pickup_type: pickupType,
          delivery_type: deliveryType
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});



