/**
 * Sistema de permisos por rol funcional.
 * - Niveles ordenados: none < view < edit < manage
 * - 12 módulos cubren todo el sistema
 */

export type PermissionLevel = 'none' | 'view' | 'edit' | 'manage';

export const LEVEL_RANK: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  manage: 3,
};

export type ModuleKey =
  | 'bookings'
  | 'budgets'
  | 'cashflow'
  | 'contracts'
  | 'releases'
  | 'projects'
  | 'drive'
  | 'roadmaps'
  | 'solicitudes'
  | 'analytics'
  | 'contacts'
  | 'automations';

export interface ModuleDescriptor {
  key: ModuleKey;
  label: string;
  description: string;
}

export interface RolePermissionRow {
  role_name: string;
  module: ModuleKey;
  level: PermissionLevel;
}

export type EffectivePermissions = Record<ModuleKey, PermissionLevel>;

export const ALL_MODULES: ModuleKey[] = [
  'bookings',
  'budgets',
  'cashflow',
  'contracts',
  'releases',
  'projects',
  'drive',
  'roadmaps',
  'solicitudes',
  'analytics',
  'contacts',
  'automations',
];

export const EMPTY_PERMISSIONS: EffectivePermissions = ALL_MODULES.reduce(
  (acc, m) => ({ ...acc, [m]: 'none' as PermissionLevel }),
  {} as EffectivePermissions,
);

export function meetsLevel(granted: PermissionLevel, required: PermissionLevel): boolean {
  return LEVEL_RANK[granted] >= LEVEL_RANK[required];
}
