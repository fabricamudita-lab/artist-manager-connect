import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { icalUrl } = await req.json();
    
    if (!icalUrl) {
      throw new Error('iCal URL is required');
    }

    console.log('Fetching iCal from:', icalUrl);

    // Fetch the iCal data from Google Calendar
    const response = await fetch(icalUrl);
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch calendar. Status:', response.status, 'Error:', errorText);
      throw new Error(`Failed to fetch calendar: ${response.statusText}. Asegúrate de usar la URL privada del calendario.`);
    }

    const icalData = await response.text();
    
    console.log('Successfully fetched iCal data, length:', icalData.length);

    return new Response(
      JSON.stringify({ icalData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-google-calendar:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
