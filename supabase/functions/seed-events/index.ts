import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

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

    // Create artists
    const artistNames = [
      { name: 'Rita Payés', stage_name: 'Rita Payés' },
      { name: 'Pol Batlle', stage_name: 'Pol Batlle' },
      { name: 'Eudald Payés', stage_name: 'Eudald Payés' }
    ];

    const artists = [];
    for (const artist of artistNames) {
      const { data: existing } = await supabase
        .from('artists')
        .select('id, name')
        .eq('name', artist.name)
        .eq('workspace_id', workspaceId)
        .single();

      if (existing) {
        artists.push(existing);
      } else {
        const { data: newArtist } = await supabase
          .from('artists')
          .insert({
            name: artist.name,
            stage_name: artist.stage_name,
            workspace_id: workspaceId,
            created_by: user.id
          })
          .select()
          .single();
        artists.push(newArtist);
      }
    }

    // Event types and templates
    const eventTemplates = [
      { type: 'recording', title: 'Grabación de disco', duration: 3 },
      { type: 'studio', title: 'Sesión de estudio', duration: 1 },
      { type: 'concert', title: 'Concierto', duration: 1 },
      { type: 'rehearsal', title: 'Ensayo', duration: 1 },
      { type: 'interview', title: 'Entrevista', duration: 1 },
      { type: 'photoshoot', title: 'Sesión de fotos', duration: 1 },
      { type: 'meeting', title: 'Reunión', duration: 1 },
      { type: 'soundcheck', title: 'Prueba de sonido', duration: 1 },
      { type: 'radio', title: 'Programa de radio', duration: 1 },
      { type: 'video', title: 'Grabación de videoclip', duration: 2 }
    ];

    const cities = ['Barcelona', 'Madrid', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza', 'Girona', 'Tarragona'];
    const venues = ['Sala Apolo', 'Razzmatazz', 'Palau de la Música', 'Jamboree', 'Sidecar', 'Bikini', 'WiZink Center', 'Palau Sant Jordi'];

    // Generate 30 events over next 3 months
    const events = [];
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const artist = artists[Math.floor(Math.random() * artists.length)];
      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const venue = venues[Math.floor(Math.random() * venues.length)];
      
      // Random date in next 3 months
      const daysOffset = Math.floor(Math.random() * 90);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + daysOffset);
      startDate.setHours(Math.floor(Math.random() * 12) + 9); // 9 AM - 9 PM
      startDate.setMinutes([0, 15, 30, 45][Math.floor(Math.random() * 4)]);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (template.duration - 1));
      endDate.setHours(startDate.getHours() + (template.duration === 1 ? Math.floor(Math.random() * 4) + 2 : 8));

      const eventType = template.type === 'concert' ? 'concierto' :
                        template.type === 'recording' ? 'grabacion' :
                        template.type === 'studio' ? 'estudio' :
                        template.type === 'interview' ? 'entrevista' :
                        template.type === 'rehearsal' ? 'ensayo' :
                        template.type === 'meeting' ? 'reunion' : 'otro';

      events.push({
        title: `${template.title} - ${artist.name}`,
        event_type: eventType,
        artist_id: artist.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: template.type === 'concert' ? `${venue}, ${city}` : city,
        description: `${template.title} con ${artist.name}`,
        created_by: user.id
      });
    }

    // Add specific events mentioned
    const nov8 = new Date(now.getFullYear(), now.getMonth() + (now.getMonth() <= 10 ? 0 : 1), 8, 9, 0);
    if (nov8 > now) {
      const ritaPayes = artists.find(a => a.name === 'Rita Payés');
      events.push({
        title: 'Grabación de disco - Rita Payés',
        event_type: 'grabacion',
        artist_id: ritaPayes.id,
        start_date: new Date(nov8).toISOString(),
        end_date: new Date(nov8.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Estudios Blanch, Barcelona',
        description: 'Grabación de nuevo disco con Rita Payés',
        created_by: user.id
      });
    }

    // Insert events
    const { data: insertedEvents, error: eventsError } = await supabase
      .from('events')
      .insert(events)
      .select();

    if (eventsError) throw eventsError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${insertedEvents.length} events for ${artists.length} artists`,
        artists: artists.map(a => a.name),
        eventCount: insertedEvents.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
