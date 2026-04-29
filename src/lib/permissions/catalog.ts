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

/**
 * Descripciones industria-estándar por rol funcional.
 * Sirven a la pestaña informativa para explicar a usuarios y auditores
 * qué hace cada rol y por qué tiene los permisos que tiene.
 */
export interface RoleDescription {
  summary: string;
  responsibilities: string[];
}

export const ROLE_DESCRIPTIONS: Record<string, RoleDescription> = {
  'Mánager Personal': {
    summary: 'Responsable global de la carrera del artista. Coordina equipo, finanzas y estrategia.',
    responsibilities: [
      'Negocia y supervisa contratos y acuerdos comerciales.',
      'Lidera la planificación de bookings, releases y proyectos.',
      'Acceso pleno a finanzas, contactos y automatizaciones del workspace.',
    ],
  },
  'Business Manager': {
    summary: 'Gestor financiero del artista. Controla presupuestos, cashflow y reporting.',
    responsibilities: [
      'Aprueba presupuestos y supervisa pagos y cobros.',
      'Revisa contratos desde la perspectiva económica.',
      'No interviene en releases ni roadmaps creativos.',
    ],
  },
  'Director Artístico': {
    summary: 'Lidera la dirección creativa: releases, identidad visual y proyectos artísticos.',
    responsibilities: [
      'Gestiona releases (singles, EPs, álbumes) y su cronograma.',
      'Coordina proyectos creativos y materiales en Drive.',
      'Consulta presupuestos pero no maneja cashflow.',
    ],
  },
  'Booker': {
    summary: 'Cierra y gestiona conciertos del artista. Responsable del calendario de directos.',
    responsibilities: [
      'Crea ofertas, negocia caché y gestiona el pipeline de bookings.',
      'Edita presupuestos de concierto y prepara contratos.',
      'Lidera la hoja de ruta de cada show.',
    ],
  },
  'Booking Agent': {
    summary: 'Agencia de booking externa o interna que representa al artista en directo.',
    responsibilities: [
      'Mismas funciones que un Booker, con acceso a contactos extendido.',
      'Visualiza cashflow para confirmar liquidaciones.',
    ],
  },
  'Tour Manager': {
    summary: 'Coordina la operación diaria de la gira: viajes, hoteles, equipo y agenda.',
    responsibilities: [
      'Gestiona hojas de ruta y logística (transportes, alojamiento).',
      'Edita bookings con información operativa, sin negociar caché.',
      'Sin acceso a cashflow ni automatizaciones.',
    ],
  },
  'Road Manager': {
    summary: 'Asistente del Tour Manager en ruta. Foco en la ejecución diaria del show.',
    responsibilities: [
      'Edita roadmaps y solicitudes durante la gira.',
      'Solo lectura del calendario y contactos.',
    ],
  },
  'A&R': {
    summary: 'Descubre, desarrolla y supervisa el repertorio del artista.',
    responsibilities: [
      'Gestiona releases y créditos.',
      'Coordina proyectos creativos y materiales en Drive.',
      'Sin acceso a cashflow ni roadmaps de gira.',
    ],
  },
  'Productor': {
    summary: 'Produce los temas: estudio, arreglos, masters.',
    responsibilities: [
      'Edita releases y sube materiales a Drive.',
      'Consulta contratos y presupuestos asociados a la producción.',
    ],
  },
  'Productor Ejecutivo': {
    summary: 'Supervisa la producción global de un proyecto o release.',
    responsibilities: [
      'Edita presupuestos, contratos y releases.',
      'Coordina proyectos y consulta cashflow.',
    ],
  },
  'Compositor': {
    summary: 'Autor de la música. Beneficiario de royalties y splits.',
    responsibilities: [
      'Solo lectura de contratos, releases y proyectos donde participa.',
      'Sin acceso a finanzas del workspace.',
    ],
  },
  'Letrista': {
    summary: 'Autor de la letra. Beneficiario de royalties editoriales.',
    responsibilities: [
      'Solo lectura de contratos, releases y proyectos donde participa.',
    ],
  },
  'Intérprete': {
    summary: 'Artista intérprete principal o invitado de un release o show.',
    responsibilities: [
      'Consulta calendario, releases y hojas de ruta de su gira.',
      'Puede crear solicitudes internas (riders, peticiones).',
    ],
  },
  'Músico de Banda': {
    summary: 'Integrante de la banda en directo o estudio.',
    responsibilities: [
      'Consulta calendario y roadmaps.',
      'Puede crear solicitudes (peticiones de viaje, equipo).',
    ],
  },
  'Técnico de Sonido': {
    summary: 'Responsable del sonido en directo o estudio.',
    responsibilities: [
      'Consulta calendario y roadmaps.',
      'Sin acceso a finanzas, releases ni contratos.',
    ],
  },
  'Técnico de Luces': {
    summary: 'Responsable de la iluminación en directo.',
    responsibilities: [
      'Consulta calendario y roadmaps.',
      'Crea solicitudes operativas.',
    ],
  },
  'Backliner': {
    summary: 'Responsable del backline e instrumentos en gira.',
    responsibilities: [
      'Consulta hojas de ruta y materiales en Drive.',
    ],
  },
  'Comunicación / Prensa': {
    summary: 'Gestiona la relación con medios y la imagen pública.',
    responsibilities: [
      'Gestiona la biblioteca de Drive (notas de prensa, fotos).',
      'Edita releases para coordinar campañas de comunicación.',
    ],
  },
  'Marketing Digital': {
    summary: 'Diseña y ejecuta campañas digitales de los releases.',
    responsibilities: [
      'Edita releases y automatizaciones.',
      'Consulta presupuestos y analytics de campañas.',
    ],
  },
  'Community Manager': {
    summary: 'Gestiona redes sociales y comunidad del artista.',
    responsibilities: [
      'Edita releases y materiales gráficos en Drive.',
      'Consulta analytics para reporting.',
    ],
  },
  'Diseñador Gráfico': {
    summary: 'Crea identidad visual: portadas, banners, merchandising.',
    responsibilities: [
      'Edita Drive para entregar piezas creativas.',
      'Consulta releases y proyectos donde participa.',
    ],
  },
  'Fotógrafo': {
    summary: 'Captura sesiones de fotos del artista y conciertos.',
    responsibilities: [
      'Sube material a Drive.',
      'Consulta calendario y hojas de ruta para coordinarse.',
    ],
  },
  'Videógrafo': {
    summary: 'Realiza videoclips, contenido en redes y documentación de gira.',
    responsibilities: [
      'Sube material audiovisual a Drive.',
      'Consulta calendario, releases y roadmaps.',
    ],
  },
  'Asesor Legal': {
    summary: 'Revisa y gestiona la parte legal: contratos, derechos y licencias.',
    responsibilities: [
      'Control total sobre contratos.',
      'Consulta finanzas y releases para auditoría legal.',
    ],
  },
  'Asesor Fiscal': {
    summary: 'Gestiona obligaciones fiscales y tributarias del workspace.',
    responsibilities: [
      'Control total sobre cashflow y modelos fiscales.',
      'Consulta presupuestos, contratos y analytics.',
    ],
  },
  'Sello Discográfico': {
    summary: 'Compañía discográfica que comercializa los releases del artista.',
    responsibilities: [
      'Edita contratos discográficos.',
      'Consulta releases, presupuestos y analytics.',
    ],
  },
  'Editorial': {
    summary: 'Editorial musical que gestiona derechos de autor del repertorio.',
    responsibilities: [
      'Edita contratos editoriales.',
      'Consulta releases y splits.',
    ],
  },
  'Distribuidor': {
    summary: 'Distribuye los releases en plataformas digitales y físicas.',
    responsibilities: [
      'Edita contratos de distribución.',
      'Consulta releases y analytics de plataformas.',
    ],
  },
  'Promotor': {
    summary: 'Promotor de conciertos contraparte en bookings.',
    responsibilities: [
      'Consulta bookings, presupuestos y hojas de ruta de los shows acordados.',
      'No accede a release ni a finanzas internas.',
    ],
  },
};

export function getRoleDescription(roleName: string): RoleDescription {
  return (
    ROLE_DESCRIPTIONS[roleName] ?? {
      summary: 'Rol personalizado de este workspace.',
      responsibilities: [
        'Los permisos se han configurado manualmente desde la matriz de permisos.',
      ],
    }
  );
}
