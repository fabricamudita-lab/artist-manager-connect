import { useMemo } from 'react';
import { format, addDays, differenceInDays, startOfDay, min, max } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
}

interface WorkflowSection {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  tasks: ReleaseTask[];
}

interface GanttChartProps {
  workflows: WorkflowSection[];
}

const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  pendiente: 'bg-muted-foreground/50',
  en_proceso: 'bg-blue-500',
  completado: 'bg-green-500',
  retrasado: 'bg-red-500',
};

const WORKFLOW_COLORS: Record<string, string> = {
  audio: 'border-l-blue-500',
  visual: 'border-l-pink-500',
  fabricacion: 'border-l-yellow-500',
  contenido: 'border-l-purple-500',
  marketing: 'border-l-orange-500',
  directo: 'border-l-green-500',
};

export default function GanttChart({ workflows }: GanttChartProps) {
  const { timelineStart, timelineEnd, totalDays, tasksWithDates } = useMemo(() => {
    const allTasks = workflows.flatMap(w => 
      w.tasks.filter(t => t.startDate).map(t => ({
        ...t,
        workflowId: w.id,
        workflowName: w.name,
        endDate: addDays(t.startDate!, t.estimatedDays),
      }))
    );

    if (allTasks.length === 0) {
      const today = startOfDay(new Date());
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 90),
        totalDays: 90,
        tasksWithDates: [],
      };
    }

    const startDates = allTasks.map(t => t.startDate!);
    const endDates = allTasks.map(t => t.endDate);
    
    const earliest = startOfDay(min(startDates));
    const latest = startOfDay(max(endDates));
    const days = Math.max(differenceInDays(latest, earliest) + 7, 30);

    return {
      timelineStart: earliest,
      timelineEnd: addDays(earliest, days),
      totalDays: days,
      tasksWithDates: allTasks,
    };
  }, [workflows]);

  const getBarPosition = (startDate: Date, days: number) => {
    const start = differenceInDays(startOfDay(startDate), timelineStart);
    const leftPercent = (start / totalDays) * 100;
    const widthPercent = (days / totalDays) * 100;
    return { left: `${Math.max(0, leftPercent)}%`, width: `${Math.min(widthPercent, 100 - leftPercent)}%` };
  };

  const months = useMemo(() => {
    const result: { label: string; startPercent: number; widthPercent: number }[] = [];
    let current = startOfDay(timelineStart);
    
    while (current <= timelineEnd) {
      const monthStart = current;
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const monthEnd = nextMonth > timelineEnd ? timelineEnd : nextMonth;
      
      const startDiff = differenceInDays(monthStart, timelineStart);
      const endDiff = differenceInDays(monthEnd, timelineStart);
      
      result.push({
        label: format(monthStart, 'MMMM yyyy', { locale: es }),
        startPercent: (startDiff / totalDays) * 100,
        widthPercent: ((endDiff - startDiff) / totalDays) * 100,
      });
      
      current = nextMonth;
    }
    return result;
  }, [timelineStart, timelineEnd, totalDays]);

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Añade fechas de inicio a las tareas para ver el cronograma</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Timeline Header */}
        <div className="relative h-10 bg-muted/30 rounded-lg overflow-hidden">
          {months.map((month, idx) => (
            <div
              key={idx}
              className="absolute top-0 h-full flex items-center justify-center border-r border-border/50 text-xs font-medium text-muted-foreground capitalize"
              style={{ left: `${month.startPercent}%`, width: `${month.widthPercent}%` }}
            >
              {month.widthPercent > 8 && month.label}
            </div>
          ))}
        </div>

        {/* Workflows */}
        <div className="space-y-6">
          {workflows.map(workflow => {
            const workflowTasks = tasksWithDates.filter(t => t.workflowId === workflow.id);
            if (workflowTasks.length === 0) return null;

            return (
              <div key={workflow.id} className={cn('border-l-4 pl-4', WORKFLOW_COLORS[workflow.id])}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <workflow.icon className="w-4 h-4" />
                  {workflow.name}
                </h3>
                <div className="space-y-2">
                  {workflowTasks.map(task => {
                    const { left, width } = getBarPosition(task.startDate!, task.estimatedDays);
                    const dueDate = addDays(task.startDate!, task.estimatedDays);

                    return (
                      <div key={task.id} className="flex items-center gap-3">
                        <div className="w-32 text-sm truncate text-muted-foreground">
                          {task.name}
                        </div>
                        <div className="flex-1 relative h-8 bg-muted/20 rounded">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute top-1 h-6 rounded cursor-pointer transition-opacity hover:opacity-80',
                                  STATUS_BAR_COLORS[task.status]
                                )}
                                style={{ left, width, minWidth: '4px' }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{task.name}</p>
                                {task.responsible && (
                                  <p className="text-sm">
                                    <span className="text-muted-foreground">Responsable:</span> {task.responsible}
                                  </p>
                                )}
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Vencimiento:</span>{' '}
                                  {format(dueDate, 'dd MMMM yyyy', { locale: es })}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Estado:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted-foreground/50" />
            <span className="text-sm">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-sm">En Proceso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-sm">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-sm">Retrasado</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
