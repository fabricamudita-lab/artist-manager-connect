import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  ALL_MODULES,
  EMPTY_PERMISSIONS,
  type EffectivePermissions,
  type ModuleKey,
  type PermissionLevel,
  type RolePermissionRow,
  meetsLevel,
} from './types';
import { getIndustryDefaults } from './catalog';

// ───────────────────────────────────────────────────────────────────────────
// Validación estricta (Zod) — previene XSS / inyecciones / payloads malformados
// ───────────────────────────────────────────────────────────────────────────

const moduleEnum = z.enum(ALL_MODULES as [ModuleKey, ...ModuleKey[]]);
const levelEnum = z.enum(['none', 'view', 'edit', 'manage'] as [
  PermissionLevel,
  ...PermissionLevel[],
]);

export const overrideWriteSchema = z.object({
  workspace_id: z.string().uuid(),
  role_name: z.string().trim().min(1, 'El nombre del rol es obligatorio').max(100),
  module: moduleEnum,
  level: levelEnum,
});

export type OverrideWriteInput = z.infer<typeof overrideWriteSchema>;

// ───────────────────────────────────────────────────────────────────────────
// Cache simple en memoria (60s) por (userId, workspaceId)
// ───────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  expiresAt: number;
  perms: EffectivePermissions;
  roleName: string | null;
}
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

const cacheKey = (userId: string, workspaceId: string) => `${userId}::${workspaceId}`;

export function invalidatePermissionsCache(userIdOrWorkspaceId?: string): void {
  if (!userIdOrWorkspaceId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.includes(userIdOrWorkspaceId)) cache.delete(k);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Lectura de permisos efectivos (override > default > none)
// Bypass para OWNER/TEAM_MANAGER del workspace.
// ───────────────────────────────────────────────────────────────────────────

interface ResolveOptions {
  bypassCache?: boolean;
}

export async function getEffectivePermissions(
  userId: string,
  workspaceId: string,
  opts: ResolveOptions = {},
): Promise<EffectivePermissions> {
  if (!userId || !workspaceId) return { ...EMPTY_PERMISSIONS };

  const key = cacheKey(userId, workspaceId);
  if (!opts.bypassCache) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.perms;
  }

  // 1) Workspace role bypass
  const { data: ws } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (ws?.role === 'OWNER' || ws?.role === 'TEAM_MANAGER') {
    const perms = ALL_MODULES.reduce(
      (acc, m) => ({ ...acc, [m]: 'manage' as PermissionLevel }),
      {} as EffectivePermissions,
    );
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, perms, roleName: null });
    return perms;
  }

  // 2) Resolver rol funcional vía RPC autoritativa (bypassa RLS).
  // Esto mantiene el sidebar y HubGate sincronizados; si leyésemos
  // contacts directamente, RLS podría ocultarnos la fila espejo del
  // propio usuario y devolveríamos permisos vacíos por error.
  const { data: roleData } = await supabase.rpc('get_user_functional_role', {
    _user_id: userId,
    _workspace_id: workspaceId,
  });

  const roleName = (typeof roleData === 'string' ? roleData.trim() : null) || null;
  if (!roleName) {
    const perms = { ...EMPTY_PERMISSIONS };
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, perms, roleName: null });
    return perms;
  }

  // 3) Defaults + overrides en paralelo, con paginación defensiva
  const [defaultsRes, overridesRes] = await Promise.all([
    supabase
      .from('functional_role_default_permissions')
      .select('module, level')
      .eq('role_name', roleName)
      .range(0, 999),
    supabase
      .from('functional_role_permission_overrides')
      .select('module, level')
      .eq('workspace_id', workspaceId)
      .eq('role_name', roleName)
      .range(0, 999),
  ]);

  // Empezamos de los defaults industry-standard del catálogo TS
  // (sirve como fallback si la BD aún no tiene una fila para algún módulo)
  const perms: EffectivePermissions = { ...getIndustryDefaults(roleName) };

  for (const row of defaultsRes.data ?? []) {
    perms[row.module as ModuleKey] = row.level as PermissionLevel;
  }
  for (const row of overridesRes.data ?? []) {
    perms[row.module as ModuleKey] = row.level as PermissionLevel;
  }

  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, perms, roleName });
  return perms;
}

