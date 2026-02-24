import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Zap, AlertTriangle, CheckCircle2, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectIncidentsTabProps {
  projectId: string;
  incidents: any[];
  onRefresh: () => void;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  baja: { label: "Baja", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200", icon: Clock },
  media: { label: "Media", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200", icon: AlertTriangle },
  alta: { label: "Alta", color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200", icon: AlertTriangle },
  critica: { label: "Crítica", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200", icon: Zap },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  abierto: { label: "Abierto", color: "bg-red-500/10 text-red-700 dark:text-red-400" },
  en_progreso: { label: "En progreso", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  resuelto: { label: "Resuelto", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  cerrado: { label: "Cerrado", color: "bg-muted text-muted-foreground" },
};

export function ProjectIncidentsTab({ projectId, incidents, onRefresh }: ProjectIncidentsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "media",
    impact: "",
    assigned_to: "",
  });
  const [filterStatus, setFilterStatus] = useState("all");

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("project_incidents" as any).insert({
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        impact: form.impact.trim() || null,
        assigned_to: form.assigned_to.trim() || null,
        reported_by: user.data.user?.id,
      });
      if (error) throw error;
      setForm({ title: "", description: "", severity: "media", impact: "", assigned_to: "" });
      setShowCreate(false);
      onRefresh();
      toast({ title: "Imprevisto registrado" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo crear el imprevisto", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "resuelto" || newStatus === "cerrado") {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("project_incidents" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Estado actualizado" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from("project_incidents" as any)
        .update({
          status: "resuelto",
          resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Imprevisto resuelto" });
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filterStatus === "all"
    ? incidents
    : incidents.filter((i) => i.status === filterStatus);

  const openCount = incidents.filter((i) => i.status === "abierto" || i.status === "en_progreso").length;
  const criticalCount = incidents.filter(
    (i) => i.severity === "critica" && i.status !== "resuelto" && i.status !== "cerrado"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Imprevistos
          </h3>
          {openCount > 0 && (
            <Badge variant="warning" className="gap-1">
              {openCount} abierto{openCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              ⚡ {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="abierto">Abiertos</SelectItem>
              <SelectItem value="en_progreso">En progreso</SelectItem>
              <SelectItem value="resuelto">Resueltos</SelectItem>
              <SelectItem value="cerrado">Cerrados</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">
            {filterStatus === "all" ? "Sin imprevistos registrados" : "Sin imprevistos con este filtro"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Registra cualquier problema o imprevisto que surja durante el proyecto
          </p>
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar imprevisto
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((incident) => {
            const sev = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.media;
            const st = STATUS_CONFIG[incident.status] || STATUS_CONFIG.abierto;
            const SevIcon = sev.icon;

            return (
              <Card key={incident.id} className={cn(
                "transition-all",
                incident.severity === "critica" && incident.status === "abierto" && "border-red-300 dark:border-red-800"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg mt-0.5", sev.color.split(" ")[0])}>
                      <SevIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-sm">{incident.title}</h4>
                        <Badge variant="outline" className={cn("text-[10px] h-5", sev.color)}>
                          {sev.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px] h-5", st.color)}>
                          {st.label}
                        </Badge>
                      </div>
                      {incident.description && (
                        <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                      )}
                      {incident.impact && (
                        <p className="text-xs text-muted-foreground italic mb-2">
                          💥 Impacto: {incident.impact}
                        </p>
                      )}
                      {incident.resolution && (
                        <div className="text-xs bg-green-500/5 text-green-700 dark:text-green-400 rounded p-2 mb-2">
                          ✅ {incident.resolution}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{format(new Date(incident.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                        {incident.assigned_to && <span>→ {incident.assigned_to}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {incident.status === "abierto" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleUpdateStatus(incident.id, "en_progreso")}
                        >
                          Atender
                        </Button>
                      )}
                      {(incident.status === "abierto" || incident.status === "en_progreso") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-green-600"
                          onClick={() => {
                            const resolution = prompt("¿Cómo se resolvió?");
                            if (resolution) handleResolve(incident.id, resolution);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolver
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Registrar Imprevisto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="¿Qué ha ocurrido?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalla el imprevisto..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Severidad</label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">🔵 Baja</SelectItem>
                    <SelectItem value="media">🟡 Media</SelectItem>
                    <SelectItem value="alta">🟠 Alta</SelectItem>
                    <SelectItem value="critica">🔴 Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Asignar a</label>
                <Input
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="Nombre del responsable"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Impacto</label>
              <Input
                value={form.impact}
                onChange={(e) => setForm({ ...form, impact: e.target.value })}
                placeholder="¿Cómo afecta al proyecto?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !form.title.trim()}>
              {creating ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
