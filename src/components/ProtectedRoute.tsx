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
  projectId,
  artistId,
  workspaceId,
  requiredAction = 'VIEW_PROJECT',
  fallbackPath = '/403'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function checkPermissions() {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        if (projectId) {
          const canView = await canViewProject(user.id, projectId);
          setHasPermission(canView);
        } else {
          // For now, allow access if no specific resource is specified
          setHasPermission(true);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermission(false);
      } finally {
        setChecking(false);
      }
    }

    if (!loading) {
      checkPermissions();
    }
  }, [user, loading, projectId, artistId, workspaceId, requiredAction]);

  // Show loading state
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Show 403 if no permission
  if (hasPermission === false) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Render children if all checks pass
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