import { useState, useMemo } from 'react';
import { format, addDays, differenceInDays, startOfDay, min, max, eachDayOfInterval, isAfter, isSameDay } from 'date-fns';
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

interface Subtask {
  id: string;
  name: string;
  type: 'full' | 'checkbox' | 'note' | 'comment';
  startDate?: Date | null;
  estimatedDays?: number;
  status?: TaskStatus;
  anchoredTo?: string[];
}

interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  anchoredTo?: string[];
  customStartDate?: boolean;
  subtasks?: Subtask[];
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
  onUpdateTaskDate?: (workflowId: string, taskId: string, newStartDate: Date, newEstimatedDays: number, subtaskId?: string) => void;
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
    type TaskWithMeta = {
      id: string;
      name: string;
      startDate: Date;
      estimatedDays: number;
      status: TaskStatus;
      anchoredTo?: string[];
      workflowId: string;
      workflowName: string;
      endDate: Date;
      isSubtask: boolean;
      parentTaskId?: string;
      parentTaskName?: string;
    };

    const allTasks: TaskWithMeta[] = [];
    
    workflows.forEach(w => {
      w.tasks.forEach(t => {
        // Add main task if it has a date
        if (t.startDate) {
          allTasks.push({
            id: t.id,
            name: t.name,
            startDate: t.startDate,
            estimatedDays: t.estimatedDays,
            status: t.status,
            anchoredTo: t.anchoredTo,
            workflowId: w.id,
            workflowName: w.name,
            endDate: addDays(t.startDate, t.estimatedDays),
            isSubtask: false,
          });
        }
        
        // Add subtasks with dates (only 'full' type with startDate)
        (t.subtasks || []).forEach(st => {
          if (st.type === 'full' && st.startDate && st.estimatedDays) {
            allTasks.push({
              id: st.id,
              name: st.name,
              startDate: st.startDate,
              estimatedDays: st.estimatedDays,
              status: st.status || 'pendiente',
              anchoredTo: st.anchoredTo,
              workflowId: w.id,
              workflowName: w.name,
              endDate: addDays(st.startDate, st.estimatedDays),
              isSubtask: true,
              parentTaskId: t.id,
              parentTaskName: t.name,
            });
          }
        });
      });
    });

    if (allTasks.length === 0) {
      const todayStart = startOfDay(new Date());
      return {
        timelineStart: todayStart,
        timelineEnd: addDays(todayStart, 90),
        totalDays: 90,
        tasksWithDates: [] as TaskWithMeta[],
      };
    }

    const startDates = allTasks.map(t => t.startDate);
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
                    const { left, width } = getBarPosition(task.startDate, task.estimatedDays);
                    const dueDate = addDays(task.startDate, task.estimatedDays);
                    const popoverId = `${workflow.id}-${task.id}`;

                    return (
                      <div key={task.id} className={cn(
                        "flex items-center gap-3",
                        task.isSubtask && "ml-4"
                      )}>
                        <div className={cn(
                          "text-sm truncate text-muted-foreground flex items-center gap-1",
                          task.isSubtask ? "w-28" : "w-32"
                        )}>
                          {task.isSubtask && (
                            <span className="text-muted-foreground/50 mr-0.5">↳</span>
                          )}
                          {task.anchoredTo && task.anchoredTo.length > 0 && (
                            <span 
                              className="text-primary" 
                              title={`Anclada a: ${task.anchoredTo.map(id => getTaskName?.(id) || id).join(', ')}`}
                            >
                              🔗{task.anchoredTo.length > 1 && <sup className="text-[10px]">{task.anchoredTo.length}</sup>}
                            </span>
                          )}
                          <span className={cn(task.isSubtask && "text-xs")} title={task.isSubtask ? `Subtarea de: ${task.parentTaskName}` : undefined}>
                            {task.name}
                          </span>
                        </div>
                        <div className={cn(
                          "flex-1 relative rounded",
                          task.isSubtask ? "h-6 bg-muted/10" : "h-8 bg-muted/20"
                        )}>
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
                                  'absolute rounded cursor-pointer transition-all hover:opacity-80 hover:ring-2 hover:ring-primary/50',
                                  STATUS_BAR_COLORS[task.status],
                                  task.isSubtask ? 'top-0.5 h-5' : 'top-1 h-6',
                                  task.isSubtask && 'opacity-70'
                                )}
                                style={{ left, width, minWidth: '16px' }}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" side="top">
                              <div className="p-3 border-b">
                                <div className="flex gap-2">
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
                              </div>
                              <div className="p-3">
                                <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
                                  <span>Inicio: {format(task.startDate!, 'dd MMM', { locale: es })}</span>
                                  <span>Fin: {format(dueDate, 'dd MMM', { locale: es })}</span>
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
                                  modifiers={{
                                    otherDate: editingDateType === 'start' 
                                      ? [dueDate] 
                                      : [task.startDate!],
                                    inRange: isAfter(dueDate, task.startDate!)
                                      ? eachDayOfInterval({ start: task.startDate!, end: dueDate }).filter(
                                          d => !isSameDay(d, task.startDate!) && !isSameDay(d, dueDate)
                                        )
                                      : [],
                                    rangeStart: [task.startDate!],
                                    rangeEnd: [dueDate],
                                  }}
                                  modifiersClassNames={{
                                    otherDate: "bg-primary/30 text-primary/70 rounded-md",
                                    inRange: "bg-accent/40 rounded-none",
                                    rangeStart: "bg-primary/20 rounded-l-md rounded-r-none",
                                    rangeEnd: "bg-primary/20 rounded-r-md rounded-l-none",
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
