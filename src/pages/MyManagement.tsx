import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Music, Calendar, Plus, 
  Building2, FolderOpen, ArrowRight, Film 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateArtistDialog } from '@/components/management/CreateArtistDialog';

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  description: string | null;
  created_at: string;
}

export default function MyManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateArtist, setShowCreateArtist] = useState(false);

  const { data: artists = [], refetch: refetchArtists } = useQuery({
    queryKey: ['management-artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Artist[];
    },
  });

  const { data: upcomingBookings = 0 } = useQuery({
    queryKey: ['management-bookings-count'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('booking_offers')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', today);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: activeProjects = 0 } = useQuery({
    queryKey: ['management-projects-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'en_curso');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: syncOffers = 0 } = useQuery({
    queryKey: ['management-sync-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sync_offers')
        .select('*', { count: 'exact', head: true })
        .not('phase', 'eq', 'facturado');
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = [
    { label: 'Artistas', value: artists.length, icon: Music, color: 'text-purple-500', onClick: undefined },
    { label: 'Shows próximos', value: upcomingBookings, icon: Calendar, color: 'text-green-500', onClick: () => navigate('/booking') },
    { label: 'Proyectos activos', value: activeProjects, icon: FolderOpen, color: 'text-orange-500', onClick: () => navigate('/proyectos') },
    { label: 'Sincronizaciones', value: syncOffers, icon: Film, color: 'text-pink-500', onClick: () => navigate('/sincronizaciones') },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            00 Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Dashboard de tu empresa de management
          </p>
        </div>
        <Button onClick={() => setShowCreateArtist(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Artista
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card 
            key={stat.label} 
            className={stat.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
            onClick={stat.onClick}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roster de Artistas */}
      <div className="space-y-4">
        {artists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin artistas</h3>
              <p className="text-muted-foreground mb-4">
                Añade tu primer artista para comenzar
              </p>
              <Button onClick={() => setShowCreateArtist(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Artista
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.map((artist) => (
              <Card 
                key={artist.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/artistas/${artist.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(artist.stage_name || artist.name).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {artist.stage_name || artist.name}
                      </CardTitle>
                      {artist.stage_name && (
                        <CardDescription className="truncate">
                          {artist.name}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {artist.description || 'Sin descripción'}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Artista</Badge>
                    <Button variant="ghost" size="sm">
                      Ver perfil <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateArtistDialog 
        open={showCreateArtist} 
        onOpenChange={setShowCreateArtist}
        onSuccess={() => {
          refetchArtists();
          setShowCreateArtist(false);
        }}
      />
    </div>
  );
}
