// Unified credit roles definitions
// Single source of truth for all credit/rights management
// Aligned with industry standard (Ditto / distributors) — 5 categories

export type CreditCategory = 'compositor' | 'autoria' | 'produccion' | 'interprete' | 'contribuidor';

export interface CreditRole {
  value: string; // lowercase, stored in DB
  label: string; // display text
  category: CreditCategory;
}

export interface CreditCategoryMeta {
  id: CreditCategory;
  label: string;
  color: string; // tailwind-compatible class fragment
  bgClass: string;
  textClass: string;
  borderClass: string;
}

// Category metadata for UI rendering
export const CREDIT_CATEGORIES: CreditCategoryMeta[] = [
  { id: 'compositor', label: 'Compositor', color: 'amber', bgClass: 'bg-amber-500/10', textClass: 'text-amber-600', borderClass: 'border-amber-500/20' },
  { id: 'autoria', label: 'Autoría', color: 'amber', bgClass: 'bg-amber-500/10', textClass: 'text-amber-600', borderClass: 'border-amber-500/20' },
  { id: 'produccion', label: 'Producción / Ingeniería', color: 'blue', bgClass: 'bg-blue-500/10', textClass: 'text-blue-600', borderClass: 'border-blue-500/20' },
  { id: 'interprete', label: 'Intérprete', color: 'violet', bgClass: 'bg-violet-500/10', textClass: 'text-violet-600', borderClass: 'border-violet-500/20' },
  { id: 'contribuidor', label: 'Contribuidor', color: 'gray', bgClass: 'bg-muted/50', textClass: 'text-muted-foreground', borderClass: 'border-muted' },
];

export function getCategoryMeta(category: CreditCategory): CreditCategoryMeta {
  return CREDIT_CATEGORIES.find(c => c.id === category) || CREDIT_CATEGORIES[0];
}

// ─── Compositor ──────────────────────────────────────────────
export const COMPOSITOR_ROLES: CreditRole[] = [
  { value: 'compositor', label: 'Compositor', category: 'compositor' },
];

// ─── Autoría (Songwriter) ────────────────────────────────────
export const AUTORIA_ROLES: CreditRole[] = [
  { value: 'autor', label: 'Autor', category: 'autoria' },
  { value: 'letrista', label: 'Letrista', category: 'autoria' },
  { value: 'co-autor', label: 'Co-autor', category: 'autoria' },
  { value: 'arreglista', label: 'Arreglista', category: 'autoria' },
  { value: 'director_orquesta', label: 'Director de Orquesta', category: 'autoria' },
  { value: 'libretista', label: 'Libretista', category: 'autoria' },
  { value: 'editorial', label: 'Editorial', category: 'autoria' },
];

// ─── Producción / Ingeniería ─────────────────────────────────
export const PRODUCCION_ROLES: CreditRole[] = [
  { value: 'productor', label: 'Productor', category: 'produccion' },
  { value: 'productor_asistente', label: 'Productor Asistente', category: 'produccion' },
  { value: 'productor_ejecutivo', label: 'Productor Ejecutivo', category: 'produccion' },
  { value: 'coproductor', label: 'Coproductor', category: 'produccion' },
  { value: 'ingeniero_mezcla', label: 'Ingeniero de Mezcla', category: 'produccion' },
  { value: 'masterizador', label: 'Ingeniero de Masterización', category: 'produccion' },
  { value: 'ingeniero_sonido', label: 'Ingeniero de Sonido', category: 'produccion' },
  { value: 'ingeniero_grabacion', label: 'Ingeniero de Grabación', category: 'produccion' },
  { value: 'director_musical', label: 'Director Musical', category: 'produccion' },
  { value: 'programador', label: 'Programador', category: 'produccion' },
  { value: 'mezclador', label: 'Mezclador', category: 'produccion' },
];

