import { useAuth } from '@/hooks/useAuth';
import ArtistDashboard from '@/components/ArtistDashboard';
import ManagementDashboard from '@/components/ManagementDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  console.log('Dashboard - Profile:', profile, 'Loading:', loading);

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
    <div className="min-h-screen bg-background">
      {profile.role === 'artist' ? (
        <ArtistDashboard />
      ) : (
        <ManagementDashboard />
      )}
    </div>
  );
}