import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, calendarId = 'primary', event, eventId } = await req.json();

    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;
    
    let apiUrl: string;
    let method: string;
    let body: any = null;

    switch (action) {
      case 'listEvents':
        const { timeMin, timeMax } = await req.json();
        apiUrl = `${baseUrl}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
        method = 'GET';
        break;

      case 'createEvent':
        apiUrl = `${baseUrl}/events`;
        method = 'POST';
        body = event;
        break;

      case 'updateEvent':
        apiUrl = `${baseUrl}/events/${eventId}`;
        method = 'PATCH';
        body = event;
        break;

      case 'deleteEvent':
        apiUrl = `${baseUrl}/events/${eventId}`;
        method = 'DELETE';
        break;

      default:
        throw new Error('Invalid action');
    }

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(apiUrl, options);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Google Calendar API error:', error);
      throw new Error(`API error: ${response.status} ${error}`);
    }

    const data = method === 'DELETE' ? {} : await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Calendar API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
