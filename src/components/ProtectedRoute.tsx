import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canViewProject } from '@/lib/authz/helpers';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  projectId?: string;
  artistId?: string;
  workspaceId?: string;
  requiredAction?: string;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  // Auth bypass: allow all visitors to access every route
  return <>{children}</>;
}

// 403 Forbidden Page Component
export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Shield className="h-16 w-16 mx-auto text-destructive" />
        </div>
        <h1 className="text-4xl font-bold mb-4">403</h1>
        <h2 className="text-xl font-semibold mb-4">Acceso Denegado</h2>
        <p className="text-muted-foreground mb-6">
          No tienes permisos para acceder a este recurso. Si crees que esto es un error, 
          contacta con tu administrador.
        </p>
        <div className="space-y-2">
          <Button asChild variant="default">
            <a href="/dashboard">Volver al Dashboard</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/">Ir al Inicio</a>
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Modo Desarrollo:</strong> Usa el Role Switcher para probar con diferentes permisos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}