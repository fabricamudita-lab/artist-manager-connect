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
import BudgetDetailsDialog from "@/components/BudgetDetailsDialog";
import CreateBudgetDialog from "@/components/CreateBudgetDialog";
import { CreateSolicitudDialog } from "@/components/CreateSolicitudDialog";
import { Input } from "@/components/ui/input";
import { 
  Upload, 
  FileText, 
  CalendarDays, 
  User, 
  Paperclip, 
  Plus, 
  MoreHorizontal, 
  Target, 
  Users,
  Calendar,
  Download,
  Eye,
  ExternalLink,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [selectedBudget, setSelectedBudget] = useState(null);
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
          supabase.from('budgets').select('id, name, event_date, show_status, type, city, country, venue, budget_status, internal_notes, created_at, artist_id, event_time, fee, profiles:artist_id(full_name)').eq('project_id', id).order('created_at', { ascending: false }),
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'en_curso':
        return 'warning';
      case 'finalizado':
        return 'success';
      case 'archivado':
        return 'muted';
      default:
        return 'muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'en_curso':
        return <Clock className="w-3 h-3" />;
      case 'finalizado':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'archivado':
        return <FolderOpen className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

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

  const refreshBudgets = async () => {
    try {
      const { data, error } = await supabase.from('budgets').select('id, name, event_date, show_status, type, city, country, venue, budget_status, internal_notes, created_at, artist_id, event_time, fee, profiles:artist_id(full_name)').eq('project_id', id).order('created_at', { ascending: false });
      if (!error) setBudgets(data || []);
    } catch (e) {
      console.error('Error refreshing budgets', e);
    }
  };

  if (!project) {
    return <div className="text-sm text-muted-foreground">Cargando proyecto…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge variant={getStatusVariant(project.status)} className="gap-1">
                {getStatusIcon(project.status)}
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
              {project.artist_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{project.artist_name}</span>
                </div>
              )}
              {project.start_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Inicio: {new Date(project.start_date).toLocaleDateString()}</span>
                </div>
              )}
              {project.end_date_estimada && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Fin estimado: {new Date(project.end_date_estimada).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear nuevo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setOpenBudget(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Presupuesto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenSolicitud(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Solicitud
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Contrato (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUploadContract(f);
          }} />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Details */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Detalles del Proyecto</CardTitle>
            <Target className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {project.objective && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Objetivo</div>
                <p className="text-sm leading-relaxed">{project.objective}</p>
              </div>
            )}
            {project.description && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Descripción</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Equipo involucrado</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Aún no hay miembros asignados</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir miembro
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {team.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {member.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name}</p>
                      {member.role && (
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir miembro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Card>
        <Tabs defaultValue="presupuestos" className="w-full">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="presupuestos" className="text-xs sm:text-sm">
                Presupuestos
                {budgets.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                    {budgets.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs sm:text-sm">
                Documentos
                {documents.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                    {documents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="contratos" className="text-xs sm:text-sm">
                Contratos
                {contracts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                    {contracts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="solicitudes" className="text-xs sm:text-sm">
                Solicitudes
                {solicitudes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                    {solicitudes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="notas" className="text-xs sm:text-sm">Notas</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-0">
            <TabsContent value="presupuestos" className="mt-0">
              {budgets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No hay presupuestos</h3>
                  <p className="text-sm text-muted-foreground mb-4">Crea el primer presupuesto para este proyecto</p>
                  <Button onClick={() => setOpenBudget(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear presupuesto
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {budgets.map((budget) => (
                    <Card key={budget.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{budget.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {budget.event_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(budget.event_date).toLocaleDateString()}
                              </span>
                            )}
                            {budget.show_status && (
                              <Badge variant="outline" className="h-5 text-xs">
                                {budget.show_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedBudget(budget)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documentos" className="mt-0">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <Paperclip className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No hay documentos</h3>
                  <p className="text-sm text-muted-foreground mb-4">Sube documentos relacionados con este proyecto</p>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Subir documento
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-md">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">{doc.title}</h4>
                            <Badge variant="outline" className="h-5 text-xs mt-1">
                              {doc.category}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="contratos" className="mt-0">
              {contracts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No hay contratos</h3>
                  <p className="text-sm text-muted-foreground mb-4">Genera o sube contratos para este proyecto</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir contrato
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {contracts.map((contract) => (
                    <Card key={contract.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-md">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">{contract.title}</h4>
                            <Badge variant="outline" className="h-5 text-xs mt-1 capitalize">
                              {contract.status}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="solicitudes" className="mt-0">
              {solicitudes.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No hay solicitudes</h3>
                  <p className="text-sm text-muted-foreground mb-4">Crea solicitudes asociadas a este proyecto</p>
                  <Button onClick={() => setOpenSolicitud(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear solicitud
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {solicitudes.map((solicitud) => (
                    <Card key={solicitud.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{solicitud.nombre_solicitante}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <Badge variant="outline" className="h-5 text-xs">
                              {solicitud.estado}
                            </Badge>
                            {solicitud.fecha_creacion && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(solicitud.fecha_creacion).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Abrir
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notas" className="mt-0">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Notas colaborativas</h3>
                <p className="text-sm text-muted-foreground">
                  Próximamente podrás añadir notas colaborativas para este proyecto.
                  <br />
                  Mientras tanto, usa "Documentos" para adjuntar ficheros.
                </p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <CreateBudgetDialog open={openBudget} onOpenChange={setOpenBudget} onSuccess={refreshBudgets} projectId={project.id} />
      <CreateSolicitudDialog open={openSolicitud} onOpenChange={setOpenSolicitud} onSolicitudCreated={() => {}} projectId={project.id} />
      
      {selectedBudget && (
        <BudgetDetailsDialog 
          open={!!selectedBudget} 
          onOpenChange={(open) => !open && setSelectedBudget(null)} 
          budget={selectedBudget} 
          onUpdate={refreshBudgets} 
          onDelete={() => {
            setSelectedBudget(null);
            refreshBudgets();
          }} 
        />
      )}
    </div>
  );
}