import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, Music, Calendar, TrendingUp, Plus, 
  Building2, UserPlus, FolderOpen, ArrowRight 
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

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  category: string | null;
}

export default function MyManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateArtist, setShowCreateArtist] = useState(false);

  // Fetch artists
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

  // Fetch management team (contacts without artist_id)
  const { data: managementTeam = [] } = useQuery({
    queryKey: ['management-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, role, email, category')
        .is('artist_id', null)
        .order('name');
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  // Fetch upcoming bookings count
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

  // Fetch active projects count
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

  const stats = [
    { label: 'Artistas', value: artists.length, icon: Music, color: 'text-purple-500' },
    { label: 'Equipo', value: managementTeam.length, icon: Users, color: 'text-blue-500' },
    { label: 'Shows próximos', value: upcomingBookings, icon: Calendar, color: 'text-green-500' },
    { label: 'Proyectos activos', value: activeProjects, icon: FolderOpen, color: 'text-orange-500' },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Mi Management
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
          <Card key={stat.label}>
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

      {/* Main Content */}
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster">Roster de Artistas</TabsTrigger>
          <TabsTrigger value="team">Equipo Management</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Equipo interno de tu empresa de management
            </p>
            <Button variant="outline" onClick={() => navigate('/contacts')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Gestionar en Contactos
            </Button>
          </div>

          {managementTeam.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin equipo</h3>
                <p className="text-muted-foreground mb-4">
                  Añade miembros a tu equipo de management
                </p>
                <Button variant="outline" onClick={() => navigate('/contacts')}>
                  Ir a Contactos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {managementTeam.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.role || 'Sin rol'}
                        </p>
                      </div>
                      {member.category && (
                        <Badge variant="outline" className="shrink-0">
                          {member.category}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
