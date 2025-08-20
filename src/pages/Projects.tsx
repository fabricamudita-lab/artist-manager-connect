import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, FolderOpen, Trash2, MoreHorizontal } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import CreateProjectDialog from "@/components/CreateProjectDialog";

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
        </div>
      </header>

      {/* Projects List */}
      <section>
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg font-semibold">Vista general</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left font-medium text-muted-foreground py-4 px-6">Proyecto</th>
                      <th className="text-left font-medium text-muted-foreground py-4 px-6">Artista</th>
                      <th className="text-left font-medium text-muted-foreground py-4 px-6">Estado</th>
                      <th className="text-left font-medium text-muted-foreground py-4 px-6">Inicio</th>
                      <th className="text-left font-medium text-muted-foreground py-4 px-6">Fin estimado</th>
                      <th className="text-right font-medium text-muted-foreground py-4 px-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-foreground">{p.name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-muted-foreground">{p.artist_name || '—'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-primary/10 text-primary">
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-muted-foreground">{p.start_date || '—'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-muted-foreground">{p.end_date_estimada || '—'}</div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate(`/projects/${p.id}`)}
                              className="shadow-sm hover:shadow-md transition-shadow"
                            >
                              Ver detalle
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setDeleteProject(p)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
  );
}
