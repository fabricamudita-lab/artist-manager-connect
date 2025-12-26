import { Users, UserCheck, Building, Mail, Shield, Tag } from 'lucide-react';

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
  { value: 'otro', label: 'Otros', icon: Tag },
];

export const getTeamCategoryLabel = (value: string, customCategories: TeamCategoryOption[] = []): string => {
  const allCategories = [...TEAM_CATEGORIES, ...customCategories];
  return allCategories.find(c => c.value === value)?.label || value;
};

export const getTeamCategoryIcon = (value: string, customCategories: TeamCategoryOption[] = []) => {
  const allCategories = [...TEAM_CATEGORIES, ...customCategories];
  return allCategories.find(c => c.value === value)?.icon || Tag;
};
