import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getModule } from '@/lib/permissions/catalog';
import type { ModuleKey, PermissionLevel } from '@/lib/permissions/types';

interface ForbiddenViewProps {
  module: ModuleKey;
  required?: PermissionLevel;
}

/**
 * Pantalla de bloqueo cuando el usuario no tiene el permiso funcional necesario
 * para entrar a un hub. Mantiene la app navegable: ofrece volver al Dashboard
 * y enlaza con la información de roles.
 */
export function ForbiddenView({ module, required = 'view' }: ForbiddenViewProps) {
  const mod = getModule(module);
  const verbo =
    required === 'view' ? 'ver' : required === 'edit' ? 'editar' : 'gestionar';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5 bg-card border rounded-2xl p-8 shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            No tienes acceso a {mod.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu rol funcional actual no te permite {verbo}{' '}
            <span className="font-medium text-foreground">{mod.label.toLowerCase()}</span>.
            Pide al responsable de tu workspace que ajuste tus permisos.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild variant="default" size="sm">
            <Link to="/dashboard">Ir al Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/teams/roles">Ver matriz de roles</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