// ─── Intérprete (Performer) ──────────────────────────────────
export const INTERPRETE_ROLES: CreditRole[] = [
  // Voces
  { value: 'voz_principal', label: 'Voz Principal', category: 'interprete' },
  { value: 'vocalista', label: 'Vocalista', category: 'interprete' },
  { value: 'intérprete', label: 'Intérprete', category: 'interprete' },
  { value: 'interprete', label: 'Intérprete', category: 'interprete' },
  { value: 'featured', label: 'Featuring', category: 'interprete' },
  { value: 'coros', label: 'Coros', category: 'interprete' },
  { value: 'coros_armonia', label: 'Coros de Armonía', category: 'interprete' },
  { value: 'voz_adicional', label: 'Voz Adicional', category: 'interprete' },
  { value: 'beatboxer', label: 'Beatboxer', category: 'interprete' },
  { value: 'narrador', label: 'Narrador', category: 'interprete' },
  { value: 'rapero', label: 'Rapero', category: 'interprete' },
  // Cuerdas
  { value: 'guitarra', label: 'Guitarra', category: 'interprete' },
  { value: 'guitarra_acustica', label: 'Guitarra Acústica', category: 'interprete' },
  { value: 'guitarra_electrica', label: 'Guitarra Eléctrica', category: 'interprete' },
  { value: 'guitarra_clasica', label: 'Guitarra Clásica', category: 'interprete' },
  { value: 'bajo', label: 'Bajo', category: 'interprete' },
  { value: 'bajo_electrico', label: 'Bajo Eléctrico', category: 'interprete' },
  { value: 'contrabajo', label: 'Contrabajo', category: 'interprete' },
  { value: 'violin', label: 'Violín', category: 'interprete' },
  { value: 'viola', label: 'Viola', category: 'interprete' },
  { value: 'violonchelo', label: 'Violonchelo', category: 'interprete' },
  { value: 'arpa', label: 'Arpa', category: 'interprete' },
  { value: 'banjo', label: 'Banjo', category: 'interprete' },
  { value: 'mandolina', label: 'Mandolina', category: 'interprete' },
  { value: 'ukelele', label: 'Ukelele', category: 'interprete' },
  { value: 'charango', label: 'Charango', category: 'interprete' },
  { value: 'laud', label: 'Laúd', category: 'interprete' },
  { value: 'sitar', label: 'Sitar', category: 'interprete' },
  // Teclados
  { value: 'piano', label: 'Piano', category: 'interprete' },
  { value: 'teclados', label: 'Teclados', category: 'interprete' },
  { value: 'organo', label: 'Órgano', category: 'interprete' },
  { value: 'sintetizador', label: 'Sintetizador', category: 'interprete' },
  { value: 'acordeon', label: 'Acordeón', category: 'interprete' },
  { value: 'clavecin', label: 'Clavecín', category: 'interprete' },
  // Percusión
  { value: 'bateria', label: 'Batería', category: 'interprete' },
  { value: 'percusion', label: 'Percusión', category: 'interprete' },
  { value: 'congas', label: 'Congas', category: 'interprete' },
  { value: 'bongos', label: 'Bongós', category: 'interprete' },
  { value: 'timbales', label: 'Timbales', category: 'interprete' },
  { value: 'cajon', label: 'Cajón', category: 'interprete' },
  { value: 'marimba', label: 'Marimba', category: 'interprete' },
  { value: 'vibrafono', label: 'Vibráfono', category: 'interprete' },
  { value: 'xilofono', label: 'Xilófono', category: 'interprete' },
  { value: 'pandereta', label: 'Pandereta', category: 'interprete' },
  { value: 'djembe', label: 'Djembé', category: 'interprete' },
  { value: 'tabla', label: 'Tabla', category: 'interprete' },
  { value: 'steel_drums', label: 'Steel Drums', category: 'interprete' },
  // Viento madera
  { value: 'flauta', label: 'Flauta', category: 'interprete' },
  { value: 'flauta_traversa', label: 'Flauta Traversa', category: 'interprete' },
  { value: 'clarinete', label: 'Clarinete', category: 'interprete' },
  { value: 'oboe', label: 'Oboe', category: 'interprete' },
  { value: 'fagot', label: 'Fagot', category: 'interprete' },
  { value: 'saxo_alto', label: 'Saxo Alto', category: 'interprete' },
  { value: 'saxo_tenor', label: 'Saxo Tenor', category: 'interprete' },
  { value: 'saxo_soprano', label: 'Saxo Soprano', category: 'interprete' },
  { value: 'saxo_baritono', label: 'Saxo Barítono', category: 'interprete' },
  { value: 'saxofon', label: 'Saxofón', category: 'interprete' },
  { value: 'armonica', label: 'Armónica', category: 'interprete' },
  { value: 'gaita', label: 'Gaita', category: 'interprete' },
  { value: 'quena', label: 'Quena', category: 'interprete' },
  { value: 'zampoña', label: 'Zampoña', category: 'interprete' },
  // Viento metal
  { value: 'trompeta', label: 'Trompeta', category: 'interprete' },
  { value: 'trombon', label: 'Trombón', category: 'interprete' },
  { value: 'tuba', label: 'Tuba', category: 'interprete' },
  { value: 'corno_frances', label: 'Corno Francés', category: 'interprete' },
  { value: 'flugelhorn', label: 'Fliscorno', category: 'interprete' },
  // Otros instrumentos
  { value: 'musico_sesion', label: 'Músico de Sesión', category: 'interprete' },
  { value: 'cuerdas', label: 'Cuerdas (Ensamble)', category: 'interprete' },
  { value: 'vientos', label: 'Vientos (Ensamble)', category: 'interprete' },
  { value: 'metales', label: 'Metales (Ensamble)', category: 'interprete' },
  { value: 'orquesta', label: 'Orquesta', category: 'interprete' },
  { value: 'coro', label: 'Coro (Ensamble)', category: 'interprete' },
  { value: 'otro_instrumento', label: 'Otro Instrumento', category: 'interprete' },
];

