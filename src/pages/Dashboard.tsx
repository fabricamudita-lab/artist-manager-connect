import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import ArtistDashboard from '@/components/ArtistDashboard';
import ManagementDashboard from '@/components/ManagementDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { profile, loading } = useAuth();

  console.log('Dashboard - Profile:', profile, 'Loading:', loading);
  console.log('Dashboard - Profile role:', profile?.role);
  console.log('Dashboard - Should render:', !loading && profile);

  if (loading) {
    console.log('Dashboard - Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  if (!profile) {
    console.log('Dashboard - No profile found');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>No se pudo cargar el perfil de usuario.</p>
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  console.log('Dashboard - Rendering dashboard for role:', profile.role);

  return (
    <div className="p-6">
      <div className="bg-card rounded-lg p-4 mb-4">
        <h2 className="text-xl font-bold">Dashboard Funcionando</h2>
        <p>Perfil: {profile.full_name}</p>
        <p>Rol: {profile.role}</p>
      </div>
      {profile.role === 'artist' ? (
        <ArtistDashboard />
      ) : (
        <ManagementDashboard />
      )}
    </div>
  );
}