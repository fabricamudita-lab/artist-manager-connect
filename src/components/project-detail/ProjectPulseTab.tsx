import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Calendar } from "lucide-react";

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
    const pendingTasks = tasks.filter((t) => t.estado !== "completada").length;
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
      (i) =>
        i.severity === "critica" &&
        i.status !== "resuelto" &&
        i.status !== "cerrado"
    ).length;

    const openQuestions = questions.filter(
      (q) => q.status === "abierta" || q.status === "en_discusion"
    ).length;
    const urgentQuestions = questions.filter(
      (q) => q.priority === "urgente" && q.status !== "resuelta"
    ).length;

    // Health score
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
      pendingTasks,
      blockedTasks,
      urgentTasks,
      overdueTasks,
      taskPct,
      openIncidents,
      criticalIncidents,
      openQuestions,
      urgentQuestions,
      health,
    };
  }, [tasks, incidents, questions]);

  const getHealthColor = (h: number) => {
    if (h >= 80) return "text-green-500";
    if (h >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getHealthLabel = (h: number) => {
    if (h >= 80) return "Saludable";
    if (h >= 50) return "Necesita atención";
    return "Crítico";
  };

  // Pending tasks sorted by urgency then date
  const pendingActions = useMemo(() => {
    return tasks
      .filter((t) => t.estado !== "completada")
      .sort((a, b) => {
        if (a.is_urgent && !b.is_urgent) return -1;
        if (!a.is_urgent && b.is_urgent) return 1;
        if (a.estado === "bloqueada" && b.estado !== "bloqueada") return -1;
        if (a.estado !== "bloqueada" && b.estado === "bloqueada") return 1;
        const da = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
        const db = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 8);
  }, [tasks]);

  const activeIncidents = useMemo(() => {
    return incidents
      .filter((i) => i.status === "abierto" || i.status === "en_progreso")
      .slice(0, 5);
  }, [incidents]);

  const openQs = useMemo(() => {
    return questions
      .filter((q) => q.status === "abierta" || q.status === "en_discusion")
      .slice(0, 5);
  }, [questions]);

  // Find linked entity for a task (by booking_id or similar)
  const getLinkedEntityLabel = (task: any) => {
    if (!task.linked_entity_id || linkedEntities.length === 0) return null;
    const entity = linkedEntities.find((e) => e.entity_id === task.linked_entity_id);
    if (!entity) return null;
    return entity.entity_name || entity.entity_type;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    try {
      return format(new Date(d), "d MMM", { locale: es });
    } catch {
      return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critica":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Crítico</Badge>;
      case "alta":
        return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Alto</Badge>;
      case "media":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Medio</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Bajo</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Health */}
        <Card className="bg-card border">
          <CardContent className="p-4 space-y-1">
            <span className="text-2xl">💚</span>
            <p className={`text-3xl font-bold ${getHealthColor(stats.health)}`}>
              {stats.health}%
            </p>
            <p className="text-sm font-medium text-foreground">Salud del proyecto</p>
            <p className="text-xs text-muted-foreground">{getHealthLabel(stats.health)}</p>
          </CardContent>
        </Card>

        {/* Urgent tasks */}
        <Card className="bg-card border">
          <CardContent className="p-4 space-y-1">
            <span className="text-2xl">🔥</span>
            <p className="text-3xl font-bold text-red-500">{stats.urgentTasks}</p>
            <p className="text-sm font-medium text-foreground">Tareas urgentes</p>
            <p className="text-xs text-muted-foreground">de {stats.pendingTasks} pendientes</p>
          </CardContent>
        </Card>

        {/* Blocked tasks */}
        <Card className="bg-card border">
          <CardContent className="p-4 space-y-1">
            <span className="text-2xl">🚧</span>
            <p className="text-3xl font-bold text-amber-500">{stats.blockedTasks}</p>
            <p className="text-sm font-medium text-foreground">Tareas bloqueadas</p>
            <p className="text-xs text-muted-foreground">esperando otra acción</p>
          </CardContent>
        </Card>

        {/* Open incidents */}
        <Card className="bg-card border">
          <CardContent className="p-4 space-y-1">
            <span className="text-2xl">⚡</span>
            <p className="text-3xl font-bold text-amber-500">{stats.openIncidents}</p>
            <p className="text-sm font-medium text-foreground">Imprevistos abiertos</p>
            <p className="text-xs text-muted-foreground">{stats.criticalIncidents} críticos</p>
          </CardContent>
        </Card>

        {/* Open questions */}
        <Card className="bg-card border">
          <CardContent className="p-4 space-y-1">
            <span className="text-2xl">❓</span>
            <p className="text-3xl font-bold text-blue-500">{stats.openQuestions}</p>
            <p className="text-sm font-medium text-foreground">Dudas sin respuesta</p>
            <p className="text-xs text-muted-foreground">{stats.urgentQuestions} urgentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout: Próximas Acciones + Imprevistos Activos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Acciones */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Próximas Acciones
              </h4>
              {pendingActions.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {stats.pendingTasks}
                </Badge>
              )}
            </div>
            {pendingActions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                🎉 Sin tareas pendientes
              </p>
            ) : (
              <div className="space-y-2">
                {pendingActions.map((task) => {
                  const linkedLabel = getLinkedEntityLabel(task);
                  const isOverdue =
                    task.fecha_vencimiento &&
                    task.estado !== "completada" &&
                    new Date(task.fecha_vencimiento) < new Date();
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          task.is_urgent
                            ? "bg-red-500"
                            : task.estado === "bloqueada"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-tight truncate">
                          {task.titulo}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {linkedLabel && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              {linkedLabel}
                            </Badge>
                          )}
                          {task.etapa && (
                            <span className="text-[10px] text-muted-foreground">
                              {task.etapa}
                            </span>
                          )}
                          {task.is_urgent && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">
                              URGENTE
                            </Badge>
                          )}
                          {task.estado === "bloqueada" && (
                            <Badge variant="warning" className="text-[9px] px-1 py-0 h-3.5">
                              BLOQUEADA
                            </Badge>
                          )}
                        </div>
                      </div>
                      {task.fecha_vencimiento && (
                        <span
                          className={`text-[11px] flex-shrink-0 ${
                            isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {formatDate(task.fecha_vencimiento)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imprevistos Activos */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Imprevistos Activos
              </h4>
              {activeIncidents.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                  {stats.openIncidents}
                </Badge>
              )}
            </div>
            {activeIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                ✅ Sin imprevistos activos
              </p>
            ) : (
              <div className="space-y-2">
                {activeIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="rounded-lg border border-border/50 p-3 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{inc.title}</p>
                      {getSeverityBadge(inc.severity)}
                    </div>
                    {inc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {inc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {inc.category && <span>{inc.category}</span>}
                      {inc.created_at && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(inc.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dudas sin respuesta */}
      <Card className="border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Dudas sin Respuesta
            </h4>
            {openQs.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.openQuestions}
              </Badge>
            )}
          </div>
          {openQs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              ✅ Todas las dudas resueltas
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {openQs.map((q) => (
                <div
                  key={q.id}
                  className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      q.priority === "urgente" ? "bg-red-500" : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium leading-tight truncate">
                      {q.question}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {q.priority === "urgente" && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">
                          URGENTE
                        </Badge>
                      )}
                      {q.created_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(q.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
