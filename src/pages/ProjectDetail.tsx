import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import CreateBudgetDialog from "@/components/CreateBudgetDialog";
import { CreateSolicitudDialog } from "@/components/CreateSolicitudDialog";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CalendarDays, User, Paperclip } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  objective?: string | null;
  status: 'en_curso' | 'finalizado' | 'archivado';
  artist_id?: string | null;
  start_date?: string | null;
  end_date_estimada?: string | null;
  artist_name?: string | null;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<{ id: string; full_name: string; role: string | null }[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);

  const [openBudget, setOpenBudget] = useState(false);
  const [openSolicitud, setOpenSolicitud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data: proj, error } = await supabase
          .from('projects')
          .select(`id, name, description, objective, status, artist_id, start_date, end_date_estimada, profiles:artist_id ( full_name )`)
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!proj) return;
        const p: Project = {
          id: proj.id,
          name: proj.name,
          description: proj.description,
          objective: proj.objective,
          status: proj.status,
          artist_id: proj.artist_id,
          start_date: proj.start_date,
          end_date_estimada: proj.end_date_estimada,
          artist_name: proj.profiles?.full_name ?? null,
        };
        setProject(p);
        document.title = `${p.name} | Proyectos`;
      } catch (e) {
        console.error('Error project', e);
      }
    };

    const loadTeam = async () => {
      try {
        const { data, error } = await supabase
          .from('project_team')
          .select(`id, role, profile_id, profiles:profile_id ( full_name )`)
          .eq('project_id', id);
        if (error) throw error;
        setTeam((data || []).map((t: any) => ({ id: t.id, role: t.role, full_name: t.profiles?.full_name || '—' })));
      } catch (e) {
        console.error('Error team', e);
      }
    };

    const loadLinked = async () => {
      try {
        const [bRes, cRes, dRes, sRes] = await Promise.all([
          supabase.from('budgets').select('id, name, event_date, show_status').eq('project_id', id).order('created_at', { ascending: false }),
          supabase.from('contracts').select('id, title, status, file_path').eq('project_id', id).order('created_at', { ascending: false }),
          supabase.from('documents').select('id, title, file_url, category').eq('project_id', id).order('created_at', { ascending: false }),
          supabase.from('solicitudes').select('id, nombre_solicitante, estado, fecha_creacion').eq('project_id', id).order('fecha_creacion', { ascending: false }),
        ]);
        if (bRes.error) throw bRes.error;
        if (cRes.error) throw cRes.error;
        if (dRes.error) throw dRes.error;
        if (sRes.error) throw sRes.error;
        setBudgets(bRes.data || []);
        setContracts(cRes.data || []);
        setDocuments(dRes.data || []);
        setSolicitudes(sRes.data || []);
      } catch (e) {
        console.error('Error linked', e);
      }
    };

    load();
    loadTeam();
    loadLinked();
  }, [id]);

  const statusBadge = useMemo(() => {
    if (!project) return null;
    const txt = project.status.replace('_', ' ');
    return <Badge variant="outline" className="capitalize">{txt}</Badge>;
  }, [project]);

  const handleUploadContract = async (file: File) => {
    if (!id) return;
    try {
      const path = `${id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('contracts').insert({
        project_id: id,
        title: file.name,
        status: 'borrador',
        file_bucket: 'contracts',
        file_path: path,
        created_by: profile?.user_id,
      });
      if (insErr) throw insErr;
      toast({ title: 'Contrato subido', description: 'El contrato se ha añadido al proyecto' });
      // refresh contracts list
      const { data, error } = await supabase.from('contracts').select('id, title, status, file_path').eq('project_id', id).order('created_at', { ascending: false });
      if (!error) setContracts(data || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo subir el contrato', variant: 'destructive' });
    }
  };

  if (!project) {
    return <div className="text-sm text-muted-foreground">Cargando proyecto…</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {statusBadge}
            {project.artist_name && (
              <span className="inline-flex items-center gap-1"><User className="w-4 h-4" /> {project.artist_name}</span>
            )}
            {project.start_date && (
              <span className="inline-flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {project.start_date}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setOpenBudget(true)}>Crear presupuesto</Button>
          <Button variant="outline" onClick={() => setOpenSolicitud(true)}>Crear solicitud</Button>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUploadContract(f);
          }} />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Generar contrato (PDF)
          </Button>
        </div>
      </header>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.description && (
              <div>
                <div className="text-xs text-muted-foreground">Descripción</div>
                <p>{project.description}</p>
              </div>
            )}
            {project.objective && (
              <div>
                <div className="text-xs text-muted-foreground">Objetivo</div>
                <p>{project.objective}</p>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Equipo involucrado</div>
              {team.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aún no hay miembros asignados.</div>
              ) : (
                <ul className="text-sm list-disc pl-5">
                  {team.map((m) => (
                    <li key={m.id}>{m.full_name}{m.role ? ` — ${m.role}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Tabs defaultValue="presupuestos">
          <TabsList>
            <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
            <TabsTrigger value="notas">Notas internas</TabsTrigger>
          </TabsList>

          <TabsContent value="presupuestos">
            {budgets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay presupuestos vinculados.</div>
            ) : (
              <div className="space-y-2">
                {budgets.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-muted-foreground text-xs">{b.event_date || '—'} · {b.show_status}</div>
                    </div>
                    <Button variant="outline" size="sm">Abrir</Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documentos">
            {documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay documentos del proyecto.</div>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border rounded-md p-3">
                    <div className="text-sm inline-flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      <span className="font-medium">{d.title}</span>
                      <span className="text-xs text-muted-foreground">{d.category}</span>
                    </div>
                    <Button variant="outline" size="sm">Ver</Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contratos">
            {contracts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay contratos aún.</div>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
                    <div className="text-sm inline-flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">{c.title}</span>
                      <Badge variant="secondary" className="capitalize">{c.status}</Badge>
                    </div>
                    <Button variant="outline" size="sm">Descargar</Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="solicitudes">
            {solicitudes.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay solicitudes asociadas.</div>
            ) : (
              <div className="space-y-2">
                {solicitudes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium">{s.nombre_solicitante}</div>
                      <div className="text-xs text-muted-foreground">{s.estado} · {s.fecha_creacion ? new Date(s.fecha_creacion).toLocaleDateString() : '—'}</div>
                    </div>
                    <Button variant="outline" size="sm">Abrir</Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notas">
            <div className="text-sm text-muted-foreground">Usa “Documentos” o “Contratos” para adjuntar ficheros; próximamente añadiremos notas colaborativas.</div>
          </TabsContent>
        </Tabs>
      </section>

      <CreateBudgetDialog open={openBudget} onOpenChange={setOpenBudget} onSuccess={() => {}} projectId={project.id} />
      <CreateSolicitudDialog open={openSolicitud} onOpenChange={setOpenSolicitud} onSolicitudCreated={() => {}} projectId={project.id} />
    </div>
  );
}
