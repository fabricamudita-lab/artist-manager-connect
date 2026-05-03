// supabase/functions/invite-team-member/index.ts
//
// Endurece la invitación a equipos:
// - Valida el body con Zod (email, scope, scopeId, role).
// - Comprueba que el invocante tiene permiso para invitar al recurso solicitado:
//     WORKSPACE -> miembro OWNER/TEAM_MANAGER del workspace
//     ARTIST    -> public.user_can_edit_artist
//     PROJECT   -> public.user_can_edit_project
// - Devuelve códigos HTTP claros (400/401/403/404/409/429/500).
// - El service_role_key NUNCA llega al cliente. Solo se usa internamente para crear
//   la fila en `invitations` o el binding adecuado.
// - Throttling básico in-memory (best-effort) por usuario invocante.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const WorkspaceRoleSchema = z.enum(['OWNER', 'TEAM_MANAGER']);
const ArtistRoleSchema = z.string().min(1).max(64);
const ProjectRoleSchema = z.enum(['EDITOR', 'COMMENTER', 'VIEWER']);

// Map functional role labels (e.g. "Artista", "Agente de Booking") to the
// artist_role_bindings enum used in DB.
function mapFunctionalToBindingRole(role: string): string {
  const k = role
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const M: Record<string, string> = {
    'manager personal': 'ARTIST_MANAGER',
    'manager': 'ARTIST_MANAGER',
    'artist manager': 'ARTIST_MANAGER',
    'management': 'ARTIST_MANAGER',
    'agente de booking': 'BOOKING_AGENT',
    'booking agent': 'BOOKING_AGENT',
    'booker': 'BOOKING_AGENT',
    'productor': 'PRODUCER',
    'producer': 'PRODUCER',
    'sello': 'LABEL',
    'label': 'LABEL',
    'editorial': 'PUBLISHER',
    'publisher': 'PUBLISHER',
    'a&r': 'AR',
    'ar': 'AR',
    'tecnico': 'ROADIE_TECH',
    'roadie': 'ROADIE_TECH',
    'artista': 'ARTIST_OBSERVER',
    'artist': 'ARTIST_OBSERVER',
    'observador': 'ARTIST_OBSERVER',
    'observer': 'ARTIST_OBSERVER',
  };
  // If already a valid enum, keep as-is
  const ENUMS = ['ARTIST_MANAGER','ARTIST_OBSERVER','BOOKING_AGENT','PRODUCER','LABEL','PUBLISHER','AR','ROADIE_TECH'];
  if (ENUMS.includes(role)) return role;
  return M[k] ?? 'ARTIST_OBSERVER';
}

const BodySchema = z
  .object({
    email: z.string().trim().toLowerCase().min(3).max(255).email(),
    scope: z.enum(['WORKSPACE', 'ARTIST', 'PROJECT']),
    scopeId: z.string().uuid(),
    role: z.string().min(1).max(64),
    teamCategory: z
      .enum(['management', 'banda', 'tecnico', 'artistico', 'comunicacion', 'legal', 'otro'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    const ok =
      (data.scope === 'WORKSPACE' && WorkspaceRoleSchema.safeParse(data.role).success) ||
      (data.scope === 'ARTIST' && ArtistRoleSchema.safeParse(data.role).success) ||
      (data.scope === 'PROJECT' && ProjectRoleSchema.safeParse(data.role).success);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role'],
        message: `Rol no compatible con el alcance ${data.scope}`,
      });
    }
  });

// In-memory rate limiter. Best-effort: per-instance only; not a hard guarantee.
const RATE: Map<string, { count: number; resetAt: number }> = new Map();
const MAX_PER_HOUR = 30;

