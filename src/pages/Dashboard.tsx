import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { OwnerDashboard } from '@/components/dashboard/OwnerDashboard';
import { CollaboratorDashboard } from '@/components/dashboard/CollaboratorDashboard';
import { Badge } from '@/components/ui/badge';
import TestUserSetup from '@/components/TestUserSetup';
import { Loader2, Crown, Music } from 'lucide-react';
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

  // Mock profile for unauthenticated visitors
  const displayProfile = profile ?? {
    full_name: 'Demo User',
    active_role: 'management' as const,
  };

  const isOwner = displayProfile.active_role === 'management';

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenido, {displayProfile.full_name} ({isOwner ? 'Management' : 'Artista'})
            </p>
          </div>
          <Badge variant={isOwner ? 'default' : 'secondary'} className="flex items-center gap-1.5">
            {isOwner ? <Crown className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
            {isOwner ? 'Manager' : 'Artista'}
          </Badge>
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