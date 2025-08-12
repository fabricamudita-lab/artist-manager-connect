import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, FolderOpen } from "lucide-react";
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
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.name.toLowerCase().includes(q) || (it.artist_name || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
          <Button onClick={() => setOpenCreate(true)}>
            Nuevo proyecto
          </Button>
        </div>
      </header>

      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vista general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative md:w-1/2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o artista"
                  className="pl-9"
                />
              </div>
              <div className="md:w-56">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
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

            {/* Lista */}
            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando…</div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground border rounded-lg p-6">
                <FolderOpen className="w-5 h-5" />
                No hay proyectos con esos criterios.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-4">Proyecto</th>
                      <th className="py-2 pr-4">Artista</th>
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2 pr-4">Inicio</th>
                      <th className="py-2 pr-4">Fin estimado</th>
                      <th className="py-2 pr-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-3 pr-4 font-medium">{p.name}</td>
                        <td className="py-3 pr-4">{p.artist_name || '—'}</td>
                        <td className="py-3 pr-4 capitalize">{p.status.replace('_', ' ')}</td>
                        <td className="py-3 pr-4">{p.start_date || '—'}</td>
                        <td className="py-3 pr-4">{p.end_date_estimada || '—'}</td>
                        <td className="py-3 pr-0 text-right">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${p.id}`)}>
                            Ver detalle
                          </Button>
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
        setStatus((s) => s);
      }} />
    </div>
  );
}
