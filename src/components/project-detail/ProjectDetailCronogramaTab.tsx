import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface ProjectDetailCronogramaTabProps {
  project: any;
  budgets: any[];
  solicitudes: any[];
}

export function ProjectDetailCronogramaTab({ project, budgets, solicitudes }: ProjectDetailCronogramaTabProps) {
  const startDate = project.start_date ? new Date(project.start_date) : null;
  const endDate = project.end_date_estimada ? new Date(project.end_date_estimada) : null;

  if (!startDate || !endDate) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">Sin rango de fechas</h3>
        <p className="text-sm text-muted-foreground">Define la fecha de inicio y fin del proyecto para ver el cronograma.</p>
      </div>
    );
  }

  const months: { label: string; year: number; month: number }[] = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cur <= endMonth) {
    months.push({
      label: cur.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      year: cur.getFullYear(),
      month: cur.getMonth(),
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  const totalMonths = months.length || 1;

  const getCol = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
  };

  const ganttItems: { id: string; label: string; type: 'budget' | 'solicitud'; startCol: number; span: number; status: string }[] = [];

  budgets.forEach((b) => {
    const col = getCol(b.event_date);
    if (col !== null && col >= 0 && col < totalMonths) {
      ganttItems.push({ id: b.id, label: b.name, type: 'budget', startCol: col, span: 1, status: b.show_status || '' });
    }
  });

  solicitudes.forEach((s) => {
    const col = getCol(s.fecha_creacion || s.created_at);
    if (col !== null && col >= 0 && col < totalMonths) {
      ganttItems.push({ id: s.id, label: s.nombre_solicitante || 'Solicitud', type: 'solicitud', startCol: col, span: 1, status: s.estado || '' });
    }
  });

  const typeColors = { budget: 'bg-green-500', solicitud: 'bg-blue-500' };
  const typeLabelMap = { budget: '🎤 Show/Presupuesto', solicitud: '📬 Solicitud' };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries({ budget: '#22c55e', solicitud: '#3b82f6' }).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            {typeLabelMap[type as keyof typeof typeLabelMap]}
          </div>
        ))}
      </div>

      {/* Gantt grid */}
      <div className="overflow-x-auto border rounded-lg">
        <div className="grid bg-muted/50 border-b" style={{ gridTemplateColumns: `200px repeat(${totalMonths}, minmax(64px, 1fr))` }}>
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Entidad</div>
          {months.map((m, i) => (
            <div key={i} className="px-1 py-2 text-xs font-medium text-muted-foreground text-center border-l border-border/40">{m.label}</div>
          ))}
        </div>

        {ganttItems.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No hay presupuestos ni solicitudes con fechas dentro del rango del proyecto.
          </div>
        ) : (
          ganttItems.map((item) => (
            <div key={item.id} className="grid border-b border-border/30 hover:bg-muted/20 transition-colors" style={{ gridTemplateColumns: `200px repeat(${totalMonths}, minmax(64px, 1fr))` }}>
              <div className="px-3 py-2 flex flex-col justify-center border-r border-border/30">
                <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground">{typeLabelMap[item.type]}</p>
              </div>
              {Array.from({ length: totalMonths }).map((_, col) => {
                const isStart = col === item.startCol;
                const inRange = col >= item.startCol && col < item.startCol + item.span;
                const isEnd = col === item.startCol + item.span - 1;
                return (
                  <div key={col} className="relative h-10 border-l border-border/20 flex items-center px-0.5">
                    {inRange && (
                      <div
                        className={`h-5 w-full ${typeColors[item.type]} opacity-80`}
                        style={{ borderRadius: isStart && isEnd ? 6 : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : 0 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
        💡 El cronograma muestra los presupuestos (shows) y solicitudes vinculados al proyecto ordenados en el tiempo. Actualiza las fechas en sus módulos originales y aquí se reflejarán automáticamente.
      </div>
    </div>
  );
}