/**
 * Devuelve el nombre del rol funcional activo del usuario en el workspace.
 * Reutiliza el cache de `getEffectivePermissions` y, si está frío, lo carga.
 * Devuelve `null` si el usuario es OWNER/TEAM_MANAGER (no aplica) o no tiene
 * un contacto-espejo con rol asignado.
 */
export async function getActiveFunctionalRole(
  userId: string,
  workspaceId: string,
): Promise<string | null> {
  if (!userId || !workspaceId) return null;
  const key = cacheKey(userId, workspaceId);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.roleName;
  await getEffectivePermissions(userId, workspaceId);
  return cache.get(key)?.roleName ?? null;
}

export function hasPermission(
  perms: EffectivePermissions,
  module: ModuleKey,
  required: PermissionLevel,
): boolean {
  return meetsLevel(perms[module] ?? 'none', required);
}

// ───────────────────────────────────────────────────────────────────────────
// Lectura paginada de la matriz completa para la UI de configuración
// ───────────────────────────────────────────────────────────────────────────

export interface MatrixRow extends RolePermissionRow {
  source: 'default' | 'override';
}

export interface PermissionsMatrix {
  defaults: RolePermissionRow[];
  overrides: RolePermissionRow[];
}

export async function loadPermissionsMatrix(
  workspaceId: string,
  pageSize = 500,
): Promise<PermissionsMatrix> {
  z.string().uuid().parse(workspaceId);

  // Paginación defensiva (catálogo cabe en 1 página, pero protegemos)
  const fetchPage = async <T,>(
    table: 'functional_role_default_permissions' | 'functional_role_permission_overrides',
    filter?: (q: any) => any,
  ): Promise<T[]> => {
    const all: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      let q = supabase.from(table).select('role_name, module, level').range(from, to);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw error;
      all.push(...((data as T[]) ?? []));
      if (!data || data.length < pageSize) break;
    }
    return all;
  };

  const [defaults, overrides] = await Promise.all([
    fetchPage<RolePermissionRow>('functional_role_default_permissions'),
    fetchPage<RolePermissionRow>('functional_role_permission_overrides', (q) =>
      q.eq('workspace_id', workspaceId),
    ),
  ]);

  return { defaults, overrides };
}

// ───────────────────────────────────────────────────────────────────────────
// Escritura de overrides (con validación)
// ───────────────────────────────────────────────────────────────────────────

export async function upsertOverride(input: OverrideWriteInput): Promise<void> {
  const parsed = overrideWriteSchema.parse(input);
  const { error } = await supabase.from('functional_role_permission_overrides').upsert(
    {
      workspace_id: parsed.workspace_id,
      role_name: parsed.role_name,
      module: parsed.module,
      level: parsed.level,
      updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    },
    { onConflict: 'workspace_id,role_name,module' },
  );
  if (error) throw error;
  invalidatePermissionsCache(parsed.workspace_id);
}

export async function resetRoleOverrides(workspaceId: string, roleName: string): Promise<void> {
  z.string().uuid().parse(workspaceId);
  z.string().trim().min(1).max(100).parse(roleName);
  const { error } = await supabase
    .from('functional_role_permission_overrides')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('role_name', roleName);
  if (error) throw error;
  invalidatePermissionsCache(workspaceId);
}

// Util: dado defaults+overrides, computar perms efectivos para un rol concreto
export function computeRolePerms(
  matrix: PermissionsMatrix,
  roleName: string,
): EffectivePermissions {
  const out: EffectivePermissions = { ...getIndustryDefaults(roleName) };
  for (const r of matrix.defaults) {
    if (r.role_name === roleName) out[r.module as ModuleKey] = r.level as PermissionLevel;
  }
  for (const r of matrix.overrides) {
    if (r.role_name === roleName) out[r.module as ModuleKey] = r.level as PermissionLevel;
  }
  return out;
}