// ─── Contribuidor ────────────────────────────────────────────
export const CONTRIBUIDOR_ROLES: CreditRole[] = [
  { value: 'remixer', label: 'Remixer', category: 'contribuidor' },
  { value: 'dj', label: 'DJ', category: 'contribuidor' },
  { value: 'sello', label: 'Sello', category: 'contribuidor' },
  { value: 'actor', label: 'Actor', category: 'contribuidor' },
  { value: 'director_video', label: 'Director de Video', category: 'contribuidor' },
  { value: 'director_arte', label: 'Director de Arte', category: 'contribuidor' },
  { value: 'fotografo', label: 'Fotógrafo', category: 'contribuidor' },
  { value: 'disenador', label: 'Diseñador', category: 'contribuidor' },
  { value: 'estudio_grabacion', label: 'Estudio de Grabación', category: 'contribuidor' },
  { value: 'otro', label: 'Otro', category: 'contribuidor' },
];

// ─── Legacy aliases (backward compat) ───────────────────────
// These arrays map old 2-category system to new 5-category system
export const PUBLISHING_ROLES: CreditRole[] = [...COMPOSITOR_ROLES, ...AUTORIA_ROLES];
export const MASTER_ROLES: CreditRole[] = [...PRODUCCION_ROLES, ...INTERPRETE_ROLES, ...CONTRIBUIDOR_ROLES];

// All roles combined
export const ALL_CREDIT_ROLES: CreditRole[] = [
  ...COMPOSITOR_ROLES,
  ...AUTORIA_ROLES,
  ...PRODUCCION_ROLES,
  ...INTERPRETE_ROLES,
  ...CONTRIBUIDOR_ROLES,
];

// Roles grouped by category for UI selectors
export const ROLES_BY_CATEGORY: { category: CreditCategoryMeta; roles: CreditRole[] }[] = [
  { category: CREDIT_CATEGORIES[0], roles: COMPOSITOR_ROLES },
  { category: CREDIT_CATEGORIES[1], roles: AUTORIA_ROLES },
  { category: CREDIT_CATEGORIES[2], roles: PRODUCCION_ROLES },
  { category: CREDIT_CATEGORIES[3], roles: INTERPRETE_ROLES },
  { category: CREDIT_CATEGORIES[4], roles: CONTRIBUIDOR_ROLES },
];

// Flat arrays of values for filtering
export const PUBLISHING_ROLE_VALUES = PUBLISHING_ROLES.map(r => r.value);
export const MASTER_ROLE_VALUES = MASTER_ROLES.map(r => r.value);

