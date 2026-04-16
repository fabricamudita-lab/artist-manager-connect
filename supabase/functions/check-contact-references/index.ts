import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables that BLOCK deletion (SET NULL / NO ACTION → would lose data integrity)
const BLOCKING_REFS: Array<{ key: string; table: string; column: string; nameField?: string }> = [
  { key: 'budget_items', table: 'budget_items', column: 'contact_id', nameField: 'name' },
  { key: 'solicitudes', table: 'solicitudes', column: 'contact_id', nameField: 'nombre_solicitante' },
  { key: 'solicitudes_promotor', table: 'solicitudes', column: 'promotor_contact_id', nameField: 'nombre_solicitante' },
  { key: 'royalty_splits', table: 'royalty_splits', column: 'contact_id' },
  { key: 'song_splits', table: 'song_splits', column: 'collaborator_contact_id' },
  { key: 'track_credits', table: 'track_credits', column: 'contact_id', nameField: 'name' },
  { key: 'release_assets', table: 'release_assets', column: 'supplier_contact_id', nameField: 'name' },
  { key: 'transactions', table: 'transactions', column: 'contact_id', nameField: 'description' },
  { key: 'default_royalty_splits', table: 'default_royalty_splits', column: 'contact_id' },
  { key: 'booking_availability_responses', table: 'booking_availability_responses', column: 'contact_id' },
  { key: 'sync_offers', table: 'sync_offers', column: 'contact_id' },
  { key: 'sync_offers_requester', table: 'sync_offers', column: 'requester_contact_id' },
  { key: 'sync_splits', table: 'sync_splits', column: 'contact_id' },
  { key: 'track_publishing_splits', table: 'track_publishing_splits', column: 'contact_id' },
  { key: 'track_master_splits', table: 'track_master_splits', column: 'contact_id' },
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const contact_id = body?.contact_id;
    if (!contact_id || typeof contact_id !== 'string') {
      return new Response(JSON.stringify({ error: 'contact_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for the integrity check (read-only) so we don't miss
    // references the user can't see via RLS but that would still block deletion.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const breakdown: Record<string, number> = {};
    const examples: Array<{ type: string; id: string; name?: string }> = [];
    let total = 0;

    for (const ref of BLOCKING_REFS) {
      const { count, error } = await admin
        .from(ref.table)
        .select('id', { count: 'exact', head: true })
        .eq(ref.column, contact_id);

      if (error) {
        console.error(`Error counting ${ref.table}.${ref.column}:`, error.message);
        continue;
      }

      const c = count ?? 0;
      breakdown[ref.key] = c;
      total += c;

      if (c > 0 && examples.length < 8) {
        const selectCols = ref.nameField ? `id, ${ref.nameField}` : 'id';
        const { data: sample } = await admin
          .from(ref.table)
          .select(selectCols)
          .eq(ref.column, contact_id)
          .limit(2);
        sample?.forEach((row: any) => {
          examples.push({ type: ref.key, id: row.id, name: ref.nameField ? row[ref.nameField] : undefined });
        });
      }
    }

    return new Response(JSON.stringify({ total, breakdown, examples }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('check-contact-references error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
