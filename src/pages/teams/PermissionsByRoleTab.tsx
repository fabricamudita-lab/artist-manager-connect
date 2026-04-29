import { useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, Search, Shield, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFunctionalPermissions } from '@/hooks/useFunctionalPermissions';
import {
  loadPermissionsMatrix,
  upsertOverride,
  resetRoleOverrides,
  computeRolePerms,
  type PermissionsMatrix,
} from '@/lib/permissions/service';
import {
  MODULES,
  LEVEL_LABEL,
  LEVEL_DESCRIPTION,
  LEVEL_COLOR_CLASS,
  KNOWN_FUNCTIONAL_ROLES,
  getIndustryDefaults,
} from '@/lib/permissions/catalog';
import type { ModuleKey, PermissionLevel } from '@/lib/permissions/types';

const LEVEL_OPTIONS: PermissionLevel[] = ['none', 'view', 'edit', 'manage'];

interface RoleListItem {
  name: string;
  memberCount: number;
  isCustom: boolean;
}

interface PermissionsByRoleTabProps {
  /** Roles funcionales actualmente en uso por miembros del workspace, con su conteo. */
  rolesInUse: { role: string; count: number }[];
}

export function PermissionsByRoleTab({ rolesInUse }: PermissionsByRoleTabProps) {
  const { workspaceId, isWorkspaceAdmin, loading: permsLoading } = useFunctionalPermissions();
  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // `${role}:${module}`
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Cargar matriz inicial
  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) return;
    setLoading(true);
    loadPermissionsMatrix(workspaceId)
      .then((m) => {
        if (!cancelled) setMatrix(m);
      })
      .catch((e) => {
        console.error(e);
        toast({ title: 'Error cargando permisos', description: e.message, variant: 'destructive' });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Lista de roles: KNOWN + roles en uso (custom) + roles con override
  const allRoles: RoleListItem[] = useMemo(() => {
    const counts = new Map<string, number>();
    rolesInUse.forEach((r) => counts.set(r.role, (counts.get(r.role) ?? 0) + r.count));

    const known = new Set(KNOWN_FUNCTIONAL_ROLES);
    const set = new Set<string>([...KNOWN_FUNCTIONAL_ROLES, ...counts.keys()]);
    matrix?.overrides.forEach((o) => set.add(o.role_name));

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((name) => ({
        name,
        memberCount: counts.get(name) ?? 0,
        isCustom: !known.has(name),
      }));
  }, [matrix, rolesInUse]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRoles;
    return allRoles.filter((r) => r.name.toLowerCase().includes(q));
  }, [allRoles, search]);

  // Auto-select primer rol
  useEffect(() => {
    if (!selectedRole && filteredRoles.length > 0) {
      setSelectedRole(filteredRoles[0].name);
    }
  }, [filteredRoles, selectedRole]);

  const currentPerms = useMemo(() => {
    if (!selectedRole || !matrix) return null;
    return computeRolePerms(matrix, selectedRole);
  }, [matrix, selectedRole]);

  const hasOverridesForRole = useMemo(() => {
    if (!selectedRole || !matrix) return false;
    return matrix.overrides.some((o) => o.role_name === selectedRole);
  }, [matrix, selectedRole]);

  async function handleChangeLevel(module: ModuleKey, newLevel: PermissionLevel) {
    if (!workspaceId || !selectedRole || !isWorkspaceAdmin) return;
    const key = `${selectedRole}:${module}`;
    setSaving(key);
    try {
      await upsertOverride({
        workspace_id: workspaceId,
        role_name: selectedRole,
        module,
        level: newLevel,
      });
      // Optimistic refresh
      const fresh = await loadPermissionsMatrix(workspaceId);
      setMatrix(fresh);
      toast({ title: 'Permiso actualizado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  }

  async function handleResetRole() {
    if (!workspaceId || !selectedRole || !isWorkspaceAdmin) return;
    if (!confirm(`¿Restaurar valores estándar para "${selectedRole}"?`)) return;
    try {
      await resetRoleOverrides(workspaceId, selectedRole);
      const fresh = await loadPermissionsMatrix(workspaceId);
      setMatrix(fresh);
      toast({ title: 'Permisos restaurados' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  if (permsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando matriz de permisos…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isWorkspaceAdmin && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Vista de solo lectura</AlertTitle>
          <AlertDescription>
            Solo el OWNER o TEAM_MANAGER del workspace puede modificar la matriz de permisos.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-primary/30 bg-primary/5">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle>Permisos por rol funcional</AlertTitle>
        <AlertDescription>
          Estos permisos se aplican automáticamente en toda la app a los miembros con cada rol funcional.
          Los OWNER y TEAM_MANAGER del workspace siempre tienen control total y no se ven afectados.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Lista de roles */}
        <Card>
          <CardContent className="p-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar rol…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <ScrollArea className="h-[60vh]">
              <div className="p-2 space-y-0.5">
                {filteredRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>
                )}
                {filteredRoles.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => setSelectedRole(r.name)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 transition-colors',
                      selectedRole === r.name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent',
                    )}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {r.name}
                      {r.isCustom && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          custom
                        </Badge>
                      )}
                    </span>
                    {r.memberCount > 0 && (
                      <Badge
                        variant={selectedRole === r.name ? 'secondary' : 'outline'}
                        className="text-[10px]"
                      >
                        {r.memberCount}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Matriz del rol seleccionado */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {!selectedRole || !currentPerms ? (
              <p className="text-muted-foreground text-sm">Selecciona un rol funcional.</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {selectedRole}
                      {hasOverridesForRole && (
                        <Badge variant="secondary" className="text-xs">
                          Personalizado
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {!hasOverridesForRole
                        ? 'Usando valores estándar de la industria.'
                        : 'Este workspace ha sobrescrito algunos valores estándar.'}
                    </p>
                  </div>
                  {isWorkspaceAdmin && hasOverridesForRole && (
                    <Button variant="outline" size="sm" onClick={handleResetRole}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Restaurar valores estándar
                    </Button>
                  )}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Módulo</th>
                        {LEVEL_OPTIONS.map((lvl) => (
                          <th key={lvl} className="text-center px-2 py-2 font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="cursor-help">
                                  {LEVEL_LABEL[lvl]}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs max-w-[200px]">{LEVEL_DESCRIPTION[lvl]}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod) => {
                        const Icon = mod.icon;
                        const current = currentPerms[mod.key];
                        const industryDefault = getIndustryDefaults(selectedRole)[mod.key];
                        const isOverridden =
                          matrix?.overrides.some(
                            (o) => o.role_name === selectedRole && o.module === mod.key,
                          ) ?? false;

                        return (
                          <tr key={mod.key} className="border-t">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-medium flex items-center gap-1.5">
                                    {mod.label}
                                    {isOverridden && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 h-4"
                                      >
                                        ≠ estándar
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {mod.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {LEVEL_OPTIONS.map((lvl) => {
                              const isActive = current === lvl;
                              const isDefault = industryDefault === lvl;
                              const key = `${selectedRole}:${mod.key}`;
                              const isSaving = saving === key;
                              return (
                                <td key={lvl} className="text-center px-1 py-1.5">
                                  <button
                                    type="button"
                                    disabled={!isWorkspaceAdmin || isSaving}
                                    onClick={() => handleChangeLevel(mod.key, lvl)}
                                    className={cn(
                                      'w-full px-2 py-1.5 rounded text-xs font-medium border transition-all',
                                      isActive
                                        ? LEVEL_COLOR_CLASS[lvl]
                                        : 'border-transparent text-muted-foreground hover:bg-accent',
                                      !isWorkspaceAdmin && 'cursor-not-allowed opacity-60',
                                      isSaving && 'opacity-50',
                                    )}
                                    title={
                                      isDefault ? `Estándar: ${LEVEL_LABEL[lvl]}` : LEVEL_LABEL[lvl]
                                    }
                                  >
                                    {isActive ? '●' : isDefault ? '○' : '·'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  ● activo · ○ valor estándar de la industria · · disponible
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