// Role order for sorting (lower = higher priority)
export const ROLE_ORDER: Record<string, number> = {
  compositor: 1,
  autor: 2,
  letrista: 3,
  'co-autor': 4,
  arreglista: 5,
  director_orquesta: 6,
  libretista: 7,
  editorial: 8,
  productor: 10,
  productor_ejecutivo: 11,
  coproductor: 12,
  productor_asistente: 13,
  ingeniero_mezcla: 14,
  masterizador: 15,
  ingeniero_sonido: 16,
  ingeniero_grabacion: 17,
  director_musical: 18,
  mezclador: 19,
  programador: 20,
  voz_principal: 30,
  vocalista: 31,
  interprete: 32,
  featured: 33,
  coros: 34,
  guitarra: 40,
  bajo: 41,
  piano: 42,
  teclados: 43,
  bateria: 44,
  percusion: 45,
  violin: 46,
  musico_sesion: 50,
  remixer: 60,
  dj: 61,
  sello: 70,
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
 * Get the 5-category for a role
 */
export function getRoleCategory5(roleValue: string): CreditCategory | null {
  const normalized = roleValue.toLowerCase();
  const role = ALL_CREDIT_ROLES.find(r => r.value === normalized);
  return role?.category || null;
}

/**
 * Get the category (publishing or master) for a role — backward compat
 */
export function getRoleCategory(roleValue: string): 'publishing' | 'master' | null {
  const cat5 = getRoleCategory5(roleValue);
  if (!cat5) return null;
  if (cat5 === 'compositor' || cat5 === 'autoria') return 'publishing';
  return 'master';
}

/**
 * Check if a role belongs to publishing category
 */
export function isPublishingRole(roleValue: string): boolean {
  const cat = getRoleCategory5(roleValue.toLowerCase());
  return cat === 'compositor' || cat === 'autoria';
}

/**
 * Check if a role belongs to master category
 */
export function isMasterRole(roleValue: string): boolean {
  const cat = getRoleCategory5(roleValue.toLowerCase());
  return cat === 'produccion' || cat === 'interprete' || cat === 'contribuidor';
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

/**
 * Filter ROLES_BY_CATEGORY for publishing-only or master-only selectors
 */
export function getRolesByType(type: 'publishing' | 'master' | CreditCategory) {
  if (type === 'publishing') {
    return ROLES_BY_CATEGORY.filter(g => g.category.id === 'compositor' || g.category.id === 'autoria');
  }
  if (type === 'master') {
    return ROLES_BY_CATEGORY.filter(g => g.category.id === 'produccion' || g.category.id === 'interprete' || g.category.id === 'contribuidor');
  }
  // Single category filter
  return ROLES_BY_CATEGORY.filter(g => g.category.id === type);
}

// ─── Distributor Category Mapping ────────────────────────────
// Maps internal categories to distributor format (Ditto, DistroKid, etc.)
export const DISTRIBUTOR_CATEGORY_MAP: Record<CreditCategory, string> = {
  compositor: 'Composer',
  autoria: 'Songwriter',
  produccion: 'Production/Engineer',
  interprete: 'Performer',
  contribuidor: 'Contributor',
};

// Maps internal role values to distributor-standard English labels
const DISTRIBUTOR_ROLE_MAP: Record<string, string> = {
  compositor: 'Composer',
  autor: 'Author',
  letrista: 'Lyricist',
  'co-autor': 'Co-Author',
  arreglista: 'Arranger',
  director_orquesta: 'Orchestra Conductor',
  libretista: 'Librettist',
  editorial: 'Publisher',
  productor: 'Producer',
  productor_asistente: 'Assistant Producer',
  productor_ejecutivo: 'Executive Producer',
  coproductor: 'Co-Producer',
  ingeniero_mezcla: 'Mixing Engineer',
  masterizador: 'Mastering Engineer',
  ingeniero_sonido: 'Sound Engineer',
  ingeniero_grabacion: 'Recording Engineer',
  director_musical: 'Musical Director',
  programador: 'Programmer',
  mezclador: 'Mixer',
  voz_principal: 'Lead Vocals',
  vocalista: 'Vocalist',
  interprete: 'Performer',
  featured: 'Featured Artist',
  coros: 'Background Vocals',
  remixer: 'Remixer',
  dj: 'DJ',
};

/**
 * Get the distributor-standard English label for a role
 */
export function getDistributorRoleLabel(roleValue: string): string {
  return DISTRIBUTOR_ROLE_MAP[roleValue.toLowerCase()] || getRoleLabel(roleValue);
}

/**
 * Get the distributor category name for a role
 */
export function getDistributorCategory(roleValue: string): string {
  const cat = getRoleCategory5(roleValue);
  return cat ? DISTRIBUTOR_CATEGORY_MAP[cat] : 'Contributor';
}
