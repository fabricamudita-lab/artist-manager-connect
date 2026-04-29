import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Info, ShieldCheck, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFunctionalPermissions } from '@/hooks/useFunctionalPermissions';
import {
  loadPermissionsMatrix,
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
  getRoleDescription,
} from '@/lib/permissions/catalog';
import type { ModuleKey, PermissionLevel } from '@/lib/permissions/types';

interface RoleListItem {
  name: string;
  memberCount: number;
  isCustom: boolean;
}

interface RoleInfoTabProps {
  /** Roles funcionales en uso por miembros del workspace, con conteo. */
  rolesInUse: { role: string; count: number }[];
}

const LEVEL_GROUPS: PermissionLevel[] = ['manage', 'edit', 'view', 'none'];
const GROUP_LABEL: Record<PermissionLevel, string> = {
  manage: 'Puede gestionar (control total)',
  edit: 'Puede editar (crear y modificar)',
  view: 'Solo puede consultar',
  none: 'Sin acceso',
};
const GROUP_DESCRIPTION: Record<PermissionLevel, string> = {
  manage: 'Editar, eliminar y configurar todos los elementos del módulo.',
  edit: 'Crear y editar, sin permiso para eliminar ni reconfigurar.',
  view: 'Acceso de solo lectura. No puede modificar nada.',
  none: 'El módulo no aparece en su navegación.',
};

export function RoleInfoTab({ rolesInUse }: RoleInfoTabProps) {
  const { workspaceId, loading: permsLoading } = useFunctionalPermissions();
  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<ModuleKey | 'all'>('all');
  const [onlyAssigned, setOnlyAssigned] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

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
    return allRoles.filter((r) => {
      if (onlyAssigned && r.memberCount === 0) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (moduleFilter !== 'all' && matrix) {
        const perms = computeRolePerms(matrix, r.name);
        if (perms[moduleFilter] === 'none') return false;
      }
      return true;
    });
  }, [allRoles, search, onlyAssigned, moduleFilter, matrix]);

  useEffect(() => {
    if ((!selectedRole || !filteredRoles.find((r) => r.name === selectedRole)) && filteredRoles.length > 0) {
      setSelectedRole(filteredRoles[0].name);
    }
  }, [filteredRoles, selectedRole]);

  const selectedDescription = selectedRole ? getRoleDescription(selectedRole) : null;
  const selectedPerms = useMemo(() => {
    if (!selectedRole || !matrix) return null;
    return computeRolePerms(matrix, selectedRole);
  }, [selectedRole, matrix]);
  const industryDefaults = useMemo(
    () => (selectedRole ? getIndustryDefaults(selectedRole) : null),
    [selectedRole],
  );
  const overriddenModules = useMemo(() => {
    if (!selectedRole || !matrix) return new Set<ModuleKey>();
    return new Set(
      matrix.overrides
        .filter((o) => o.role_name === selectedRole)
        .map((o) => o.module as ModuleKey),
    );
  }, [selectedRole, matrix]);

  if (permsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando información de roles…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-primary/30 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertTitle>Información de roles funcionales</AlertTitle>
        <AlertDescription>
          Vista de solo lectura. Aquí puedes consultar, para cada rol funcional, qué módulos puede{' '}
          <strong>gestionar</strong>, <strong>editar</strong>, <strong>solo consultar</strong> o
          a cuáles <strong>no tiene acceso</strong>. Los OWNER y TEAM_MANAGER del workspace
          siempre tienen control total.
        </AlertDescription>
      </Alert>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value as ModuleKey | 'all')}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label="Filtrar por módulo con acceso"
        >
          <option value="all">Todos los módulos</option>
          {MODULES.map((m) => (
            <option key={m.key} value={m.key}>
              Con acceso a: {m.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={onlyAssigned}
            onChange={(e) => setOnlyAssigned(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Solo roles asignados
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Lista de roles */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh]">
              <div className="p-2 space-y-0.5">
                {filteredRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Sin resultados con los filtros actuales.
                  </p>
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

        {/* Detalle del rol */}
        <Card>
          <CardContent className="p-5 space-y-5">
            {!selectedRole || !selectedPerms || !selectedDescription ? (
              <p className="text-muted-foreground text-sm">Selecciona un rol para ver su información.</p>
            ) : (
              <>
                <header className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold">{selectedRole}</h3>
                    {overriddenModules.size > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="gap-1">
                              <Settings2 className="h-3 w-3" />
                              Personalizado por workspace
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-[260px]">
                              {overriddenModules.size} módulo(s) con permisos distintos del estándar
                              de la industria.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedDescription.summary}</p>
                  {selectedDescription.responsibilities.length > 0 && (
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                      {selectedDescription.responsibilities.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                </header>

                {/* Grupos por nivel */}
                <div className="space-y-3">
                  {LEVEL_GROUPS.map((level) => {
                    const modulesAtLevel = MODULES.filter((m) => selectedPerms[m.key] === level);
                    if (modulesAtLevel.length === 0) return null;
                    return (
                      <div key={level} className="rounded-md border overflow-hidden">
                        <div
                          className={cn(
                            'px-3 py-2 flex items-center justify-between border-b',
                            LEVEL_COLOR_CLASS[level],
                          )}
                        >
                          <div>
                            <div className="text-sm font-semibold">{GROUP_LABEL[level]}</div>
                            <div className="text-xs opacity-80">{GROUP_DESCRIPTION[level]}</div>
                          </div>
                          <Badge variant="outline" className="bg-background/60">
                            {modulesAtLevel.length}
                          </Badge>
                        </div>
                        <ul className="divide-y">
                          {modulesAtLevel.map((mod) => {
                            const Icon = mod.icon;
                            const isOverridden = overriddenModules.has(mod.key);
                            const industryLevel = industryDefaults?.[mod.key];
                            return (
                              <li key={mod.key} className="px-3 py-2 flex items-start gap-3">
                                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                                    {mod.label}
                                    {isOverridden && industryLevel && industryLevel !== level && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] px-1 py-0 h-4"
                                            >
                                              ≠ estándar ({LEVEL_LABEL[industryLevel]})
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs max-w-[240px]">
                                              Este workspace ha modificado el valor por defecto de la
                                              industria, que era “{LEVEL_LABEL[industryLevel]}”.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {mod.description}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-muted-foreground flex items-start gap-1.5 pt-2 border-t">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Los niveles se acumulan: <strong>gestionar</strong> incluye editar y consultar;{' '}
                    <strong>editar</strong> incluye consultar.{' '}
                    {LEVEL_DESCRIPTION.manage}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
