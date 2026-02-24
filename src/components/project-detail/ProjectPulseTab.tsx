import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Zap,
  HelpCircle,
  DollarSign,
  ListTodo,
} from "lucide-react";

interface ProjectPulseTabProps {
  tasks: any[];
  budgets: any[];
  solicitudes: any[];
  incidents: any[];
  questions: any[];
  linkedEntities: any[];
  project: {
    start_date?: string | null;
    end_date_estimada?: string | null;
  };
}

export function ProjectPulseTab({
  tasks,
  budgets,
  solicitudes,
  incidents,
  questions,
  linkedEntities,
  project,
}: ProjectPulseTabProps) {
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.estado === "completada").length;
    const blockedTasks = tasks.filter((t) => t.estado === "bloqueada").length;
    const urgentTasks = tasks.filter(
      (t) => t.is_urgent && t.estado !== "completada"
    ).length;
    const overdueTasks = tasks.filter((t) => {
      if (!t.fecha_vencimiento || t.estado === "completada") return false;
      return new Date(t.fecha_vencimiento) < new Date();
    }).length;
    const taskPct =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const openIncidents = incidents.filter(
      (i) => i.status === "abierto" || i.status === "en_progreso"
    ).length;
    const criticalIncidents = incidents.filter(
      (i) => i.severity === "critica" && i.status !== "resuelto" && i.status !== "cerrado"
    ).length;

    const openQuestions = questions.filter(
      (q) => q.status === "abierta" || q.status === "en_discusion"
    ).length;
    const urgentQuestions = questions.filter(
      (q) => q.priority === "urgente" && q.status !== "resuelta"
    ).length;

    const confirmedFee = budgets
      .filter(
        (b) =>
          b.budget_status === "confirmado" || b.show_status === "confirmado"
      )
      .reduce((s: number, b: any) => s + (b.fee || 0), 0);

    // Health score: simple weighted calculation
    let health = 100;
    if (totalTasks > 0) {
      health -= blockedTasks * 5;
      health -= overdueTasks * 10;
      health -= urgentTasks * 3;
    }
    health -= criticalIncidents * 15;
    health -= openIncidents * 3;
    health -= urgentQuestions * 5;
    health = Math.max(0, Math.min(100, health));

    return {
      totalTasks,
      completedTasks,
      blockedTasks,
      urgentTasks,
      overdueTasks,
      taskPct,
      openIncidents,
      criticalIncidents,
      openQuestions,
      urgentQuestions,
      confirmedFee,
      health,
    };
  }, [tasks, budgets, incidents, questions]);

  const getHealthColor = (h: number) => {
    if (h >= 80) return "text-green-600";
    if (h >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getHealthLabel = (h: number) => {
    if (h >= 80) return "Saludable";
    if (h >= 50) return "Atención requerida";
    return "Crítico";
  };

  const getHealthBg = (h: number) => {
    if (h >= 80) return "bg-green-500";
    if (h >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k€` : `${n}€`;

  return (
    <div className="space-y-6">
      {/* Health Score Hero */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Salud del Proyecto</h3>
            <p className="text-sm text-muted-foreground">
              Puntuación basada en tareas, imprevistos y dudas
            </p>
          </div>
          <div className="text-right">
            <span className={`text-4xl font-bold ${getHealthColor(stats.health)}`}>
              {stats.health}
            </span>
            <p className={`text-sm font-medium ${getHealthColor(stats.health)}`}>
              {getHealthLabel(stats.health)}
            </p>
          </div>
        </div>
        <Progress
          value={stats.health}
          className="h-3"
        />
      </div>

      {/* Alert Badges Row */}
      {(stats.urgentTasks > 0 ||
        stats.criticalIncidents > 0 ||
        stats.urgentQuestions > 0 ||
        stats.overdueTasks > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.overdueTasks > 0 && (
            <Badge variant="destructive" className="gap-1 px-3 py-1.5">
              🔥 {stats.overdueTasks} tarea{stats.overdueTasks !== 1 ? "s" : ""} vencida{stats.overdueTasks !== 1 ? "s" : ""}
            </Badge>
          )}
          {stats.criticalIncidents > 0 && (
            <Badge variant="destructive" className="gap-1 px-3 py-1.5">
              ⚡ {stats.criticalIncidents} imprevisto{stats.criticalIncidents !== 1 ? "s" : ""} crítico{stats.criticalIncidents !== 1 ? "s" : ""}
            </Badge>
          )}
          {stats.urgentQuestions > 0 && (
            <Badge variant="warning" className="gap-1 px-3 py-1.5">
              ❓ {stats.urgentQuestions} duda{stats.urgentQuestions !== 1 ? "s" : ""} urgente{stats.urgentQuestions !== 1 ? "s" : ""}
            </Badge>
          )}
          {stats.urgentTasks > 0 && (
            <Badge variant="warning" className="gap-1 px-3 py-1.5">
              🚨 {stats.urgentTasks} tarea{stats.urgentTasks !== 1 ? "s" : ""} urgente{stats.urgentTasks !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tareas completadas</p>
              <p className="text-xl font-bold">
                {stats.completedTasks}/{stats.totalTasks}
              </p>
              <Progress value={stats.taskPct} className="h-1.5 mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Bloqueadas</p>
              <p className="text-xl font-bold">{stats.blockedTasks}</p>
              <p className="text-xs text-muted-foreground">
                {stats.overdueTasks} vencidas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Imprevistos abiertos</p>
              <p className="text-xl font-bold">{stats.openIncidents}</p>
              <p className="text-xs text-muted-foreground">
                {stats.criticalIncidents} críticos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Dudas abiertas</p>
              <p className="text-xl font-bold">{stats.openQuestions}</p>
              <p className="text-xs text-muted-foreground">
                {stats.urgentQuestions} urgentes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Progress */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progreso por etapa
          </h4>
          {["PREPARATIVOS", "PRODUCCIÓN", "CIERRE"].map((etapa) => {
            const stageTasks = tasks.filter((t) => t.etapa === etapa);
            const completed = stageTasks.filter(
              (t) => t.estado === "completada"
            ).length;
            const total = stageTasks.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={etapa} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{etapa}</span>
                  <span className="text-xs text-muted-foreground">
                    {completed}/{total} ({pct}%)
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4" />
            Resumen financiero
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Fee confirmado</p>
              <p className="text-lg font-bold text-green-600">
                {fmt(stats.confirmedFee)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Presupuestos</p>
              <p className="text-lg font-bold">{budgets.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solicitudes</p>
              <p className="text-lg font-bold">{solicitudes.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
