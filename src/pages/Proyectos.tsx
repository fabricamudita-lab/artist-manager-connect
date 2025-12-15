import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  FolderOpen, 
  Search, 
  Music, 
  Calendar, 
  DollarSign, 
  FileText, 
  Disc3,
  Mic,
  MessageSquare,
  ChevronRight,
  Plus
} from 'lucide-react';

export default function Proyectos() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('artists');

  useEffect(() => {
    document.title = "Proyectos | MOODITA";
  }, []);

  // Fetch artists with their stats
  const { data: artists, isLoading: loadingArtists } = useQuery({
    queryKey: ['proyectos-artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, description, workspace_id')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects (folders)
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['proyectos-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, 
          name, 
          description, 
          artist_id,
          created_at
        `)
        .is('parent_folder_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch artist names separately
      const artistIds = [...new Set(data?.map(p => p.artist_id).filter(Boolean))];
      let artistsMap: Record<string, { name: string; stage_name: string | null }> = {};
      
      if (artistIds.length > 0) {
        const { data: artistsData } = await supabase
          .from('artists')
          .select('id, name, stage_name')
          .in('id', artistIds);
        
        artistsData?.forEach(a => {
          artistsMap[a.id] = { name: a.name, stage_name: a.stage_name };
        });
      }
      
      return (data || []).map(p => ({
        ...p,
        artist: p.artist_id ? artistsMap[p.artist_id] : null
      }));
    },
  });

  // Fetch stats for artists
  const { data: artistStats } = useQuery({
    queryKey: ['artist-stats'],
    queryFn: async () => {
      const stats: Record<string, { bookings: number; budgets: number; epks: number; releases: number }> = {};
      
      // Get bookings count per artist
      const { data: bookings } = await supabase
        .from('booking_offers')
        .select('artist_id');
      
      // Get budgets count per artist  
      const { data: budgets } = await supabase
        .from('budgets')
        .select('artist_id');

      // Get EPKs count (using proyecto_id linked to artist)
      const { data: epks } = await supabase
        .from('epks')
        .select('id, proyecto_id');

      // Get releases count per artist
      const { data: releases } = await supabase
        .from('releases')
        .select('artist_id');

      // Aggregate stats
      bookings?.forEach(b => {
        if (b.artist_id) {
          if (!stats[b.artist_id]) stats[b.artist_id] = { bookings: 0, budgets: 0, epks: 0, releases: 0 };
          stats[b.artist_id].bookings++;
        }
      });

      budgets?.forEach(b => {
        if (b.artist_id) {
          if (!stats[b.artist_id]) stats[b.artist_id] = { bookings: 0, budgets: 0, epks: 0, releases: 0 };
          stats[b.artist_id].budgets++;
        }
      });

      releases?.forEach(r => {
        if (r.artist_id) {
          if (!stats[r.artist_id]) stats[r.artist_id] = { bookings: 0, budgets: 0, epks: 0, releases: 0 };
          stats[r.artist_id].releases++;
        }
      });

      return stats;
    },
  });

  // Fetch stats for projects
  const { data: projectStats } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const stats: Record<string, { budgets: number; documents: number; solicitudes: number; epks: number }> = {};
      
      const { data: budgets } = await supabase
        .from('budgets')
        .select('project_id');

      const { data: documents } = await supabase
        .from('project_files')
        .select('project_id');

      const { data: solicitudes } = await supabase
        .from('solicitudes')
        .select('project_id');

      const { data: epks } = await supabase
        .from('epks')
        .select('proyecto_id');

      budgets?.forEach(b => {
        if (b.project_id) {
          if (!stats[b.project_id]) stats[b.project_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0 };
          stats[b.project_id].budgets++;
        }
      });

      documents?.forEach(d => {
        if (d.project_id) {
          if (!stats[d.project_id]) stats[d.project_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0 };
          stats[d.project_id].documents++;
        }
      });

      solicitudes?.forEach(s => {
        if (s.project_id) {
          if (!stats[s.project_id]) stats[s.project_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0 };
          stats[s.project_id].solicitudes++;
        }
      });

      epks?.forEach(e => {
        if (e.proyecto_id) {
          if (!stats[e.proyecto_id]) stats[e.proyecto_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0 };
          stats[e.proyecto_id].epks++;
        }
      });

      return stats;
    },
  });

  const filteredArtists = artists?.filter(artist => 
    artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    artist.stage_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects?.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl border p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Proyectos</h1>
              <p className="text-muted-foreground">
                Organiza tus archivos por artistas o por proyectos
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artistas o proyectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </header>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="artists" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Por Artistas
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Por Proyectos
            </TabsTrigger>
          </TabsList>

          {/* Artists View */}
          <TabsContent value="artists" className="space-y-6">
            {loadingArtists ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredArtists?.length === 0 ? (
              <Card className="p-12 text-center">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay artistas</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No se encontraron artistas con ese nombre' : 'Añade artistas desde la sección de Contactos'}
                </p>
                <Button variant="outline" onClick={() => navigate('/contacts')}>
                  Ir a Contactos
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArtists?.map(artist => {
                  const stats = artistStats?.[artist.id] || { bookings: 0, budgets: 0, epks: 0, releases: 0 };
                  
                  return (
                    <Card key={artist.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {artist.stage_name || artist.name}
                            </CardTitle>
                            {artist.stage_name && artist.name !== artist.stage_name && (
                              <CardDescription>{artist.name}</CardDescription>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-primary/10">
                            <Music className="h-3 w-3 mr-1" />
                            Artista
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {artist.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {artist.description}
                          </p>
                        )}
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Mic className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Bookings</p>
                              <p className="font-semibold">{stats.bookings}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Presupuestos</p>
                              <p className="font-semibold">{stats.budgets}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Disc3 className="h-4 w-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Releases</p>
                              <p className="font-semibold">{stats.releases}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">EPKs</p>
                              <p className="font-semibold">{stats.epks}</p>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/booking?artist=${artist.id}`);
                            }}
                          >
                            <Mic className="h-3 w-3 mr-1" />
                            Booking
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/calendar?artist=${artist.id}`);
                            }}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Calendario
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/releases?artist=${artist.id}`);
                            }}
                          >
                            <Disc3 className="h-3 w-3 mr-1" />
                            Discografía
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Projects View */}
          <TabsContent value="projects" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => navigate('/projects')}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Carpeta
              </Button>
            </div>

            {loadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProjects?.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No se encontraron proyectos con ese nombre' : 'Crea un proyecto para agrupar tus documentos'}
                </p>
                <Button onClick={() => navigate('/projects')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Proyecto
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects?.map(project => {
                  const stats = projectStats?.[project.id] || { budgets: 0, documents: 0, solicitudes: 0, epks: 0 };
                  const artistName = project.artist?.stage_name || project.artist?.name;
                  
                  return (
                    <Card 
                      key={project.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                              <FolderOpen className="h-5 w-5 text-amber-500" />
                              {project.name}
                            </CardTitle>
                            {artistName && (
                              <CardDescription className="flex items-center gap-1 mt-1">
                                <Music className="h-3 w-3" />
                                {artistName}
                              </CardDescription>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Presupuestos</p>
                              <p className="font-semibold">{stats.budgets}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Documentos</p>
                              <p className="font-semibold">{stats.documents}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <MessageSquare className="h-4 w-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Solicitudes</p>
                              <p className="font-semibold">{stats.solicitudes}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Disc3 className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">EPKs</p>
                              <p className="font-semibold">{stats.epks}</p>
                            </div>
                          </div>
                        </div>

                        {/* Total items badge */}
                        <div className="pt-2 border-t">
                          <Badge variant="secondary" className="text-xs">
                            {stats.budgets + stats.documents + stats.solicitudes + stats.epks} elementos
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
