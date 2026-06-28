import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAPBOX_GEOCODE_BASE = 'https://api.mapbox.com/search/geocode/v6';

/**
 * Build a formatted address description from Mapbox v6 feature properties.
 */
function buildDescription(props: any): string {
  const parts: string[] = [];

  if (props.name) parts.push(props.name);

  const ctx = props.context || {};
  if (ctx.neighborhood?.name) parts.push(ctx.neighborhood.name);
  if (ctx.locality?.name) parts.push(ctx.locality.name);
  if (ctx.place?.name) parts.push(ctx.place.name);
  if (ctx.region?.name) parts.push(ctx.region.name);
  if (ctx.postcode?.name) parts.push(ctx.postcode.name);
  if (ctx.country?.name) parts.push(ctx.country.name);

  return parts.join(', ') || props.full_address || props.name || '';
}

/**
 * Parse a Mapbox v6 feature into the AddressDetails shape the frontend expects.
 */
function parseFeatureToAddressDetails(feature: any) {
  const props = feature.properties || {};
  const ctx = props.context || {};
  const coords = feature.geometry?.coordinates || [0, 0];

  const streetNumber = props.address_number || '';
  const route = props.street || '';
  const streetAddress = `${streetNumber} ${route}`.trim() || props.name || '';
  const city = ctx.place?.name || ctx.locality?.name || '';
  const province = ctx.region?.name || '';
  const postalCode = ctx.postcode?.name || '';
  const country = ctx.country?.name || 'South Africa';
  const suburb = ctx.neighborhood?.name || ctx.locality?.name || '';

  return {
    formatted_address: props.full_address || buildDescription(props),
    lat: coords[1],
    lng: coords[0],
    street_number: streetNumber,
    route: route,
    street_address: streetAddress,
    city,
    province,
    postal_code: postalCode,
    country,
    suburb,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('[Mapbox Autocomplete] MAPBOX_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Mapbox access token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let input = '';
    let mode = 'suggest'; // 'suggest' or 'details'
    let featureId = '';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      input = body.input || '';
      mode = body.mode || 'suggest';
      featureId = body.feature_id || '';
    } else {
      const url = new URL(req.url);
      input = url.searchParams.get('input') || '';
      mode = url.searchParams.get('mode') || 'suggest';
      featureId = url.searchParams.get('feature_id') || '';
    }

    // ── Mode: details ──────────────────────────────────────────────
    // Retrieve full address details for a specific Mapbox feature ID.
    if (mode === 'details' && featureId) {
      console.log(`[Mapbox Autocomplete] Fetching details for feature: ${featureId}`);

      // Mapbox v6 retrieve endpoint
      const retrieveUrl = `${MAPBOX_GEOCODE_BASE}/retrieve/${encodeURIComponent(featureId)}?access_token=${accessToken}&permanent=false`;
      const resp = await fetch(retrieveUrl);

      if (!resp.ok) {
        console.warn(`[Mapbox Autocomplete] Retrieve failed with status ${resp.status}`);
        return new Response(
          JSON.stringify({ error: `Mapbox retrieve failed: ${resp.status}` }),
          { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await resp.json();
      const feature = data.features?.[0];

      if (!feature) {
        return new Response(
          JSON.stringify({ error: 'Feature not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const details = parseFeatureToAddressDetails(feature);

      return new Response(
        JSON.stringify({ success: true, details }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Mode: suggest (default) ────────────────────────────────────
    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Missing input parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Mapbox Autocomplete] Searching for: "${input}"`);

    const params = new URLSearchParams({
      q: input,
      access_token: accessToken,
      autocomplete: 'true',
      permanent: 'false',
      country: 'ZA',
      language: 'en',
      limit: '5',
      types: 'address,street,place,neighborhood,locality',
    });

    const forwardUrl = `${MAPBOX_GEOCODE_BASE}/forward?${params.toString()}`;
    const resp = await fetch(forwardUrl);

    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[Mapbox Autocomplete] Forward geocode failed: ${resp.status}`, errText);
      return new Response(
        JSON.stringify({ error: `Mapbox API error: ${resp.status}` }),
        { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    const features = data.features || [];

    console.log(`[Mapbox Autocomplete] Found ${features.length} results`);

    // Transform into the Suggestion format the frontend expects
    const suggestions = features.map((feature: any) => ({
      description: buildDescription(feature.properties),
      place_id: `mapbox:${feature.properties?.mapbox_id || feature.id}`,
    }));

    // Also cache the full feature data so we can parse details later
    const featureCache: Record<string, any> = {};
    for (const feature of features) {
      const id = `mapbox:${feature.properties?.mapbox_id || feature.id}`;
      featureCache[id] = parseFeatureToAddressDetails(feature);
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_mapbox: true,
        suggestions,
        feature_cache: featureCache,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Mapbox Autocomplete] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
