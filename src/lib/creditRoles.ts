// Unified credit roles definitions
// Single source of truth for all credit/rights management

export interface CreditRole {
  value: string; // lowercase, stored in DB
  label: string; // display text
  category: 'publishing' | 'master';
}

// Publishing roles - correspond to composition/lyrics rights (Derechos de Autor)
export const PUBLISHING_ROLES: CreditRole[] = [
  { value: 'compositor', label: 'Compositor', category: 'publishing' },
  { value: 'letrista', label: 'Letrista', category: 'publishing' },
  { value: 'co-autor', label: 'Co-autor', category: 'publishing' },
  { value: 'arreglista', label: 'Arreglista', category: 'publishing' },
  { value: 'editorial', label: 'Editorial', category: 'publishing' },
];

// Master roles - correspond to recording/phonogram rights (Royalties Master)
export const MASTER_ROLES: CreditRole[] = [
  { value: 'productor', label: 'Productor', category: 'master' },
  { value: 'interprete', label: 'Intérprete', category: 'master' },
  { value: 'vocalista', label: 'Vocalista', category: 'master' },
  { value: 'featured', label: 'Featuring', category: 'master' },
  { value: 'sello', label: 'Sello', category: 'master' },
  { value: 'mezclador', label: 'Mezclador', category: 'master' },
  { value: 'masterizador', label: 'Masterizador', category: 'master' },
  { value: 'musico_sesion', label: 'Músico de Sesión', category: 'master' },
];

// All roles combined
export const ALL_CREDIT_ROLES: CreditRole[] = [...PUBLISHING_ROLES, ...MASTER_ROLES];

// Flat arrays of values for filtering
export const PUBLISHING_ROLE_VALUES = PUBLISHING_ROLES.map(r => r.value);
export const MASTER_ROLE_VALUES = MASTER_ROLES.map(r => r.value);

// Role order for sorting (lower = higher priority)
export const ROLE_ORDER: Record<string, number> = {
  compositor: 1,
  letrista: 2,
  'co-autor': 3,
  arreglista: 4,
  productor: 5,
  interprete: 6,
  vocalista: 7,
  featured: 8,
  sello: 9,
  editorial: 10,
  mezclador: 11,
  masterizador: 12,
  musico_sesion: 13,
};

/**
 * Get the display label for a role value
 */
export function getRoleLabel(roleValue: string): string {
  const normalized = roleValue.toLowerCase();
  const role = ALL_CREDIT_ROLES.find(r => r.value === normalized);
  return role?.label || roleValue;
}

/**
 * Get the category (publishing or master) for a role
 */
export function getRoleCategory(roleValue: string): 'publishing' | 'master' | null {
  const normalized = roleValue.toLowerCase();
  const role = ALL_CREDIT_ROLES.find(r => r.value === normalized);
  return role?.category || null;
}

/**
 * Check if a role belongs to publishing category
 */
export function isPublishingRole(roleValue: string): boolean {
  return PUBLISHING_ROLE_VALUES.includes(roleValue.toLowerCase());
}

/**
 * Check if a role belongs to master category
 */
export function isMasterRole(roleValue: string): boolean {
  return MASTER_ROLE_VALUES.includes(roleValue.toLowerCase());
}

/**
 * Sort credits by role order
 */
export function sortByRoleOrder<T extends { role: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = ROLE_ORDER[a.role.toLowerCase()] ?? 99;
    const orderB = ROLE_ORDER[b.role.toLowerCase()] ?? 99;
    return orderA - orderB;
  });
}
