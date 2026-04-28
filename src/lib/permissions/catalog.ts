import {
  Calendar,
  Wallet,
  Banknote,
  FileSignature,
  Disc3,
  FolderKanban,
  HardDrive,
  Map as MapIcon,
  Inbox,
  BarChart3,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleDescriptor, ModuleKey, PermissionLevel } from './types';

/**
 * Catálogo de los 12 módulos del sistema.
 * El icono se mantiene fuera del tipo serializable para que `types.ts` no dependa de UI.
 */
export const MODULES: (ModuleDescriptor & { icon: LucideIcon })[] = [
  { key: 'bookings', label: 'Bookings', icon: Calendar, description: 'Ofertas, calendario, fases, riders y liquidaciones de directos.' },
  { key: 'budgets', label: 'Presupuestos', icon: Wallet, description: 'Presupuestos (Caché y Capital), partidas, IVA e IRPF.' },
  { key: 'cashflow', label: 'Cashflow', icon: Banknote, description: 'Pagos, cobros y control fiscal del workspace.' },
  { key: 'contracts', label: 'Contratos', icon: FileSignature, description: 'Borradores, negociación y firma digital de contratos.' },
  { key: 'releases', label: 'Releases', icon: Disc3, description: 'Singles, álbumes, tracks, créditos y cronograma.' },
  { key: 'projects', label: 'Proyectos', icon: FolderKanban, description: 'Proyectos 360, checklists, riesgos y consultas.' },
  { key: 'drive', label: 'Drive', icon: HardDrive, description: 'Documentos, carpetas y subida de archivos.' },
  { key: 'roadmaps', label: 'Hojas de ruta', icon: MapIcon, description: 'Roadmaps de gira y logística.' },
  { key: 'solicitudes', label: 'Solicitudes', icon: Inbox, description: 'Solicitudes y aprobaciones internas.' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Business Intelligence, KPIs e ingresos.' },
  { key: 'contacts', label: 'Contactos', icon: Users, description: 'Equipos, agenda y perfiles.' },
  { key: 'automations', label: 'Automatizaciones', icon: Zap, description: 'Reglas automáticas, emails programados.' },
];

export const getModule = (key: ModuleKey) => MODULES.find((m) => m.key === key)!;

/** Etiquetas localizadas para los niveles. */
export const LEVEL_LABEL: Record<PermissionLevel, string> = {
  none: 'Sin acceso',
  view: 'Ver',
  edit: 'Editar',
  manage: 'Gestionar',
};

export const LEVEL_DESCRIPTION: Record<PermissionLevel, string> = {
  none: 'Ni siquiera ve la sección.',
  view: 'Puede consultar la información pero no modificarla.',
  edit: 'Puede crear y editar elementos.',
  manage: 'Control total: editar, eliminar y configurar.',
};

/** Color semántico (clases Tailwind con tokens del design system). */
export const LEVEL_COLOR_CLASS: Record<PermissionLevel, string> = {
  none: 'bg-destructive/15 text-destructive border-destructive/30',
  view: 'bg-muted text-muted-foreground border-border',
  edit: 'bg-primary/15 text-primary border-primary/30',
  manage: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
};

/**
 * Defaults estándar de la industria.
 * 28 roles × 12 módulos = 336 entradas.
 * Cualquier celda no listada se rellena automáticamente como 'none'.
 */
type RoleDefaults = Partial<Record<ModuleKey, PermissionLevel>>;

export const INDUSTRY_DEFAULTS: Record<string, RoleDefaults> = {
  'Mánager Personal': {
    bookings: 'manage', budgets: 'manage', cashflow: 'manage', contracts: 'manage',
    releases: 'manage', projects: 'manage', drive: 'manage', roadmaps: 'manage',
    solicitudes: 'manage', analytics: 'manage', contacts: 'manage', automations: 'edit',
  },
  'Business Manager': {
    bookings: 'view', budgets: 'manage', cashflow: 'manage', contracts: 'view',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'none',
    solicitudes: 'edit', analytics: 'manage', contacts: 'view', automations: 'view',
  },
  'Director Artístico': {
    bookings: 'view', budgets: 'view', cashflow: 'none', contracts: 'none',
    releases: 'manage', projects: 'manage', drive: 'edit', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'view',
  },
  'Booker': {
    bookings: 'manage', budgets: 'edit', cashflow: 'none', contracts: 'edit',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'manage',
    solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'none',
  },
  'Booking Agent': {
    bookings: 'manage', budgets: 'edit', cashflow: 'view', contracts: 'edit',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'manage',
    solicitudes: 'edit', analytics: 'view', contacts: 'edit', automations: 'none',
  },
  'Tour Manager': {
    bookings: 'edit', budgets: 'view', cashflow: 'none', contracts: 'view',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'manage',
    solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'none',
  },
  'Road Manager': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'edit',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'A&R': {
    bookings: 'view', budgets: 'view', cashflow: 'none', contracts: 'view',
    releases: 'manage', projects: 'edit', drive: 'edit', roadmaps: 'none',
    solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'none',
  },
  'Productor': {
    bookings: 'none', budgets: 'view', cashflow: 'none', contracts: 'view',
    releases: 'edit', projects: 'view', drive: 'edit', roadmaps: 'none',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Productor Ejecutivo': {
    bookings: 'view', budgets: 'edit', cashflow: 'view', contracts: 'edit',
    releases: 'manage', projects: 'manage', drive: 'edit', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'view',
  },
  'Compositor': {
    bookings: 'none', budgets: 'none', cashflow: 'none', contracts: 'view',
    releases: 'view', projects: 'view', drive: 'view', roadmaps: 'none',
    solicitudes: 'view', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Letrista': {
    bookings: 'none', budgets: 'none', cashflow: 'none', contracts: 'view',
    releases: 'view', projects: 'view', drive: 'view', roadmaps: 'none',
    solicitudes: 'view', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Intérprete': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'view',
    releases: 'view', projects: 'view', drive: 'view', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Músico de Banda': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'view',
    releases: 'view', projects: 'view', drive: 'view', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Técnico de Sonido': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Técnico de Luces': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Backliner': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'none', projects: 'none', drive: 'view', roadmaps: 'view',
    solicitudes: 'view', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Comunicación / Prensa': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'edit', projects: 'view', drive: 'manage', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'view', contacts: 'edit', automations: 'view',
  },
  'Marketing Digital': {
    bookings: 'view', budgets: 'view', cashflow: 'none', contracts: 'none',
    releases: 'edit', projects: 'view', drive: 'edit', roadmaps: 'none',
    solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'edit',
  },
  'Community Manager': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'edit', projects: 'view', drive: 'edit', roadmaps: 'none',
    solicitudes: 'view', analytics: 'view', contacts: 'view', automations: 'view',
  },
  'Diseñador Gráfico': {
    bookings: 'none', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'view', projects: 'view', drive: 'edit', roadmaps: 'none',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Fotógrafo': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'view', projects: 'view', drive: 'edit', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Videógrafo': {
    bookings: 'view', budgets: 'none', cashflow: 'none', contracts: 'none',
    releases: 'view', projects: 'view', drive: 'edit', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'none', contacts: 'view', automations: 'none',
  },
  'Asesor Legal': {
    bookings: 'view', budgets: 'view', cashflow: 'view', contracts: 'manage',
    releases: 'view', projects: 'view', drive: 'edit', roadmaps: 'view',
    solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'view',
  },
  'Asesor Fiscal': {
    bookings: 'view', budgets: 'view', cashflow: 'manage', contracts: 'view',
    releases: 'none', projects: 'view', drive: 'view', roadmaps: 'none',
    solicitudes: 'view', analytics: 'view', contacts: 'view', automations: 'none',
  },
  'Sello Discográfico': {
    bookings: 'view', budgets: 'view', cashflow: 'none', contracts: 'edit',
    releases: 'view', projects: 'view', drive: 'view', roadmaps: 'none',
    solicitudes: 'view', analytics: 'view', contacts: 'view', automations: 'none',
  },
  'Editorial': {
    bookings: 'none', budgets: 'view', cashflow: 'none', contracts: 'edit',
    releases: 'view', projects: 'view', drive: 'view', roadmaps: 'none',
    solicitudes: 'view', analytics: 'view', contacts: 'view', automations: 'none',
  },
  'Distribuidor': {
    bookings: 'none', budgets: 'view', cashflow: 'none', contracts: 'edit',
    releases: 'view', projects: 'view', drive: 'view', roadmaps: 'none',
    solicitudes: 'view', analytics: 'view', contacts: 'view', automations: 'none',
  },
  'Promotor': {
    bookings: 'view', budgets: 'view', cashflow: 'none', contracts: 'view',
    releases: 'none', projects: 'none', drive: 'view', roadmaps: 'view',
    solicitudes: 'view', analytics: 'none', contacts: 'view', automations: 'none',
  },
};

/** Devuelve el default normalizado para un rol (rellenando 'none' donde falte). */
export function getIndustryDefaults(roleName: string): Record<ModuleKey, PermissionLevel> {
  const partial = INDUSTRY_DEFAULTS[roleName] ?? {};
  const out = {} as Record<ModuleKey, PermissionLevel>;
  for (const m of MODULES) {
    out[m.key] = partial[m.key] ?? 'none';
  }
  return out;
}

export const KNOWN_FUNCTIONAL_ROLES = Object.keys(INDUSTRY_DEFAULTS);
