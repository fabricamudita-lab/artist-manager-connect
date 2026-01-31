import { useState, useMemo } from 'react';
import { format, addDays, differenceInDays, startOfDay, min, max } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  anchoredTo?: string[];
  customStartDate?: boolean;
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
  onUpdateTaskDate?: (workflowId: string, taskId: string, newStartDate: Date, newEstimatedDays: number) => void;
  onSetAnchor?: (workflowId: string, taskId: string, anchoredTo: string[] | undefined) => void;
  getTaskName?: (taskId: string) => string;
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

export default function GanttChart({ workflows, onUpdateTaskDate, onSetAnchor, getTaskName }: GanttChartProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [editingDateType, setEditingDateType] = useState<'start' | 'end'>('start');

  const today = useMemo(() => startOfDay(new Date()), []);

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
      const todayStart = startOfDay(new Date());
      return {
        timelineStart: todayStart,
        timelineEnd: addDays(todayStart, 90),
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

  const todayPosition = useMemo(() => {
    const diff = differenceInDays(today, timelineStart);
    if (diff < 0 || diff > totalDays) return null;
    return (diff / totalDays) * 100;
  }, [today, timelineStart, totalDays]);

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

  const handleStartDateSelect = (workflowId: string, taskId: string, currentEndDate: Date, newStartDate: Date | undefined) => {
    if (newStartDate && onUpdateTaskDate) {
      const newDays = Math.max(1, differenceInDays(currentEndDate, newStartDate));
      onUpdateTaskDate(workflowId, taskId, newStartDate, newDays);
    }
  };

  const handleEndDateSelect = (workflowId: string, taskId: string, currentStartDate: Date, newEndDate: Date | undefined) => {
    if (newEndDate && onUpdateTaskDate) {
      const newDays = Math.max(1, differenceInDays(newEndDate, currentStartDate));
      onUpdateTaskDate(workflowId, taskId, currentStartDate, newDays);
    }
  };

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
          {/* Today line in header */}
          {todayPosition !== null && (
            <div 
              className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
              style={{ left: `${todayPosition}%` }}
            />
          )}
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
                    const popoverId = `${workflow.id}-${task.id}`;

                    return (
                      <div key={task.id} className="flex items-center gap-3">
                        <div className="w-32 text-sm truncate text-muted-foreground flex items-center gap-1">
                          {task.anchoredTo && task.anchoredTo.length > 0 && (
                            <span 
                              className="text-primary" 
                              title={`Anclada a: ${task.anchoredTo.map(id => getTaskName?.(id) || id).join(', ')}`}
                            >
                              🔗{task.anchoredTo.length > 1 && <sup className="text-[10px]">{task.anchoredTo.length}</sup>}
                            </span>
                          )}
                          {task.name}
                        </div>
                        <div className="flex-1 relative h-8 bg-muted/20 rounded">
                          {/* Today line in task row */}
                          {todayPosition !== null && (
                            <div 
                              className="absolute top-0 h-full w-0.5 bg-red-500/50 z-10 pointer-events-none"
                              style={{ left: `${todayPosition}%` }}
                            />
                          )}
                          <Popover 
                            open={openPopover === popoverId} 
                            onOpenChange={(open) => {
                              setOpenPopover(open ? popoverId : null);
                              if (open) setEditingDateType('start');
                            }}
                          >
                            <PopoverTrigger asChild>
                              <div
                                className={cn(
                                  'absolute top-1 h-6 rounded cursor-pointer transition-all hover:opacity-80 hover:ring-2 hover:ring-primary/50',
                                  STATUS_BAR_COLORS[task.status]
                                )}
                                style={{ left, width, minWidth: '20px' }}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" side="top">
                              <div className="p-3 border-b">
                                <p className="font-medium text-sm">{task.name}</p>
                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                  <span>Inicio: {format(task.startDate!, 'dd MMM yyyy', { locale: es })}</span>
                                  <span>Fin: {format(dueDate, 'dd MMM yyyy', { locale: es })}</span>
                                </div>
                                {task.anchoredTo && task.anchoredTo.length > 0 && getTaskName && (
                                  <p className="text-xs text-primary mt-1">
                                    🔗 Anclada a: {task.anchoredTo.map(id => getTaskName(id)).join(', ')}
                                  </p>
                                )}
                                {task.customStartDate && (
                                  <p className="text-xs text-amber-500 mt-0.5">
                                    ⚠️ Fecha personalizada
                                  </p>
                                )}
                              </div>
                              <div className="p-3">
                                <div className="flex gap-2 mb-3">
                                  <button
                                    onClick={() => setEditingDateType('start')}
                                    className={cn(
                                      'flex-1 px-3 py-1.5 text-sm rounded-md transition-colors',
                                      editingDateType === 'start' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted hover:bg-muted/80'
                                    )}
                                  >
                                    <CalendarIcon className="w-3 h-3 inline mr-1" />
                                    Inicio
                                  </button>
                                  <button
                                    onClick={() => setEditingDateType('end')}
                                    className={cn(
                                      'flex-1 px-3 py-1.5 text-sm rounded-md transition-colors',
                                      editingDateType === 'end' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted hover:bg-muted/80'
                                    )}
                                  >
                                    <CalendarIcon className="w-3 h-3 inline mr-1" />
                                    Fin
                                  </button>
                                </div>
                                <Label className="text-xs text-muted-foreground mb-2 block">
                                  {editingDateType === 'start' ? 'Seleccionar fecha de inicio' : 'Seleccionar fecha de fin'}
                                </Label>
                                <Calendar
                                  key={editingDateType}
                                  mode="single"
                                  defaultMonth={editingDateType === 'start' ? task.startDate! : dueDate}
                                  selected={editingDateType === 'start' ? task.startDate! : dueDate}
                                  onSelect={(date) => {
                                    if (editingDateType === 'start') {
                                      handleStartDateSelect(workflow.id, task.id, dueDate, date);
                                    } else {
                                      handleEndDateSelect(workflow.id, task.id, task.startDate!, date);
                                    }
                                    setOpenPopover(null);
                                  }}
                                  disabled={(date) => {
                                    if (editingDateType === 'end') {
                                      return date <= task.startDate!;
                                    }
                                    if (editingDateType === 'start') {
                                      return date >= dueDate;
                                    }
                                    return false;
                                  }}
                                  initialFocus
                                  className="p-0 pointer-events-auto"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
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

        <p className="text-xs text-muted-foreground">
          💡 Haz clic en una barra para modificar la fecha de inicio o fin
        </p>
      </div>
    </TooltipProvider>
  );
}
