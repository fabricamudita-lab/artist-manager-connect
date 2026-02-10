import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format, addDays, differenceInDays, startOfDay, min, max, eachDayOfInterval, isAfter, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, EyeOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
  selectedTaskIds?: Set<string>;
  onTaskSelect?: (taskId: string) => void;
  onHideTask?: (taskId: string) => void;
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

interface DragState {
  taskId: string;
  workflowId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  origStartDate: Date;
  origDays: number;
  containerWidth: number;
  activated: boolean;
  isSubtask: boolean;
}

interface DragPreview {
  taskId: string;
  startDate: Date;
  days: number;
}

export default function GanttChart({ workflows, onUpdateTaskDate, onSetAnchor, getTaskName, selectedTaskIds, onTaskSelect, onHideTask }: GanttChartProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [editingDateType, setEditingDateType] = useState<'start' | 'end'>('start');

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [pendingDrag, setPendingDrag] = useState<{
    workflowId: string;
    taskId: string;
    startDate: Date;
    days: number;
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);

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

  // --- Drag logic ---
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    taskId: string,
    workflowId: string,
    startDate: Date,
    estimatedDays: number,
    isSubtask: boolean,
    containerEl: HTMLElement | null,
  ) => {
    if (e.button !== 0 || !containerEl) return;
    e.preventDefault();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const barWidth = rect.width;

    let mode: DragState['mode'] = 'move';
    if (offsetX <= 6) mode = 'resize-left';
    else if (barWidth - offsetX <= 6) mode = 'resize-right';

    const state: DragState = {
      taskId,
      workflowId,
      mode,
      startX: e.clientX,
      origStartDate: startDate,
      origDays: estimatedDays,
      containerWidth: containerEl.getBoundingClientRect().width,
      activated: false,
      isSubtask,
    };
    dragRef.current = state;
    setDragState(state);
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragRef.current;
      if (!ds) return;

      const deltaX = e.clientX - ds.startX;

      if (!ds.activated) {
        if (Math.abs(deltaX) < 3) return;
        ds.activated = true;
        dragRef.current = { ...ds, activated: true };
        setDragState(prev => prev ? { ...prev, activated: true } : null);
      }

      const deltaDays = Math.round((deltaX / ds.containerWidth) * totalDays);

      let newStart = ds.origStartDate;
      let newDays = ds.origDays;

      if (ds.mode === 'move') {
        newStart = addDays(ds.origStartDate, deltaDays);
      } else if (ds.mode === 'resize-right') {
        newDays = Math.max(1, ds.origDays + deltaDays);
      } else if (ds.mode === 'resize-left') {
        newStart = addDays(ds.origStartDate, deltaDays);
        newDays = Math.max(1, ds.origDays - deltaDays);
      }

      setDragPreview({ taskId: ds.taskId, startDate: newStart, days: newDays });
    };

    const handleMouseUp = () => {
      const ds = dragRef.current;
      if (ds?.activated && dragPreview && onUpdateTaskDate) {
        // Store pending drag instead of applying immediately
        setPendingDrag({
          workflowId: ds.workflowId,
          taskId: ds.taskId,
          startDate: dragPreview.startDate,
          days: dragPreview.days,
        });
        // Keep dragPreview visible (don't clear it)
      } else {
        setDragPreview(null);
      }
      dragRef.current = null;
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, totalDays, onUpdateTaskDate, dragPreview]);

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

  const handleConfirmDrag = () => {
    if (pendingDrag && onUpdateTaskDate) {
      onUpdateTaskDate(pendingDrag.workflowId, pendingDrag.taskId, pendingDrag.startDate, pendingDrag.days);
    }
    setPendingDrag(null);
    setDragPreview(null);
  };

  const handleCancelDrag = () => {
    setPendingDrag(null);
    setDragPreview(null);
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Añade fechas de inicio a las tareas para ver el cronograma</p>
      </div>
    );
  }

  return (
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
                  const isDragging = dragState?.activated && dragPreview?.taskId === task.id;
                  const displayStart = isDragging ? dragPreview!.startDate : task.startDate;
                  const displayDays = isDragging ? dragPreview!.days : task.estimatedDays;
                  const displayEnd = addDays(displayStart, displayDays);
                  const { left, width } = getBarPosition(displayStart, displayDays);
                  const dueDate = addDays(task.startDate, task.estimatedDays);
                  const popoverId = `${workflow.id}-${task.id}`;
                  const isSelected = selectedTaskIds?.has(task.id) ?? false;

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
                      <GanttBarRow
                        task={task}
                        left={left}
                        width={width}
                        dueDate={dueDate}
                        displayStart={displayStart}
                        displayEnd={displayEnd}
                        popoverId={popoverId}
                        isSelected={isSelected}
                        isDragging={!!isDragging}
                        openPopover={openPopover}
                        setOpenPopover={setOpenPopover}
                        editingDateType={editingDateType}
                        setEditingDateType={setEditingDateType}
                        todayPosition={todayPosition}
                        onTaskSelect={onTaskSelect}
                        onBarMouseDown={handleBarMouseDown}
                        workflowId={workflow.id}
                        handleStartDateSelect={handleStartDateSelect}
                        handleEndDateSelect={handleEndDateSelect}
                        onHideTask={onHideTask}
                      />
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
        💡 Arrastra las barras para mover fechas · Clic derecho para más opciones
      </p>

      {/* Drag confirmation dialog */}
      <AlertDialog open={!!pendingDrag} onOpenChange={(open) => { if (!open) handleCancelDrag(); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">¿Guardar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDrag && (
                <>
                  Nuevo rango: <strong>{format(pendingDrag.startDate, 'dd MMM', { locale: es })}</strong> – <strong>{format(addDays(pendingDrag.startDate, pendingDrag.days), 'dd MMM', { locale: es })}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDrag}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDrag}>Sobreescribir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Extracted bar row ---

interface GanttBarRowProps {
  task: {
    id: string;
    startDate: Date;
    estimatedDays: number;
    status: TaskStatus;
    isSubtask: boolean;
    workflowId: string;
  };
  left: string;
  width: string;
  dueDate: Date;
  displayStart: Date;
  displayEnd: Date;
  popoverId: string;
  isSelected: boolean;
  isDragging: boolean;
  openPopover: string | null;
  setOpenPopover: (id: string | null) => void;
  editingDateType: 'start' | 'end';
  setEditingDateType: (t: 'start' | 'end') => void;
  todayPosition: number | null;
  onTaskSelect?: (id: string) => void;
  onBarMouseDown: (
    e: React.MouseEvent<HTMLDivElement>,
    taskId: string,
    workflowId: string,
    startDate: Date,
    estimatedDays: number,
    isSubtask: boolean,
    containerEl: HTMLElement | null,
  ) => void;
  workflowId: string;
  handleStartDateSelect: (wId: string, tId: string, endDate: Date, newStart: Date | undefined) => void;
  handleEndDateSelect: (wId: string, tId: string, startDate: Date, newEnd: Date | undefined) => void;
  onHideTask?: (taskId: string) => void;
}

function GanttBarRow({
  task, left, width, dueDate, displayStart, displayEnd, popoverId, isSelected, isDragging,
  openPopover, setOpenPopover, editingDateType, setEditingDateType,
  todayPosition, onTaskSelect, onBarMouseDown, workflowId,
  handleStartDateSelect, handleEndDateSelect, onHideTask,
}: GanttBarRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const dateLabel = `${format(displayStart, 'dd MMM', { locale: es })} – ${format(displayEnd, 'dd MMM', { locale: es })}`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 relative rounded",
        task.isSubtask ? "h-6 bg-muted/10" : "h-8 bg-muted/20"
      )}
    >
      {todayPosition !== null && (
        <div 
          className="absolute top-0 h-full w-0.5 bg-red-500/50 z-10 pointer-events-none"
          style={{ left: `${todayPosition}%` }}
        />
      )}

      {/* Context menu wraps the bar */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'absolute rounded transition-all group',
              STATUS_BAR_COLORS[task.status],
              task.isSubtask ? 'top-0.5 h-5' : 'top-1 h-6',
              task.isSubtask && 'opacity-70',
              isDragging
                ? 'opacity-90 ring-2 ring-primary shadow-lg'
                : isSelected
                  ? 'ring-2 ring-primary ring-offset-1'
                  : 'hover:ring-2 hover:ring-primary/50',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={{ left, width, minWidth: '16px' }}
            onMouseDown={(e) => {
              onBarMouseDown(e, task.id, workflowId, task.startDate, task.estimatedDays, task.isSubtask, containerRef.current);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTaskSelect?.(task.id);
            }}
          >
            {/* Resize handles */}
            <div className="absolute left-0 top-0 w-1.5 h-full cursor-ew-resize rounded-l opacity-0 group-hover:opacity-100 bg-foreground/20" />
            <div className="absolute right-0 top-0 w-1.5 h-full cursor-ew-resize rounded-r opacity-0 group-hover:opacity-100 bg-foreground/20" />

            {/* Inline date label - appears on hover or during drag */}
            <span
              className={cn(
                "absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-muted-foreground pointer-events-none transition-opacity pl-2",
                isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              style={{ left: '100%' }}
            >
              {dateLabel}
            </span>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="bg-popover border border-border shadow-md z-50">
          {onHideTask && (
            <ContextMenuItem onClick={() => onHideTask(task.id)} className="gap-2 text-sm">
              <EyeOff className="w-3.5 h-3.5" />
              Ocultar tarea
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => {
              setOpenPopover(popoverId);
              setEditingDateType('start');
            }}
            className="gap-2 text-sm"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Abrir calendario
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Calendar popover (opened from context menu) */}
      <Popover 
        open={openPopover === popoverId} 
        onOpenChange={(open) => {
          setOpenPopover(open ? popoverId : null);
          if (open) setEditingDateType('start');
        }}
      >
        <PopoverTrigger asChild>
          <span className="sr-only">calendar trigger</span>
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
                  handleStartDateSelect(workflowId, task.id, dueDate, date);
                } else {
                  handleEndDateSelect(workflowId, task.id, task.startDate!, date);
                }
                setOpenPopover(null);
              }}
              disabled={(date) => {
                if (editingDateType === 'end') return date <= task.startDate!;
                if (editingDateType === 'start') return date >= dueDate;
                return false;
              }}
              modifiers={{
                otherDate: editingDateType === 'start' ? [dueDate] : [task.startDate!],
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
  );
}
