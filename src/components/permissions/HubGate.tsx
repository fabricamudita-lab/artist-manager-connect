import type { ReactNode } from 'react';
import { useCan } from '@/hooks/useFunctionalPermissions';
import type { ModuleKey, PermissionLevel } from '@/lib/permissions/types';
import { ForbiddenView } from './ForbiddenView';

interface HubGateProps {
  module: ModuleKey;
  required?: PermissionLevel;
  children: ReactNode;
}

/**
 * Envoltorio para hubs/páginas: si el usuario no tiene el permiso requerido
 * para el módulo, muestra `ForbiddenView` en lugar del contenido. Mientras
 * cargan los permisos, deja pasar el contenido para evitar parpadeos.
 */
export function HubGate({ module, required = 'view', children }: HubGateProps) {
  const { can, loading } = useCan();
  if (loading) return <>{children}</>;
  if (!can(module, required)) return <ForbiddenView module={module} required={required} />;
  return <>{children}</>;
}
