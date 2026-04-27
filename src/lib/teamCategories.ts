import { Users, UserCheck, Building, Mail, Shield, Tag, Mic } from 'lucide-react';

export interface TeamCategoryOption {
  value: string;
  label: string;
  icon?: any;
  isCustom?: boolean;
}

export const TEAM_CATEGORIES: TeamCategoryOption[] = [
  { value: 'banda', label: 'Banda', icon: Users },
  { value: 'artistico', label: 'Equipo Artístico', icon: Users },
  { value: 'tecnico', label: 'Equipo Técnico', icon: UserCheck },
  { value: 'management', label: 'Management', icon: Building },
  { value: 'comunicacion', label: 'Comunicación', icon: Mail },
  { value: 'legal', label: 'Legal', icon: Shield },
  { value: 'produccion', label: 'Producción', icon: Users },
  { value: 'tourmanager', label: 'Tour Manager', icon: UserCheck },
  { value: 'booking', label: 'Booking', icon: UserCheck },
  { value: 'compositor', label: 'Compositor', icon: Users },
  { value: 'letrista', label: 'Letrista', icon: Users },
  { value: 'productor', label: 'Productor', icon: Users },
  { value: 'interprete', label: 'Intérprete', icon: Users },
  { value: 'sello', label: 'Sello', icon: Building },
  { value: 'editorial', label: 'Editorial', icon: Building },
  { value: 'colaborador', label: 'Colaboradores', icon: Mic },
  { value: 'otro', label: 'Otros', icon: Tag },
];

/**
 * Catálogo estándar de roles funcionales que un miembro del equipo puede desempeñar
 * (independiente de su rol de workspace). Usado en el selector "Editar rol funcional".
 */
export const FUNCTIONAL_ROLES: string[] = [
  'Mánager Personal',
  'Business Manager',
  'Director Artístico',
  'Booker',
  'Booking Agent',
  'Tour Manager',
  'Road Manager',
  'A&R',
  'Productor',
  'Productor Ejecutivo',
  'Compositor',
  'Letrista',
  'Intérprete',
  'Músico de Banda',
  'Técnico de Sonido',
  'Técnico de Luces',
  'Backliner',
  'Comunicación / Prensa',
  'Marketing Digital',
  'Community Manager',
  'Diseñador Gráfico',
  'Fotógrafo',
  'Videógrafo',
  'Asesor Legal',
  'Asesor Fiscal',
  'Sello Discográfico',
  'Editorial',
  'Distribuidor',
  'Promotor',
];

export const getTeamCategoryLabel = (value: string, customCategories: TeamCategoryOption[] = []): string => {
  const allCategories = [...TEAM_CATEGORIES, ...customCategories];
  return allCategories.find(c => c.value === value)?.label || value;
};

export const getTeamCategoryIcon = (value: string, customCategories: TeamCategoryOption[] = []) => {
  const allCategories = [...TEAM_CATEGORIES, ...customCategories];
  return allCategories.find(c => c.value === value)?.icon || Tag;
};
