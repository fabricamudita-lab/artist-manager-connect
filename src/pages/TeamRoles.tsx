import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useFunctionalPermissions } from '@/hooks/useFunctionalPermissions';
import { RoleInfoTab } from '@/pages/teams/RoleInfoTab';
import { PermissionsByRoleTab } from '@/pages/teams/PermissionsByRoleTab';

/**
 * Página dedicada a roles funcionales del workspace.
 * - Pestaña "Información": vista de solo lectura, accesible a cualquier miembro.
 * - Pestaña "Editar permisos": matriz editable, solo para OWNER/TEAM_MANAGER.
 */
export default function TeamRoles() {
  const { workspaceId, isWorkspaceAdmin } = useFunctionalPermissions();
  const [rolesInUse, setRolesInUse] = useState<{ role: string; count: number }[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      // Contar miembros del workspace por rol funcional (mirror_type = workspace_member)
      const { data, error } = await supabase
        .from('contacts')
        .select('role')
        .eq('field_config->>mirror_type', 'workspace_member')
        .not('role', 'is', null)
        .range(0, 999);
      if (error) {
        console.error('rolesInUse fetch error', error);
        return;
      }
      const map = new Map<string, number>();
      (data ?? []).forEach((r: { role: string | null }) => {
        const name = r.role?.trim();
        if (!name) return;
        map.set(name, (map.get(name) ?? 0) + 1);
      });
      if (!cancelled) {
        setRolesInUse(Array.from(map.entries()).map(([role, count]) => ({ role, count })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to="/teams">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a equipos
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Roles funcionales</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulta y configura qué puede hacer cada rol funcional dentro del workspace.
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info" className="gap-1.5">
            <Info className="h-4 w-4" />
            Información de roles
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-1.5" disabled={!isWorkspaceAdmin}>
            <Shield className="h-4 w-4" />
            Editar permisos
            {!isWorkspaceAdmin && <span className="text-[10px] opacity-60 ml-1">(admin)</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4">
          <RoleInfoTab rolesInUse={rolesInUse} />
        </TabsContent>
        <TabsContent value="edit" className="mt-4">
          {isWorkspaceAdmin ? (
            <PermissionsByRoleTab rolesInUse={rolesInUse} />
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Solo el OWNER o TEAM_MANAGER puede editar la matriz de permisos.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
