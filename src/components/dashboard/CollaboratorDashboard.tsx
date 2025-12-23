import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Music, 
  FolderOpen, 
  Calendar, 
  ArrowRight,
  DollarSign,
  Mic
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AssignedArtist {
  id: string;
  name: string;
  stage_name: string | null;
  bookingsCount: number;
  projectsCount: number;
}

interface AssignedProject {
  id: string;
  name: string;
  status: string;
  artist_name?: string;
}

export function CollaboratorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedArtists, setAssignedArtists] = useState<AssignedArtist[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<AssignedProject[]>([]);

  useEffect(() => {
    if (user) {
      fetchAssignedData();
    }
  }, [user]);

  const fetchAssignedData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch artists where user has role bindings
      const { data: artistBindings } = await supabase
        .from('artist_role_bindings')
        .select('artist_id')
        .eq('user_id', user.id);

      const artistIds = artistBindings?.map(b => b.artist_id) || [];

      if (artistIds.length > 0) {
        const { data: artistsData } = await supabase
          .from('artists')
          .select('id, name, stage_name')
          .in('id', artistIds);

        // Get stats for each artist
        const artistsWithStats = await Promise.all(
          (artistsData || []).map(async (artist) => {
            const { count: bookingsCount } = await supabase
              .from('booking_offers')
              .select('*', { count: 'exact', head: true })
              .eq('artist_id', artist.id);

            const { count: projectsCount } = await supabase
              .from('projects')
              .select('*', { count: 'exact', head: true })
              .eq('artist_id', artist.id);

            return {
              ...artist,
              bookingsCount: bookingsCount || 0,
              projectsCount: projectsCount || 0
            };
          })
        );

        setAssignedArtists(artistsWithStats);
      }

      // Fetch projects where user has role bindings
      const { data: projectBindings } = await supabase
        .from('project_role_bindings')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = projectBindings?.map(b => b.project_id) || [];

      if (projectIds.length > 0) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select(`
            id, 
            name, 
            status,
            artist_id
          `)
          .in('id', projectIds)
          .eq('is_folder', false);

        // Get artist names
        const artistIdsFromProjects = [...new Set(projectsData?.map(p => p.artist_id).filter(Boolean))];
        let artistsMap: Record<string, string> = {};

        if (artistIdsFromProjects.length > 0) {
          const { data: artistsData } = await supabase
            .from('artists')
            .select('id, name, stage_name')
            .in('id', artistIdsFromProjects);

          artistsData?.forEach(a => {
            artistsMap[a.id] = a.stage_name || a.name;
          });
        }

        setAssignedProjects(
          (projectsData || []).map(p => ({
            ...p,
            artist_name: p.artist_id ? artistsMap[p.artist_id] : undefined
          }))
        );
      }

    } catch (error) {
      console.error('Error fetching assigned data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar tus asignaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const hasAssignments = assignedArtists.length > 0 || assignedProjects.length > 0;

  if (!hasAssignments) {
    return (
      <Card className="p-12 text-center">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin asignaciones</h3>
        <p className="text-muted-foreground mb-4">
          Aún no tienes artistas o proyectos asignados.
        </p>
        <p className="text-sm text-muted-foreground">
          Contacta con el administrador para obtener acceso.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl border p-6">
        <h2 className="text-xl font-semibold mb-2">Tu Espacio de Trabajo</h2>
        <p className="text-muted-foreground">
          Artistas y proyectos a los que tienes acceso
        </p>
      </div>

      {/* Assigned Artists */}
      {assignedArtists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Mis Artistas
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignedArtists.map((artist) => (
              <Card
                key={artist.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/artist/${artist.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(artist.stage_name || artist.name).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{artist.stage_name || artist.name}</CardTitle>
                      {artist.stage_name && (
                        <CardDescription>{artist.name}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <span>{artist.bookingsCount} shows</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{artist.projectsCount} proyectos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Assigned Projects */}
      {assignedProjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Mis Proyectos
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignedProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {project.artist_name && (
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Music className="h-3 w-3" />
                          {project.artist_name}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={project.status === 'en_curso' ? 'default' : 'secondary'}>
                      {project.status === 'en_curso' ? 'En curso' : project.status}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4 mr-2" />
              Ver Calendario
            </Button>
            <Button variant="outline" onClick={() => navigate('/solicitudes')}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Mis Solicitudes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
