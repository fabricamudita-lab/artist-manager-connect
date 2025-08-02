import { useAuth } from '@/hooks/useAuth';
import ArtistDashboard from '@/components/ArtistDashboard';
import ManagementDashboard from '@/components/ManagementDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return null; // AuthProvider will redirect to auth page
  }

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