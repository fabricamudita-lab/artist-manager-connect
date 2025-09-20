import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import ComprehensiveDashboard from '@/components/ComprehensiveDashboard';
import { PermissionChip } from '@/components/PermissionChip';
import { Loader2, Calendar, PieChart, Music, Users, TrendingUp } from 'lucide-react';
import { PageHeader, QuickAction } from '@/components/ui/page-header';
import { PageContainer } from '@/components/ui/responsive-container';

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
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={`Bienvenido, ${profile.full_name} (${profile.active_role === 'artist' ? 'Artista' : 'Management'})`}
        breadcrumbs={[
          { label: 'Dashboard' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <PermissionChip />
            <QuickAction icon={<Calendar className="h-4 w-4" />} variant="outline">
              Nuevo Evento
            </QuickAction>
            <QuickAction icon={<PieChart className="h-4 w-4" />}>
              Crear Presupuesto
            </QuickAction>
          </div>
        }
      />
      <div className="mt-8">
        <ComprehensiveDashboard />
      </div>
    </PageContainer>
  );
}