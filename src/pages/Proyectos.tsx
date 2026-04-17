import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectSettingsDialog, DEFAULT_CARD_CONFIG, type CardDisplayConfig } from '@/components/ProjectSettingsDialog';
import { 
  FolderOpen, 
  Search, 
  Music, 
  DollarSign, 
  FileText, 
  Disc3,
  MessageSquare,
  ChevronRight,
  Plus,
  ArrowUpDown,
  Settings
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  archivado: 'Archivado',
};

const STATUS_COLORS: Record<string, string> = {
  en_curso: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  finalizado: 'bg-green-500/10 text-green-700 dark:text-green-400',
  archivado: 'bg-muted text-muted-foreground',
};

export default function Proyectos() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArtist, setFilterArtist] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Proyectos | MOODITA";
  }, []);

  // Fetch artists for filter
  const { data: artists } = useQuery({
    queryKey: ['proyectos-artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['proyectos-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, artist_id, status, created_at, start_date, end_date_estimada, card_display_config')
        .is('parent_folder_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

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
        artist: p.artist_id ? artistsMap[p.artist_id] : null,
      }));
    },
  });

  // Fetch stats for projects
  const { data: projectStats } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const stats: Record<string, { budgets: number; documents: number; solicitudes: number; epks: number; releases: number; bookings: number }> = {};

      const [{ data: budgets }, { data: documents }, { data: solicitudes }, { data: epks }, { data: releases }, { data: bookings }] = await Promise.all([
        supabase.from('budgets').select('project_id'),
        supabase.from('project_files').select('project_id'),
        supabase.from('solicitudes').select('project_id'),
        supabase.from('epks').select('proyecto_id'),
        supabase.from('releases').select('project_id'),
        supabase.from('booking_offers').select('project_id'),
      ]);

      budgets?.forEach(b => {
        if (b.project_id) {
          if (!stats[b.project_id]) stats[b.project_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0, releases: 0, bookings: 0 };
          stats[b.project_id].budgets++;
        }
      });
      documents?.forEach(d => {
        if (d.project_id) {
          if (!stats[d.project_id]) stats[d.project_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0, releases: 0, bookings: 0 };
          stats[d.project_id].documents++;
        }
      });
      solicitudes?.forEach(s => {
        if (s.project_id) {
          if (!stats[s.project_id]) stats[s.project_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0, releases: 0, bookings: 0 };
          stats[s.project_id].solicitudes++;
        }
      });
      epks?.forEach(e => {
        if (e.proyecto_id) {
          if (!stats[e.proyecto_id]) stats[e.proyecto_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0, releases: 0, bookings: 0 };
          stats[e.proyecto_id].epks++;
        }
      });
      releases?.forEach(r => {
        if ((r as any).project_id) {
          const pid = (r as any).project_id;
          if (!stats[pid]) stats[pid] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0, releases: 0, bookings: 0 };
          stats[pid].releases++;
        }
      });
      bookings?.forEach(b => {
        if (b.project_id) {
          if (!stats[b.project_id]) stats[b.project_id] = { budgets: 0, documents: 0, solicitudes: 0, epks: 0, releases: 0, bookings: 0 };
          stats[b.project_id].bookings++;
        }
      });

      return stats;
    },
  });

  const filteredProjects = projects
    ?.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesArtist = filterArtist === 'all' || p.artist_id === filterArtist;
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesArtist && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl border p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Proyectos</h1>
              <p className="text-muted-foreground">
                Gestiona todos tus proyectos en un solo lugar
              </p>
            </div>
            <Button onClick={() => navigate('/projects')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterArtist} onValueChange={setFilterArtist}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Artista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los artistas</SelectItem>
                {artists?.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.stage_name || a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="en_curso">En curso</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="archivado">Archivado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              title={sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Projects Grid */}
        {isLoading ? (
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
              {searchTerm || filterArtist !== 'all' || filterStatus !== 'all'
                ? 'No se encontraron proyectos con esos filtros'
                : 'Crea un proyecto para organizar tu trabajo'}
            </p>
            <Button onClick={() => navigate('/projects')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Proyecto
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects?.map(project => {
              const stats = projectStats?.[project.id] || { budgets: 0, documents: 0, solicitudes: 0, epks: 0, releases: 0, bookings: 0 };
              const artistName = project.artist?.stage_name || project.artist?.name;
              const statusKey = project.status || 'en_curso';
              const cfg: CardDisplayConfig = {
                ...DEFAULT_CARD_CONFIG,
                ...((project as any).card_display_config || {}),
              };

              return (
                <Card
                  key={project.id}
                  className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 shrink-0 text-amber-500" />
                          <span className="truncate">{project.name}</span>
                        </CardTitle>
                        {artistName && (
                          <CardDescription className="flex items-center gap-1">
                            <Music className="h-3 w-3" />
                            {artistName}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={STATUS_COLORS[statusKey]}>
                          {STATUS_LABELS[statusKey] || statusKey}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setSettingsProjectId(project.id); }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cfg.show_description && project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Stats Grid — only visible items */}
                    {(cfg.show_releases || cfg.show_budgets || cfg.show_events) && (
                      <div className="grid grid-cols-3 gap-2">
                        {cfg.show_releases && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Disc3 className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Lanzamientos</p>
                              <p className="font-semibold">{stats.releases}</p>
                            </div>
                          </div>
                        )}
                        {cfg.show_budgets && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Presupuestos</p>
                              <p className="font-semibold">{stats.budgets}</p>
                            </div>
                          </div>
                        )}
                        {cfg.show_events && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Music className="h-4 w-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Eventos</p>
                              <p className="font-semibold">{stats.bookings}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total items */}
                    <div className="pt-2 border-t">
                     <Badge variant="secondary" className="text-xs">
                        {stats.budgets + stats.documents + stats.solicitudes + stats.releases + stats.bookings} elementos
                       </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Settings Dialog */}
        {settingsProjectId && (() => {
          const proj = filteredProjects?.find(p => p.id === settingsProjectId);
          if (!proj) return null;
          const cfg: CardDisplayConfig = { ...DEFAULT_CARD_CONFIG, ...((proj as any).card_display_config || {}) };
          return (
            <ProjectSettingsDialog
              open={!!settingsProjectId}
              onOpenChange={(open) => { if (!open) setSettingsProjectId(null); }}
              projectId={proj.id}
              projectName={proj.name}
              config={cfg}
            />
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
