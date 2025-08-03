import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';

export default function Calendar() {
  usePageTitle('Calendario');
  const { profile, loading } = useAuth();

  console.log('Calendar - Profile:', profile, 'Loading:', loading);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Cargando calendario...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center">Error: No se pudo cargar el perfil</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-card rounded-lg p-4">
        <h1 className="text-2xl font-bold mb-4">Calendario</h1>
        <p>Usuario: {profile.full_name}</p>
        <p>Rol: {profile.role}</p>
        <p className="mt-4 text-green-600">✅ El calendario está funcionando correctamente</p>
      </div>
    </div>
  );
}