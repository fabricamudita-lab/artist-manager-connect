import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_PERMISSIONS,
  type EffectivePermissions,
  type ModuleKey,
  type PermissionLevel,
} from '@/lib/permissions/types';
import {
  getActiveFunctionalRole,
  getEffectivePermissions,
  hasPermission,
  invalidatePermissionsCache,
} from '@/lib/permissions/service';

interface State {
  loading: boolean;
  perms: EffectivePermissions;
  workspaceId: string | null;
  isWorkspaceAdmin: boolean;
  roleName: string | null;
}

/**
 * Hook React que devuelve los permisos efectivos del usuario actual en su workspace activo.
 * Se suscribe a cambios en la tabla de overrides para refrescar en tiempo real.
 */
export function useFunctionalPermissions(): State {
  const { user } = useAuth();
  const [state, setState] = useState<State>({
    loading: true,
    perms: { ...EMPTY_PERMISSIONS },
    workspaceId: null,
    isWorkspaceAdmin: false,
    roleName: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.id) {
        if (!cancelled) {
          setState({
            loading: false,
            perms: { ...EMPTY_PERMISSIONS },
            workspaceId: null,
            isWorkspaceAdmin: false,
            roleName: null,
          });
        }
        return;
      }

      // Resolver workspace activo (primer membership)
      const { data: ws } = await supabase
        .from('workspace_memberships')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const workspaceId = ws?.workspace_id ?? null;
      const isWorkspaceAdmin = ws?.role === 'OWNER' || ws?.role === 'TEAM_MANAGER';

      if (!workspaceId) {
        if (!cancelled) {
          setState({
            loading: false,
            perms: { ...EMPTY_PERMISSIONS },
            workspaceId: null,
            isWorkspaceAdmin: false,
            roleName: null,
          });
        }
        return;
      }

      const [perms, roleName] = await Promise.all([
        getEffectivePermissions(user.id, workspaceId),
        getActiveFunctionalRole(user.id, workspaceId),
      ]);
      if (!cancelled) {
        setState({ loading: false, perms, workspaceId, isWorkspaceAdmin, roleName });
      }
    }

    setState((s) => ({ ...s, loading: true }));
    load();

    // Realtime: invalidar y recargar cuando cambien overrides, contactos
    // espejo o asignaciones de artistas (cambian el rol funcional efectivo
    // o el conjunto de artistas accesibles).
    const channel = supabase
      .channel('functional-perms-' + (user?.id ?? 'anon'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'functional_role_permission_overrides' },
        () => {
          invalidatePermissionsCache();
          load();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => {
          invalidatePermissionsCache();
          load();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'artist_role_bindings' },
        () => {
          invalidatePermissionsCache();
          load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return state;
}

/**
 * Helper hook: devuelve `(module, level) => boolean`.
 */
export function useCan() {
  const { perms, loading, roleName } = useFunctionalPermissions();
  return {
    loading,
    perms,
    roleName,
    can: (module: ModuleKey, required: PermissionLevel) => hasPermission(perms, module, required),
  };
}
