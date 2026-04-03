import React, { Fragment } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { differenceInDays } from 'date-fns';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ListTodo,
  Calendar as CalendarIcon,
  Bell,
  StickyNote,
  MessageCircle,
  CheckCheck,
  Send,
  AtSign,
  GripVertical,
  CheckCircle2,
  Circle,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import MultiAnchorSelector from '@/components/lanzamientos/MultiAnchorSelector';
import TaskDatePopover from '@/components/lanzamientos/TaskDatePopover';
import { ResponsibleSelector, type ResponsibleRef } from '@/components/releases/ResponsibleSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

export type SubtaskType = 'full' | 'checkbox' | 'note' | 'comment';

export interface CommentMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface Subtask {
  id: string;
  name: string;
  type: SubtaskType;
  responsible?: string;
  responsible_ref?: ResponsibleRef | null;
  startDate?: Date | null;
  estimatedDays?: number;
  dueDate?: Date | null;
  reminderDays?: number[] | null;
  status?: TaskStatus;
  anchoredTo?: string[];
  completed?: boolean;
  content?: string;
  directedTo?: ResponsibleRef | null;
  thread?: CommentMessage[];
  resolved?: boolean;
}

export interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  responsible_ref?: ResponsibleRef | null;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  anchoredTo?: string[];
  customStartDate?: boolean;
  subtasks?: Subtask[];
  expanded?: boolean;
}

export interface WorkflowSection {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  tasks: ReleaseTask[];
}

// ─── Sortable Subtask Row ─────────────────────────────────────────────────────

function SortableSubtaskRow({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="opacity-0 group-hover/subtask-drag:opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted shrink-0"
      aria-label="Arrastrar subtarea"
    >
      <GripVertical className="w-3 h-3 text-muted-foreground" />
    </button>
  );

  return (
    <TableRow ref={setNodeRef} style={style} className="group/subtask-drag border-0">
      {children(dragHandle)}
    </TableRow>
  );
}

// ─── SortableWorkflowCard ─────────────────────────────────────────────────────

