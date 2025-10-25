import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

interface CSVEvent {
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { csvContent } = await req.json();

    if (!csvContent) {
      throw new Error('No CSV content provided');
    }

    // Parse CSV
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    const events: CSVEvent[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 5) {
        events.push({
          title: values[0],
          start: values[1],
          end: values[2],
          location: values[3],
          description: values.slice(4).join(','), // Join remaining in case description has commas
        });
      }
    }

    console.log(`Parsed ${events.length} events from CSV`);

    // Get or create workspace
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    let workspaceId = profile?.workspace_id;

    if (!workspaceId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .insert({ name: 'Demo Workspace', created_by: user.id })
        .select()
        .single();
      workspaceId = workspace?.id;
    }

    // Get or create artists based on event titles
    const artistNames = ['Rita Payés', 'Pol Batlle', 'Eudald Payés'];
    const artists: any[] = [];

    for (const artistName of artistNames) {
      const { data: existing } = await supabase
        .from('artists')
        .select('id, name')
        .eq('name', artistName)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (existing) {
        artists.push(existing);
      } else {
        const { data: newArtist } = await supabase
          .from('artists')
          .insert({
            name: artistName,
            stage_name: artistName,
            workspace_id: workspaceId,
            created_by: user.id
          })
          .select()
          .single();
        if (newArtist) artists.push(newArtist);
      }
    }

    // Map artist names to IDs
    const artistMap = new Map(artists.map(a => [a.name, a.id]));
    const defaultArtist = artists[0]; // Fallback to first artist

    // Convert CSV events to database events
    const dbEvents = events.map(event => {
      // Determine artist from title
      let artistId = defaultArtist.id;
      for (const [name, id] of artistMap.entries()) {
        if (event.title.toLowerCase().includes(name.toLowerCase())) {
          artistId = id;
          break;
        }
      }

      // Determine event type based on title
      let eventType = 'meeting';
      const title = event.title.toLowerCase();
      if (title.includes('ensayo') || title.includes('rehearsal')) {
        eventType = 'meeting';
      } else if (title.includes('estudio') || title.includes('recording') || title.includes('mastering')) {
        eventType = 'recording';
      } else if (title.includes('deadline') || title.includes('entrega') || title.includes('cierre')) {
        eventType = 'deadline';
      }

      // Parse dates (format: "2025-11-09 12:00")
      const startDate = new Date(event.start.replace(' ', 'T') + ':00Z');
      const endDate = new Date(event.end.replace(' ', 'T') + ':00Z');

      return {
        title: event.title,
        event_type: eventType,
        artist_id: artistId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: event.location,
        description: event.description,
        created_by: user.id
      };
    });

    console.log('Inserting events:', dbEvents.length);

    // Insert events
    const { data: insertedEvents, error: eventsError } = await supabase
      .from('events')
      .insert(dbEvents)
      .select();

    if (eventsError) {
      console.error('Error inserting events:', eventsError);
      throw eventsError;
    }

    console.log('Events inserted successfully:', insertedEvents?.length);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Imported ${insertedEvents?.length} events from CSV`,
        eventCount: insertedEvents?.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
