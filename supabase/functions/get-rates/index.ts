import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getShippingConfig } from "../_shared/shipping-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};


interface AddressInput {
  type?: string;
  company?: string;
  street_address: string;
  local_area?: string;
  city: string;
  zone?: string;
  country?: string;
  code: string;
  lat?: number;
  lng?: number;
}

interface ParcelInput {
  submitted_length_cm: number;
  submitted_width_cm: number;
  submitted_height_cm: number;
  submitted_weight_kg: number;
  parcel_description?: string;
  packaging?: string;
}

interface RatesRequest {
  collection_address?: AddressInput;
  collection_pickup_point_id?: string;
  delivery_address?: AddressInput;
  delivery_pickup_point_id?: string;
  parcels: ParcelInput[];
  declared_value?: number;
  collection_min_date?: string;
  delivery_min_date?: string;
}

async function fetchRatesFromTCG(
  apiKey: string,
  body: Record<string, any>
): Promise<{ provider: string; rates: any; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    console.log("Fetching rates from The Courier Guy...");
    console.log("Payload sent to TCG:", JSON.stringify(body));

    const response = await fetch(`${apiUrl}/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TCG rates error [${response.status}]: ${errorText}`);
      return {
        provider: "The Courier Guy",
        rates: null,
        error: `TCG rates error [${response.status}]: ${errorText}`,
      };
    }

    const data = await response.json();
    console.log("TCG rates fetched successfully:", JSON.stringify(data).substring(0, 200));
    return { provider: "The Courier Guy", rates: data };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("TCG rates fetch failed:", err);
    return {
      provider: "The Courier Guy",
      rates: null,
      error: err instanceof Error ? (err.name === 'AbortError' ? 'TCG API timeout' : err.message) : "Unknown error",
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RatesRequest = await req.json();

    console.log("=== INCOMING REQUEST BODY ===", JSON.stringify(body));

    if (!body.parcels || body.parcels.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: parcels" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.collection_address && !body.collection_pickup_point_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Either collection_address or collection_pickup_point_id is required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.delivery_address && !body.delivery_pickup_point_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Either delivery_address or delivery_pickup_point_id is required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.collection_address) {
      const addr = body.collection_address;
      if (!addr.street_address || !addr.city || !addr.code) {
        const missingFields = [
          !addr.street_address && "street_address",
          !addr.city && "city",
          !addr.code && "code",
        ].filter(Boolean);
        return new Response(
          JSON.stringify({
            success: false,
            error: "collection_address is incomplete",
            missing_fields: missingFields,
            details: "street_address, city, and code are required."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (body.delivery_address) {
      const addr = body.delivery_address;
      if (!addr.street_address || !addr.city || !addr.code) {
        const missingFields = [
          !addr.street_address && "street_address",
          !addr.city && "city",
          !addr.code && "code",
        ].filter(Boolean);
        return new Response(
          JSON.stringify({
            success: false,
            error: "delivery_address is incomplete",
            missing_fields: missingFields,
            details: "street_address, city, and code are required."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { apiUrl, apiKey, providerName } = getShippingConfig();

    if (!apiUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "TCG_BASE_URL/ShipLogic is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey || apiKey.length < 5) {
      return new Response(
        JSON.stringify({ success: false, error: "TCG_API_KEY/ShipLogic is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const providerBody: Record<string, any> = {
      parcels: body.parcels,
      collection_min_date: body.collection_min_date || today,
      delivery_min_date: body.delivery_min_date || today,
    };

    if (body.declared_value !== undefined) {
      providerBody.declared_value = body.declared_value;
    }

    if (body.collection_pickup_point_id) {
      providerBody.collection_pickup_point_id = String(body.collection_pickup_point_id);
      providerBody.collection_pickup_point_provider = "tcg-locker";
    } else {
      providerBody.collection_address = {
        ...body.collection_address,
        country: body.collection_address!.country || "ZA",
      };
    }

    if (body.delivery_pickup_point_id) {
      providerBody.delivery_pickup_point_id = String(body.delivery_pickup_point_id);
      providerBody.delivery_pickup_point_provider = "tcg-locker";
    } else {
      providerBody.delivery_address = {
        ...body.delivery_address,
        country: body.delivery_address!.country || "ZA",
      };
    }

    console.log("=== PROVIDER PAYLOAD ===", JSON.stringify(providerBody));

    const result = await fetchRatesFromTCG(TCG_API_KEY, providerBody);

    const allRates: any[] = [];
    const errors: string[] = [];

    if (result.rates) {
      const ratesArray = Array.isArray(result.rates) ? result.rates : [result.rates];
      for (const rate of ratesArray) {
        allRates.push({ ...rate, provider: result.provider });
      }
    }

    if (result.error) {
      errors.push(result.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        rates: allRates,
        providers_queried: ["The Courier Guy"],
        mode: "production",
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error getting shipping rates:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
