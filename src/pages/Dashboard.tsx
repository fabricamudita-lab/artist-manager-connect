import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import ArtistDashboard from '@/components/ArtistDashboard';
import ManagementDashboard from '@/components/ManagementDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { profile, loading } = useAuth();

  console.log('Dashboard - Profile:', profile, 'Loading:', loading);
  console.log('Dashboard - Profile active role:', profile?.active_role);
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

  console.log('Dashboard - Rendering dashboard for role:', profile.active_role);

  return (
    <div className="p-6">
      <div className="card-professional p-6 mb-6 bg-gradient-hero text-white">
        <h2 className="text-2xl font-playfair font-bold mb-2">
          ¡Bienvenido a MOODITA! 🎵
        </h2>
        <p className="text-white/90">Perfil: {profile.full_name}</p>
        <p className="text-white/80">Rol: {profile.active_role === 'artist' ? 'Artista' : 'Management'}</p>
      </div>
      {profile.active_role === 'artist' ? (
        <ArtistDashboard />
      ) : (
        <ManagementDashboard />
      )}
    </div>
  );
}