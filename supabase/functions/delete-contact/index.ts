import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOCKING_REFS: Array<{ table: string; column: string }> = [
  { table: 'budget_items', column: 'contact_id' },
  { table: 'solicitudes', column: 'contact_id' },
  { table: 'solicitudes', column: 'promotor_contact_id' },
  { table: 'royalty_splits', column: 'contact_id' },
  { table: 'song_splits', column: 'collaborator_contact_id' },
  { table: 'track_credits', column: 'contact_id' },
  { table: 'release_assets', column: 'supplier_contact_id' },
  { table: 'transactions', column: 'contact_id' },
  { table: 'default_royalty_splits', column: 'contact_id' },
  { table: 'booking_availability_responses', column: 'contact_id' },
  { table: 'sync_offers', column: 'contact_id' },
  { table: 'sync_offers', column: 'requester_contact_id' },
  { table: 'sync_splits', column: 'contact_id' },
  { table: 'track_publishing_splits', column: 'contact_id' },
  { table: 'track_master_splits', column: 'contact_id' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const contact_id: string | undefined = body?.contact_id;
    const confirmation_text: string | undefined = body?.confirmation_text;

    if (!contact_id || !confirmation_text) {
      return new Response(JSON.stringify({ error: 'contact_id and confirmation_text required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user has access to this contact via RLS
    const { data: contact, error: fetchErr } = await userClient
      .from('contacts')
      .select('id, name')
      .eq('id', contact_id)
      .maybeSingle();

    if (fetchErr || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found or no permission' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Double verification: confirmation_text must exactly match contact name
    if (confirmation_text.trim() !== contact.name.trim()) {
      return new Response(JSON.stringify({ error: 'Confirmation text does not match contact name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side re-check of references (with service role to bypass RLS)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let total = 0;
    const breakdown: Record<string, number> = {};
    for (const ref of BLOCKING_REFS) {
      const { count } = await admin
        .from(ref.table)
        .select('id', { count: 'exact', head: true })
        .eq(ref.column, contact_id);
      const c = count ?? 0;
      if (c > 0) {
        breakdown[`${ref.table}.${ref.column}`] = c;
        total += c;
      }
    }

    if (total > 0) {
      return new Response(JSON.stringify({
        error: 'Contact has blocking references',
        total,
        breakdown,
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safe to delete (CASCADE handles tokens, group members, project_team, artist_assignments)
    const { error: delErr } = await admin
      .from('contacts')
      .delete()
      .eq('id', contact_id);

    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('delete-contact error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
