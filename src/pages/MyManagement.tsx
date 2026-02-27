import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Music, Calendar, Plus, 
  Building2, FolderOpen, ArrowRight, Film, Users, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateArtistDialog } from '@/components/management/CreateArtistDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  description: string | null;
  avatar_url: string | null;
  artist_type: string;
  created_at: string;
}

export default function MyManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createType, setCreateType] = useState<'roster' | 'collaborator' | null>(null);

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

  const rosterArtists = artists.filter(a => a.artist_type !== 'collaborator');
  const collaboratorArtists = artists.filter(a => a.artist_type === 'collaborator');

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
    { label: 'Artistas', value: rosterArtists.length, icon: Music, color: 'text-purple-500', onClick: undefined },
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreateType('roster')}>
              <Music className="h-4 w-4 mr-2" />
              Artista del roster
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCreateType('collaborator')}>
              <Users className="h-4 w-4 mr-2" />
              Colaborador
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      {/* Mi Roster */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Mi Roster</h2>
        {rosterArtists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin artistas</h3>
              <p className="text-muted-foreground mb-4">
                Añade tu primer artista para comenzar
              </p>
              <Button onClick={() => setCreateType('roster')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Artista
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rosterArtists.map((artist) => (
              <Card 
                key={artist.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/artistas/${artist.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {artist.avatar_url && <AvatarImage src={artist.avatar_url} alt={artist.stage_name || artist.name} />}
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

      {/* Colaboradores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Colaboradores
          </h2>
          <Button variant="outline" size="sm" onClick={() => setCreateType('collaborator')}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir colaborador
          </Button>
        </div>
        {collaboratorArtists.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Añade perfiles de artistas externos con los que colaboran tus artistas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {collaboratorArtists.map((artist) => (
              <Card 
                key={artist.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/artistas/${artist.id}`)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {artist.avatar_url && <AvatarImage src={artist.avatar_url} alt={artist.stage_name || artist.name} />}
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {(artist.stage_name || artist.name).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {artist.stage_name || artist.name}
                      </p>
                      <Badge variant="outline" className="text-xs mt-0.5">Colaborador</Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateArtistDialog 
        open={createType !== null} 
        onOpenChange={(open) => { if (!open) setCreateType(null); }}
        artistType={createType || 'roster'}
        onSuccess={() => {
          refetchArtists();
          setCreateType(null);
        }}
      />
    </div>
  );
}
