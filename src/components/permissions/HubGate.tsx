import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
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
 * para el módulo, muestra `ForbiddenView` en lugar del contenido.
 *
 * IMPORTANTE: durante la carga inicial NO renderiza los children para evitar
 * que un usuario sin permisos vea un "flash" de contenido protegido antes
 * de aplicarse el bloqueo.
 */
export function HubGate({ module, required = 'view', children }: HubGateProps) {
  const { can, loading, roleName } = useCan();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!can(module, required)) {
    return <ForbiddenView module={module} required={required} roleName={roleName} />;
  }
  return <>{children}</>;
}