function rateLimit(userId: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = RATE.get(userId);
  if (!entry || entry.resetAt < now) {
    RATE.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { ok: true };
  }
  if (entry.count >= MAX_PER_HOUR) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Auth: require a valid bearer token.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Unauthorized: missing bearer token' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Server misconfigured' });
  }

  // Caller-scoped client (RLS applies, validates the JWT).
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResp, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userResp?.user) return json(401, { error: 'Unauthorized' });
  const callerId = userResp.user.id;

  // Throttle.
  const rl = rateLimit(callerId);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Too many invitations' }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(rl.retryAfter ?? 60),
      },
    });
  }

  // Validate body.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { error: parsed.error.flatten() });
  }
  const { email, scope, scopeId, role, teamCategory } = parsed.data;

  // Service-role client (bypasses RLS) — only used after authz check passes.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Authorization check.
  let authorized = false;
  let workspaceForInvitation: string | null = null;

  if (scope === 'WORKSPACE') {
    const { data, error } = await admin
      .from('workspace_memberships')
      .select('role')
      .eq('workspace_id', scopeId)
      .eq('user_id', callerId)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    authorized = !!data && (data.role === 'OWNER' || data.role === 'TEAM_MANAGER');
    workspaceForInvitation = scopeId;
  } else if (scope === 'ARTIST') {
    const { data, error } = await admin.rpc('user_can_edit_artist', {
      _user_id: callerId,
      _artist_id: scopeId,
    });
    if (error) return json(500, { error: error.message });
    authorized = data === true;
    const { data: aRow } = await admin
      .from('artists')
      .select('workspace_id')
      .eq('id', scopeId)
      .maybeSingle();
    workspaceForInvitation = aRow?.workspace_id ?? null;
  } else {
    // PROJECT
    const { data, error } = await admin.rpc('user_can_edit_project', {
      _user_id: callerId,
      _project_id: scopeId,
    });
    if (error) return json(500, { error: error.message });
    authorized = data === true;
    const { data: pRow } = await admin
      .from('projects')
      .select('artist_id, artists:artists!inner(workspace_id)')
      .eq('id', scopeId)
      .maybeSingle();
    workspaceForInvitation = (pRow as any)?.artists?.workspace_id ?? null;
  }

  if (!authorized) {
    return json(403, { error: 'Sin permiso para invitar a este recurso' });
  }

  // Resolve invitee profile (existing user vs. pending invitation).
  const { data: invitee } = await admin
    .from('profiles')
    .select('id, user_id, full_name')
    .eq('email', email)
    .maybeSingle();

  const inviteeUserId: string | null = invitee?.user_id ?? null;

  try {
    if (scope === 'WORKSPACE') {
      if (!inviteeUserId) {
        // Create pending invitation row.
        const inviteToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: invErr } = await admin.from('invitations').insert({
          workspace_id: scopeId,
          email,
          role,
          invited_by: callerId,
          token: inviteToken,
          expires_at: expiresAt,
        });
        if (invErr) {
          if (invErr.code === '23505')
            return json(409, { error: 'Ya existe una invitación pendiente' });
          return json(500, { error: invErr.message });
        }
        return json(200, { ok: true, message: `Invitación enviada a ${email}` });
      }
      const { error: memErr } = await admin.from('workspace_memberships').insert({
        workspace_id: scopeId,
        user_id: inviteeUserId,
        role,
        team_category: teamCategory ?? 'otro',
      });
      if (memErr) {
        if (memErr.code === '23505')
          return json(409, { error: 'Este usuario ya es miembro del workspace' });
        return json(500, { error: memErr.message });
      }
      return json(200, { ok: true, message: `${invitee?.full_name ?? email} añadido al workspace` });
    }

    if (scope === 'ARTIST') {
      if (!inviteeUserId) {
        return json(409, {
          error:
            'Este usuario aún no tiene cuenta. Invítalo primero al workspace o pídele que se registre.',
        });
      }
      const { error: bindErr } = await admin
        .from('artist_role_bindings')
        .insert({ artist_id: scopeId, user_id: inviteeUserId, role });
      if (bindErr) {
        if (bindErr.code === '23505')
          return json(409, { error: 'Ya tiene un rol asignado en este artista' });
        return json(500, { error: bindErr.message });
      }
      return json(200, { ok: true, message: 'Rol de artista asignado' });
    }

    // PROJECT
    if (!inviteeUserId) {
      return json(409, {
        error:
          'Este usuario aún no tiene cuenta. Invítalo primero al workspace o pídele que se registre.',
      });
    }
    const { error: bindErr } = await admin
      .from('project_role_bindings')
      .insert({ project_id: scopeId, user_id: inviteeUserId, role });
    if (bindErr) {
      if (bindErr.code === '23505')
        return json(409, { error: 'Ya tiene un rol asignado en este proyecto' });
      return json(500, { error: bindErr.message });
    }
    return json(200, { ok: true, message: 'Rol de proyecto asignado' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error';
    return json(500, { error: msg });
  }
});