export interface SortableWorkflowCardProps {
  workflow: WorkflowSection;
  openSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  updateTask: (workflowId: string, taskId: string, updates: Partial<ReleaseTask>) => void;
  onUpdateTaskStatus: (workflowId: string, taskId: string, status: TaskStatus) => void;
  addTask: (workflowId: string) => void;
  requestDeleteTask: (workflowId: string, taskId: string) => void;
  toggleTaskExpanded: (workflowId: string, taskId: string) => void;
  addSubtask: (workflowId: string, taskId: string) => void;
  addChecklistItem: (workflowId: string, taskId: string) => void;
  addNote: (workflowId: string, taskId: string) => void;
  addComment: (workflowId: string, taskId: string) => void;
  updateSubtask: (workflowId: string, taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (workflowId: string, taskId: string, subtaskId: string) => void;
  reorderSubtasks: (workflowId: string, taskId: string, oldIndex: number, newIndex: number) => void;
  handleTaskDateUpdate: (workflowId: string, taskId: string, newStartDate: Date, newEstimatedDays: number) => void;
  availableTasksForAnchor: { id: string; name: string; workflowId: string; workflowName: string }[];
  getTaskName: (taskId: string) => string;
  getDueDate: (startDate: Date | null, days: number) => Date | null;
  release: any;
  STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[];
  selectedTaskIds: Set<string>;
  toggleTaskSelect: (taskId: string) => void;
  isTaskBlocked: (task: ReleaseTask) => boolean;
}

export function SortableWorkflowCard({
  workflow,
  openSections,
  toggleSection,
  updateTask,
  onUpdateTaskStatus,
  addTask,
  requestDeleteTask,
  toggleTaskExpanded,
  addSubtask,
  addChecklistItem,
  addNote,
  addComment,
  updateSubtask,
  deleteSubtask,
  reorderSubtasks,
  handleTaskDateUpdate,
  availableTasksForAnchor,
  getTaskName,
  getDueDate,
  release,
  STATUS_OPTIONS: statusOptions,
  selectedTaskIds,
  toggleTaskSelect,
  isTaskBlocked,
}: SortableWorkflowCardProps) {
  const subtaskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workflow.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const Icon = workflow.icon;
  const sectionCompleted = workflow.tasks.filter(t => t.status === 'completado').length;
  const sectionTotal = workflow.tasks.length;
  const sectionPercent = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-l-4 ${workflow.color}`}>
        <Collapsible open={openSections[workflow.id]} onOpenChange={() => toggleSection(workflow.id)}>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-0">
            <div className="flex items-center justify-between pr-6 pl-2 py-4">
              <div className="flex items-center gap-2">
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted touch-none"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Arrastrar para reordenar"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </button>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-3 flex-1">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {sectionPercent}% ({sectionCompleted}/{sectionTotal})
                    </Badge>
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleTrigger asChild>
                <button className="p-1">
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 transition-transform duration-200',
                      openSections[workflow.id] && 'rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Tarea</TableHead>
                    <TableHead className="w-[110px]">Responsable</TableHead>
                    <TableHead className="w-[160px]">Fechas</TableHead>
                    <TableHead className="w-[110px]">Anclada a</TableHead>
                    <TableHead className="w-[100px]">Estado</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.tasks.map(task => {
                    const dueDate = getDueDate(task.startDate, task.estimatedDays);
                    const statusOption = statusOptions.find(s => s.value === task.status);
                    const hasSubtasks = (task.subtasks?.length || 0) > 0;
                    const completedSubtasks = (task.subtasks || []).filter(st =>
                      st.type === 'checkbox' ? st.completed : st.status === 'completado'
                    ).length;
                    const totalSubtasks = task.subtasks?.length || 0;

                    return (
                      <Fragment key={task.id}>
                        <TableRow 
                          data-task-status={task.status}
                          data-task-upcoming={
                            dueDate && task.status !== 'completado' && 
                            differenceInDays(dueDate, new Date()) <= 7 && differenceInDays(dueDate, new Date()) >= 0
                              ? 'true' : undefined
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => toggleTaskExpanded(workflow.id, task.id)}
                              >
                                {task.expanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </Button>
                              <Input
                                value={task.name}
                                onChange={e => updateTask(workflow.id, task.id, { name: e.target.value })}
                                className="h-8 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted"
                              />
                              {isTaskBlocked(task) && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>Bloqueada: esperando tareas predecesoras</TooltipContent>
                                </Tooltip>
                              )}
                              {hasSubtasks && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {completedSubtasks}/{totalSubtasks}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <ResponsibleSelector
                              value={task.responsible_ref ?? null}
                              onChange={(ref) =>
                                updateTask(workflow.id, task.id, {
                                  responsible_ref: ref,
                                  responsible: ref?.name || '',
                                })
                              }
                              artistId={release?.artist_id}
                              placeholder="Asignar"
                              compact
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <TaskDatePopover
                              startDate={task.startDate}
                              dueDate={dueDate}
                              placeholder="Fechas"
                              triggerClassName={cn(
                                'h-8 px-2 justify-start text-left font-normal text-xs',
                                !task.startDate && 'text-muted-foreground'
                              )}
                              onStartSelect={(date) => {
                                if (!date) return;
                                const newDays = dueDate
                                  ? Math.max(1, differenceInDays(dueDate, date))
                                  : Math.max(1, task.estimatedDays || 1);
                                handleTaskDateUpdate(workflow.id, task.id, date, newDays);
                              }}
                              onEndSelect={(date) => {
                                if (!date) return;
                                if (!task.startDate) {
                                  handleTaskDateUpdate(
                                    workflow.id,
                                    task.id,
                                    date,
                                    Math.max(1, task.estimatedDays || 1)
                                  );
                                  return;
                                }
                                const newDays = Math.max(1, differenceInDays(date, task.startDate));
                                handleTaskDateUpdate(workflow.id, task.id, task.startDate, newDays);
                              }}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <MultiAnchorSelector
                              value={task.anchoredTo || []}
                              onChange={(anchors) => updateTask(workflow.id, task.id, {
                                anchoredTo: anchors.length > 0 ? anchors : undefined
                              })}
                              availableTasks={availableTasksForAnchor}
                              currentTaskId={task.id}
                              getTaskName={getTaskName}
                              compact
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Select
                              value={task.status}
                              onValueChange={(value: TaskStatus) => onUpdateTaskStatus(workflow.id, task.id, value)}
                            >
                              <SelectTrigger className="h-8 border-0 bg-transparent px-1 w-auto">
                                <SelectValue>
                                  <Badge className={cn('font-normal text-xs px-2 py-0.5', statusOption?.color)}>
                                    {statusOption?.label}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <Badge className={cn('font-normal text-xs', option.color)}>
                                      {option.label}
                                    </Badge>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    title="Añadir subtarea"
                                  >
                                    <ListTodo className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => addSubtask(workflow.id, task.id)}>
                                    <ListTodo className="w-4 h-4 mr-2" />
                                    Subtarea completa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addChecklistItem(workflow.id, task.id)}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Casilla de verificación
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addNote(workflow.id, task.id)}>
                                    <StickyNote className="w-4 h-4 mr-2" />
                                    Nota (para un miembro)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addComment(workflow.id, task.id)}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Comentario (hilo)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => requestDeleteTask(workflow.id, task.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Subtasks rows - with drag reordering */}
                        {task.expanded && (() => {
                          const subtaskList = task.subtasks || [];
                          const handleSubtaskDragEnd = (event: DragEndEvent) => {
                            const { active, over } = event;
                            if (!over || active.id === over.id) return;
                            const oldIndex = subtaskList.findIndex(s => s.id === active.id);
                            const newIndex = subtaskList.findIndex(s => s.id === String(over.id));
                            if (oldIndex !== -1 && newIndex !== -1) {
                              reorderSubtasks(workflow.id, task.id, oldIndex, newIndex);
                            }
                          };
                          return (
                          <DndContext sensors={subtaskSensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                            <SortableContext items={subtaskList.map(s => s.id)} strategy={verticalListSortingStrategy}>
                              {subtaskList.map(subtask => {
                          if (subtask.type === 'note') {
                            return (
                              <SortableSubtaskRow key={subtask.id} id={subtask.id}>
                                {(dragHandle) => <>
                                <TableCell colSpan={5}>
                                  <div className="flex flex-col gap-2 pl-2">
                                    <div className="flex items-center gap-2">
                                      {dragHandle}
                                      <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span className="text-xs text-muted-foreground">Nota para:</span>
                                      <ResponsibleSelector
                                        artistId={release?.artist_id || null}
                                        value={subtask.directedTo || null}
                                        onChange={(ref) => updateSubtask(workflow.id, task.id, subtask.id, { directedTo: ref })}
                                        placeholder="Seleccionar destinatario"
                                      />
                                    </div>
                                    <Textarea
                                      value={subtask.content || ''}
                                      onChange={e => updateSubtask(workflow.id, task.id, subtask.id, { content: e.target.value })}
                                      placeholder="Escribe una nota para este miembro del equipo..."
                                      className="min-h-[50px] border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-sm flex-1 resize-none ml-1"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteSubtask(workflow.id, task.id, subtask.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                                </>}
                              </SortableSubtaskRow>
                            );
                          }

                          if (subtask.type === 'comment') {
                            return (
                              <SortableSubtaskRow key={subtask.id} id={subtask.id}>
                                {(dragHandle) => <>
                                <TableCell colSpan={5}>
                                  <div className="flex flex-col gap-2 pl-2">
                                    <div className="flex items-center gap-2">
                                      {dragHandle}
                                      <MessageCircle className="w-4 h-4 text-blue-500 shrink-0" />
                                      <span className="text-xs font-medium">
                                        {subtask.resolved ? 'Hilo resuelto' : 'Hilo de comentarios'}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs ml-auto"
                                        onClick={() => updateSubtask(workflow.id, task.id, subtask.id, { resolved: !subtask.resolved })}
                                      >
                                        {subtask.resolved ? (
                                          <><CheckCheck className="w-3 h-3 mr-1 text-green-500" /> Reabrir</>
                                        ) : (
                                          <><CheckCheck className="w-3 h-3 mr-1" /> Resolver</>
                                        )}
                                      </Button>
                                    </div>
                                    {(subtask.thread || []).map((msg, idx) => (
                                      <div key={msg.id || idx} className="flex items-start gap-2 ml-1">
                                        <AtSign className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                        <div className="flex-1 text-sm">
                                          <span className="font-medium text-xs">{msg.authorName}</span>
                                          <p className="text-muted-foreground">{msg.content}</p>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex items-center gap-2 ml-1">
                                      <Input
                                        placeholder="Escribe un comentario..."
                                        className="h-7 text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                            const newMsg: CommentMessage = {
                                              id: `msg-${Date.now()}`,
                                              authorId: 'current-user',
                                              authorName: 'Yo',
                                              content: e.currentTarget.value.trim(),
                                              createdAt: new Date(),
                                            };
                                            updateSubtask(workflow.id, task.id, subtask.id, {
                                              thread: [...(subtask.thread || []), newMsg],
                                            });
                                            e.currentTarget.value = '';
                                          }
                                        }}
                                      />
                                      <Send className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteSubtask(workflow.id, task.id, subtask.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                                </>}
                              </SortableSubtaskRow>
                            );
                          }

                          if (subtask.type === 'checkbox') {
                            const isOverdue = subtask.dueDate && !subtask.completed && new Date() > subtask.dueDate;
                            return (
                              <SortableSubtaskRow key={subtask.id} id={subtask.id}>
                                {(dragHandle) => <>
                                <TableCell colSpan={4}>
                                  <div className="flex items-center gap-2 pl-2">
                                    {dragHandle}
                                    <button
                                      onClick={() => updateSubtask(workflow.id, task.id, subtask.id, {
                                        completed: !subtask.completed
                                      })}
                                      className="shrink-0"
                                    >
                                      {subtask.completed ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </button>
                                    <Input
                                      value={subtask.name}
                                      onChange={e => updateSubtask(workflow.id, task.id, subtask.id, { name: e.target.value })}
                                      className={cn(
                                        'h-7 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-sm flex-1',
                                        subtask.completed && 'line-through text-muted-foreground'
                                      )}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          'h-7 text-xs font-normal gap-1',
                                          !subtask.dueDate && 'text-muted-foreground',
                                          isOverdue && 'text-destructive'
                                        )}
                                      >
                                        <CalendarIcon className="w-3 h-3" />
                                        {subtask.dueDate ? (
                                          <span className={cn(isOverdue && 'text-destructive')}>
                                            Vence: {format(subtask.dueDate, 'dd MMM', { locale: es })}
                                          </span>
                                        ) : (
                                          'Vencimiento'
                                        )}
                                        {subtask.reminderDays && subtask.reminderDays.length > 0 && (
                                          <Bell className="w-3 h-3 ml-1 text-amber-500" />
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <div className="p-3 space-y-3">
                                        <div>
                                          <p className="text-xs font-medium mb-2">Fecha de vencimiento</p>
                                          <Calendar
                                            mode="single"
                                            selected={subtask.dueDate || undefined}
                                            defaultMonth={subtask.dueDate || undefined}
                                            onSelect={(date) => updateSubtask(workflow.id, task.id, subtask.id, { dueDate: date })}
                                            initialFocus
                                            className="pointer-events-auto"
                                          />
                                        </div>
                                        <Separator />
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium flex items-center gap-1.5">
                                              <Bell className="w-3.5 h-3.5" />
                                              Recordatorio
                                            </p>
                                            {subtask.reminderDays && subtask.reminderDays.length > 0 && (
                                              <button
                                                onClick={() => updateSubtask(workflow.id, task.id, subtask.id, { reminderDays: null })}
                                                className="text-xs text-muted-foreground hover:text-foreground"
                                              >
                                                Quitar todo
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {[
                                              { value: 1, label: '1 día' },
                                              { value: 3, label: '3 días' },
                                              { value: 7, label: '1 semana' },
                                              { value: 14, label: '2 semanas' },
                                            ].map(option => {
                                              const currentReminders = subtask.reminderDays || [];
                                              const isSelected = currentReminders.includes(option.value);
                                              return (
                                                <button
                                                  key={option.value}
                                                  onClick={() => {
                                                    const updated = isSelected
                                                      ? currentReminders.filter(v => v !== option.value)
                                                      : [...currentReminders, option.value];
                                                    updateSubtask(workflow.id, task.id, subtask.id, {
                                                      reminderDays: updated.length > 0 ? updated : null,
                                                    });
                                                  }}
                                                  className={cn(
                                                    'px-2.5 py-1 text-xs rounded-md border transition-colors',
                                                    isSelected
                                                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
                                                      : 'border-border hover:bg-muted'
                                                  )}
                                                >
                                                  {option.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          <p className="text-[10px] text-muted-foreground">
                                            Aviso antes de la fecha de vencimiento
                                          </p>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteSubtask(workflow.id, task.id, subtask.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                   </Button>
                                </TableCell>
                                </>}
                              </SortableSubtaskRow>
                            );
                          }

                          // Full subtask type
                          const subtaskDueDate = getDueDate(subtask.startDate ?? null, subtask.estimatedDays ?? 0);
                          const subtaskStatusOption = statusOptions.find(s => s.value === subtask.status);

                          return (
                            <SortableSubtaskRow key={subtask.id} id={subtask.id}>
                              {(dragHandle) => <>
                              <TableCell>
                                <div className="flex items-center gap-1 pl-2">
                                  {dragHandle}
                                  <span className="text-muted-foreground mr-1">↳</span>
                                  <Input
                                    value={subtask.name}
                                    onChange={e => updateSubtask(workflow.id, task.id, subtask.id, { name: e.target.value })}
                                    className="h-7 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-sm"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <ResponsibleSelector
                                  value={subtask.responsible_ref ?? null}
                                  onChange={(ref) =>
                                    updateSubtask(workflow.id, task.id, subtask.id, {
                                      responsible_ref: ref,
                                      responsible: ref?.name || '',
                                    })
                                  }
                                  artistId={release?.artist_id}
                                  placeholder="Asignar..."
                                />
                              </TableCell>
                              <TableCell>
                                <TaskDatePopover
                                  startDate={subtask.startDate ?? null}
                                  dueDate={subtaskDueDate}
                                  placeholder="Seleccionar"
                                  triggerClassName={cn(
                                    'h-7 w-full justify-start text-left font-normal text-xs',
                                    !subtask.startDate && 'text-muted-foreground'
                                  )}
                                  onStartSelect={(date) => {
                                    if (!date) return;
                                    const newDays = subtaskDueDate
                                      ? Math.max(1, differenceInDays(subtaskDueDate, date))
                                      : Math.max(1, subtask.estimatedDays || 1);
                                    updateSubtask(workflow.id, task.id, subtask.id, {
                                      startDate: date,
                                      estimatedDays: newDays,
                                    });
                                  }}
                                  onEndSelect={(date) => {
                                    if (!date) return;
                                    if (!subtask.startDate) {
                                      updateSubtask(workflow.id, task.id, subtask.id, {
                                        startDate: date,
                                        estimatedDays: Math.max(1, subtask.estimatedDays || 1),
                                      });
                                      return;
                                    }
                                    const newDays = Math.max(1, differenceInDays(date, subtask.startDate));
                                    updateSubtask(workflow.id, task.id, subtask.id, {
                                      startDate: subtask.startDate,
                                      estimatedDays: newDays,
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <MultiAnchorSelector
                                  value={subtask.anchoredTo || []}
                                  onChange={(anchors) => updateSubtask(workflow.id, task.id, subtask.id, {
                                    anchoredTo: anchors.length > 0 ? anchors : undefined
                                  })}
                                  availableTasks={availableTasksForAnchor.filter(t => t.id !== task.id)}
                                  currentTaskId={subtask.id}
                                  getTaskName={getTaskName}
                                  compact
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={subtask.status}
                                  onValueChange={(value: TaskStatus) => updateSubtask(workflow.id, task.id, subtask.id, { status: value })}
                                >
                                  <SelectTrigger className="h-7 border-0 bg-transparent">
                                    <SelectValue>
                                      <Badge className={cn('font-normal text-xs', subtaskStatusOption?.color)}>
                                        {subtaskStatusOption?.label}
                                      </Badge>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <Badge className={cn('font-normal', option.color)}>
                                          {option.label}
                                        </Badge>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteSubtask(workflow.id, task.id, subtask.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                              </>}
                              </SortableSubtaskRow>
                          );
                        })}
                            </SortableContext>
                          </DndContext>
                          );
                        })()}
                        {/* Add subtask inline button when expanded */}
                        {task.expanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/30">
                            <TableCell colSpan={6}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground ml-2"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Añadir elemento
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem onClick={() => addSubtask(workflow.id, task.id)}>
                                    <ListTodo className="w-4 h-4 mr-2" />
                                    Subtarea completa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addChecklistItem(workflow.id, task.id)}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Casilla de verificación
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addNote(workflow.id, task.id)}>
                                    <StickyNote className="w-4 h-4 mr-2" />
                                    Nota (para un miembro)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addComment(workflow.id, task.id)}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Comentario (hilo)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-muted-foreground"
                onClick={() => addTask(workflow.id)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Añadir tarea
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
