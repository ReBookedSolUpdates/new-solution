import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchNominatimSuggestions(input: string) {
  const query = encodeURIComponent(input.trim());
  const params = `q=${query}&format=json&addressdetails=1&limit=10&countrycodes=za`;
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params}`;

  console.log(`[Nominatim Fallback] Fetching: ${nominatimUrl}`);
  const response = await fetch(nominatimUrl, {
    headers: {
      'User-Agent': 'ReBookedSolutions/1.0',
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim fetch failed with status: ${response.status}`);
  }

  const data = await response.json();
  
  return new Response(
    JSON.stringify({ success: true, is_nominatim: true, results: data }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let input = '';
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      input = body.input || '';
    } else {
      const url = new URL(req.url);
      input = url.searchParams.get('input') || '';
    }

    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Missing input parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.log('GOOGLE_MAPS_API_KEY not configured, falling back to Nominatim');
      return await fetchNominatimSuggestions(input);
    }

    // Call Google Places Autocomplete API
    const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:za`;
    
    console.log('Calling Google Places Autocomplete API');
    const response = await fetch(placesUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('Google API returned status:', data.status, 'details:', data.error_message);
      // Fallback to Nominatim if Google Places returns an error (like REQUEST_DENIED due to billing)
      console.log('Falling back to Nominatim due to Google API error');
      return await fetchNominatimSuggestions(input);
    }

    // Transform the response to our format
    const suggestions = (data.predictions || []).map((prediction: any) => ({
      description: prediction.description,
      place_id: prediction.place_id,
    }));

    console.log(`Found ${suggestions.length} suggestions via Google Places`);

    return new Response(
      JSON.stringify({ suggestions }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in autocomplete function:', error);
    try {
      // Last resort fallback
      if (req.method === 'POST' || req.method === 'GET') {
        let input = '';
        if (req.method === 'POST') {
          const body = await req.json().catch(() => ({}));
          input = body.input || '';
        } else {
          const url = new URL(req.url);
          input = url.searchParams.get('input') || '';
        }
        if (input) {
          return await fetchNominatimSuggestions(input);
        }
      }
    } catch (fallbackErr) {
      console.error('Error in autocomplete Nominatim fallback:', fallbackErr);
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
