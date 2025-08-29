import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, FolderOpen, Trash2, MoreHorizontal, Calendar, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import CreateProjectDialog from "@/components/CreateProjectDialog";
import { ProjectProgressDisplay } from "@/components/ProjectProgressDisplay";

interface ProjectListItem {
  id: string;
  name: string;
  status: 'en_curso' | 'finalizado' | 'archivado';
  start_date: string | null;
  end_date_estimada: string | null;
  artist_name?: string | null;
}

export default function Projects() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteProject, setDeleteProject] = useState<ProjectListItem | null>(null);
  const [viewMode, setViewMode] = useState<'estados' | 'porcentajes'>('estados');

  // SEO: title, meta, canonical
  useEffect(() => {
    document.title = "Proyectos | MOODITA";
    const description = "Gestión centralizada de proyectos: presupuestos, documentos, contratos y solicitudes vinculadas.";

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        let queryBuilder = supabase
          .from('projects')
          .select(`id,name,status,start_date,end_date_estimada, profiles:artist_id ( full_name )`)
          .order('created_at', { ascending: false });

        if (status !== 'todos') {
          queryBuilder = queryBuilder.eq('status', status as any);
        }

        const { data, error } = await queryBuilder;
        if (error) throw error;

        const mapped: ProjectListItem[] = (data as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          start_date: p.start_date,
          end_date_estimada: p.end_date_estimada,
          artist_name: p.profiles?.full_name ?? null,
        }));

        setItems(mapped);
      } catch (e) {
        console.error('Error loading projects', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [status, refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.name.toLowerCase().includes(q) || (it.artist_name || '').toLowerCase().includes(q)
    );
  }, [items, query]);


  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deleteProject.id);
        
      if (error) throw error;
      
      toast({
        title: "Proyecto eliminado",
        description: `El proyecto "${deleteProject.name}" ha sido eliminado correctamente.`,
      });
      
      setRefreshKey(k => k + 1);
      setDeleteProject(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <main className="space-y-8">
        {/* Hero Section */}
        <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl border p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Proyectos</h1>
              <p className="text-muted-foreground">
                Gestión centralizada de proyectos: presupuestos, documentos, contratos y solicitudes vinculadas.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="shadow-sm">
                <Filter className="w-4 h-4 mr-2" /> Filtros
              </Button>
              <Button onClick={() => setOpenCreate(true)} className="shadow-sm">
                Nuevo proyecto
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o artista"
                className="pl-9 bg-background/50 backdrop-blur-sm"
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="en_curso">En curso</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-40">
              <Select value={viewMode} onValueChange={(value: 'estados' | 'porcentajes') => setViewMode(value)}>
                <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estados">Ver Estados</SelectItem>
                  <SelectItem value="porcentajes">Ver Porcentajes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Projects Grid */}
        <section>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Cargando proyectos...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2">No hay proyectos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {query ? 'No se encontraron proyectos con esos criterios.' : 'Crea tu primer proyecto para comenzar.'}
              </p>
              {!query && (
                <Button onClick={() => setOpenCreate(true)} size="sm">
                  Crear proyecto
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <Card 
                  key={p.id} 
                  className="border hover:border-primary/20 transition-all duration-200 hover:shadow-lg cursor-pointer group"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </CardTitle>
                        {p.artist_name && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="truncate">{p.artist_name}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteProject(p);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <ProjectProgressDisplay 
                          projectId={p.id} 
                          viewMode={viewMode} 
                          status={p.status} 
                        />
                      </div>
                      
                      {/* Dates */}
                      <div className="space-y-2 text-sm">
                        {p.start_date && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Inicio: {new Date(p.start_date).toLocaleDateString('es-ES')}</span>
                          </div>
                        )}
                        {p.end_date_estimada && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Fin: {new Date(p.end_date_estimada).toLocaleDateString('es-ES')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        
        <CreateProjectDialog open={openCreate} onOpenChange={setOpenCreate} onSuccess={() => {
          // Refrescar lista al crear
          setRefreshKey((k) => k + 1);
        }} />

        <AlertDialog open={!!deleteProject} onOpenChange={() => setDeleteProject(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El proyecto "{deleteProject?.name}" y todos sus datos asociados serán eliminados permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </TooltipProvider>
  );
}
