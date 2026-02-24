import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ArrowRight, Clock, AlertTriangle } from "lucide-react";

interface ProjectWorkflowsTabProps {
  tasks: any[];
  budgets: any[];
  solicitudes: any[];
}

const STAGES = [
  { id: "PREPARATIVOS", label: "Preparativos", emoji: "📋" },
  { id: "PRODUCCIÓN", label: "Producción", emoji: "🎬" },
  { id: "CIERRE", label: "Cierre", emoji: "✅" },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pendiente: { color: "text-muted-foreground", bg: "bg-muted", label: "Pendiente" },
  en_progreso: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10", label: "En progreso" },
  completada: { color: "text-green-700 dark:text-green-400", bg: "bg-green-500/10", label: "Completada" },
  bloqueada: { color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10", label: "Bloqueada" },
  cancelada: { color: "text-muted-foreground", bg: "bg-muted/50", label: "Cancelada" },
};

export function ProjectWorkflowsTab({
  tasks,
  budgets,
  solicitudes,
}: ProjectWorkflowsTabProps) {
  const stageData = useMemo(() => {
    return STAGES.map((stage) => {
      const stageTasks = tasks.filter((t) => t.etapa === stage.id);
      const completed = stageTasks.filter((t) => t.estado === "completada").length;
      const total = stageTasks.length;
      const blocked = stageTasks.filter((t) => t.estado === "bloqueada").length;
      const inProgress = stageTasks.filter((t) => t.estado === "en_progreso").length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      let stageStatus: "not_started" | "in_progress" | "completed" | "blocked" = "not_started";
      if (completed === total && total > 0) stageStatus = "completed";
      else if (blocked > 0) stageStatus = "blocked";
      else if (inProgress > 0 || completed > 0) stageStatus = "in_progress";

      return {
        ...stage,
        tasks: stageTasks,
        completed,
        total,
        blocked,
        inProgress,
        pct,
        stageStatus,
      };
    });
  }, [tasks]);

  const getStageStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case "in_progress":
        return <Clock className="h-6 w-6 text-blue-600" />;
      case "blocked":
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStageRingColor = (status: string) => {
    switch (status) {
      case "completed": return "border-green-500 bg-green-500/5";
      case "in_progress": return "border-blue-500 bg-blue-500/5";
      case "blocked": return "border-red-500 bg-red-500/5";
      default: return "border-border bg-muted/30";
    }
  };

  return (
    <div className="space-y-8">
      {/* Pipeline Visual */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {stageData.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-2">
            <div
              className={cn(
                "rounded-xl border-2 p-5 min-w-[200px] transition-all",
                getStageRingColor(stage.stageStatus)
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{stage.emoji}</span>
                {getStageStatusIcon(stage.stageStatus)}
              </div>
              <h3 className="font-semibold text-sm mb-1">{stage.label}</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      stage.stageStatus === "completed"
                        ? "bg-green-500"
                        : stage.stageStatus === "blocked"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    )}
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {stage.pct}%
                </span>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] h-5">
                  {stage.completed}/{stage.total}
                </Badge>
                {stage.blocked > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5">
                    {stage.blocked} bloq.
                  </Badge>
                )}
              </div>
            </div>
            {i < stageData.length - 1 && (
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Detailed Task List per Stage */}
      <div className="space-y-6">
        {stageData.map((stage) => (
          <div key={stage.id}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>{stage.emoji}</span>
              {stage.label}
              <Badge variant="secondary" className="text-xs">
                {stage.completed}/{stage.total}
              </Badge>
            </h3>

            {stage.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                Sin tareas en esta etapa
              </p>
            ) : (
              <div className="space-y-1">
                {stage.tasks.map((task) => {
                  const cfg = STATUS_CONFIG[task.estado] || STATUS_CONFIG.pendiente;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        task.estado === "completada" && "opacity-60",
                        task.estado === "bloqueada" && "border-red-200 dark:border-red-900"
                      )}
                    >
                      <div className="text-sm" style={{ fontSize: "14px" }}>
                        {task.estado === "completada"
                          ? "🟩"
                          : task.estado === "bloqueada"
                          ? "🟥"
                          : task.estado === "en_progreso"
                          ? "🟨"
                          : "⬜"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            task.estado === "completada" && "line-through"
                          )}
                        >
                          {task.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{task.categoria}</span>
                          {task.fecha_vencimiento && (
                            <span>
                              ·{" "}
                              {new Date(task.fecha_vencimiento).toLocaleDateString(
                                "es-ES",
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5", cfg.color, cfg.bg)}
                      >
                        {cfg.label}
                      </Badge>
                      {task.is_urgent && task.estado !== "completada" && (
                        <Badge variant="destructive" className="text-[10px] h-5">
                          URGENTE
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
