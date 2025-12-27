import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venue, city, country, query } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      throw new Error('Google Places API key not configured');
    }

    // Build search query from context
    const searchParts = [];
    if (query) searchParts.push(query);
    if (venue) searchParts.push(venue);
    if (city) searchParts.push(city);
    if (country) searchParts.push(country);
    
    const searchQuery = searchParts.join(', ');
    console.log('Searching for:', searchQuery);

    if (!searchQuery.trim()) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Places Autocomplete API
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', searchQuery);
    autocompleteUrl.searchParams.set('key', apiKey);
    autocompleteUrl.searchParams.set('language', 'es');

    const countryCode = country ? getCountryCode(country) : '';
    if (countryCode) {
      // Restrict to a country when we can resolve it
      autocompleteUrl.searchParams.set('components', `country:${countryCode}`);
      autocompleteUrl.searchParams.set('region', countryCode);
    }

    const response = await fetch(autocompleteUrl.toString());
    const data = await response.json();

    console.log('Google Places API response status:', data.status);

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      const predictions = data.predictions?.map((p: any) => ({
        description: p.description,
        placeId: p.place_id,
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text,
      })) || [];

      return new Response(
        JSON.stringify({ predictions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(data.error_message || `API error: ${data.status}`);
    }

  } catch (error) {
    console.error('Error in google-places-autocomplete:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to get country code
function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    'españa': 'es',
    'spain': 'es',
    'es': 'es',
    'francia': 'fr',
    'france': 'fr',
    'fr': 'fr',
    'alemania': 'de',
    'germany': 'de',
    'de': 'de',
    'italia': 'it',
    'italy': 'it',
    'it': 'it',
    'portugal': 'pt',
    'pt': 'pt',
    'reino unido': 'gb',
    'united kingdom': 'gb',
    'uk': 'gb',
    'gb': 'gb',
    'estados unidos': 'us',
    'united states': 'us',
    'usa': 'us',
    'us': 'us',
    'méxico': 'mx',
    'mexico': 'mx',
    'mx': 'mx',
    'argentina': 'ar',
    'ar': 'ar',
    'chile': 'cl',
    'cl': 'cl',
    'colombia': 'co',
    'co': 'co',
  };
  
  return countryMap[country.toLowerCase()] || '';
}
