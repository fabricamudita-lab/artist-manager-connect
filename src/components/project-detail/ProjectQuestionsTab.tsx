import { useState } from "react";
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
import { Plus, HelpCircle, CheckCircle2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectQuestionsTabProps {
  projectId: string;
  questions: any[];
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  abierta: { label: "Abierta", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  en_discusion: { label: "En discusión", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  resuelta: { label: "Resuelta", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baja: { label: "Baja", color: "text-muted-foreground" },
  normal: { label: "Normal", color: "text-blue-600" },
  urgente: { label: "Urgente", color: "text-red-600" },
};

export function ProjectQuestionsTab({ projectId, questions, onRefresh }: ProjectQuestionsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    question: "",
    context: "",
    priority: "normal",
    assigned_to: "",
  });
  const [filterStatus, setFilterStatus] = useState("all");

  const handleCreate = async () => {
    if (!form.question.trim()) return;
    setCreating(true);
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase.from("project_questions" as any).insert({
        project_id: projectId,
        question: form.question.trim(),
        context: form.context.trim() || null,
        priority: form.priority,
        assigned_to: form.assigned_to.trim() || null,
        asked_by: user.data.user?.id,
      });
      if (error) throw error;
      setForm({ question: "", context: "", priority: "normal", assigned_to: "" });
      setShowCreate(false);
      onRefresh();
      toast({ title: "Duda registrada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo crear la duda", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleAnswer = async (id: string) => {
    const answer = prompt("Escribe la respuesta:");
    if (!answer) return;
    try {
      const { error } = await supabase
        .from("project_questions" as any)
        .update({
          answer,
          answered_by: "Equipo",
          status: "resuelta",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Duda resuelta" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("project_questions" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filterStatus === "all"
    ? questions
    : questions.filter((q) => q.status === filterStatus);

  const openCount = questions.filter((q) => q.status === "abierta" || q.status === "en_discusion").length;
  const urgentCount = questions.filter((q) => q.priority === "urgente" && q.status !== "resuelta").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            Dudas y Preguntas
          </h3>
          {openCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {openCount} abierta{openCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {urgentCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              ❓ {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="abierta">Abiertas</SelectItem>
              <SelectItem value="en_discusion">En discusión</SelectItem>
              <SelectItem value="resuelta">Resueltas</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva duda
          </Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">
            {filterStatus === "all" ? "Sin dudas registradas" : "Sin dudas con este filtro"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Registra preguntas o decisiones pendientes para el equipo
          </p>
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Hacer una pregunta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const st = STATUS_CONFIG[q.status] || STATUS_CONFIG.abierta;
            const pri = PRIORITY_CONFIG[q.priority] || PRIORITY_CONFIG.normal;

            return (
              <Card key={q.id} className={cn(
                "transition-all",
                q.priority === "urgente" && q.status !== "resuelta" && "border-red-200 dark:border-red-900"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg mt-0.5",
                      q.status === "resuelta" ? "bg-green-500/10" : "bg-blue-500/10"
                    )}>
                      {q.status === "resuelta" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <HelpCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-sm">{q.question}</h4>
                        <Badge variant="outline" className={cn("text-[10px] h-5", st.color)}>
                          {st.label}
                        </Badge>
                        {q.priority !== "normal" && (
                          <Badge variant={q.priority === "urgente" ? "destructive" : "secondary"} className="text-[10px] h-5">
                            {pri.label}
                          </Badge>
                        )}
                      </div>
                      {q.context && (
                        <p className="text-sm text-muted-foreground mb-2">{q.context}</p>
                      )}
                      {q.answer && (
                        <div className="text-sm bg-green-500/5 text-green-700 dark:text-green-400 rounded p-3 mb-2 border border-green-200 dark:border-green-900">
                          <div className="flex items-center gap-1 mb-1 text-xs font-semibold">
                            <MessageSquare className="h-3 w-3" />
                            Respuesta{q.answered_by ? ` de ${q.answered_by}` : ""}
                          </div>
                          {q.answer}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{format(new Date(q.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                        {q.assigned_to && <span>→ {q.assigned_to}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {q.status === "abierta" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleUpdateStatus(q.id, "en_discusion")}
                        >
                          Discutir
                        </Button>
                      )}
                      {q.status !== "resuelta" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-green-600"
                          onClick={() => handleAnswer(q.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Responder
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
              <HelpCircle className="h-5 w-5 text-blue-500" />
              Nueva Duda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Pregunta *</label>
              <Input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="¿Cuál es tu duda?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contexto</label>
              <Textarea
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
                placeholder="Aporta contexto adicional..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Prioridad</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Dirigida a</label>
                <Input
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="Nombre del responsable"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !form.question.trim()}>
              {creating ? "Registrando..." : "Registrar duda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
