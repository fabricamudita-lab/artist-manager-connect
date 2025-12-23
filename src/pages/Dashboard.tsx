import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { OwnerDashboard } from '@/components/dashboard/OwnerDashboard';
import { CollaboratorDashboard } from '@/components/dashboard/CollaboratorDashboard';
import { PermissionChip } from '@/components/PermissionChip';
import TestUserSetup from '@/components/TestUserSetup';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { profile, loading } = useAuth();
  const [showTestSetup, setShowTestSetup] = useState(false);

  // Show test setup if URL contains setup parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'test-users') {
      setShowTestSetup(true);
    }
  }, []);

  console.log('Dashboard - Profile:', profile, 'Loading:', loading);
  console.log('Dashboard - Profile active role:', profile?.active_role);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>No se pudo cargar el perfil de usuario.</p>
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Determine if user is Owner (management role) or Collaborator (artist role)
  const isOwner = profile.active_role === 'management';

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenido, {profile.full_name} ({isOwner ? 'Management' : 'Artista'})
            </p>
          </div>
          <PermissionChip />
        </div>
      </div>
      
      {showTestSetup && (
        <div className="mb-6">
          <TestUserSetup onComplete={() => setShowTestSetup(false)} />
        </div>
      )}
      
      {/* Role-based Dashboard View */}
      {isOwner ? <OwnerDashboard /> : <CollaboratorDashboard />}
    </div>
  );
}