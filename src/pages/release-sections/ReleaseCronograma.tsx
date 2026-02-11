import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ChevronDown, 
  ChevronRight,
  Plus, 
  Trash2,
  Music,
  Palette,
  Package,
  Video,
  Megaphone,
  Mic2,
  List,
  GanttChart as GanttIcon,
  ArrowLeft,
  RefreshCw,
  Undo2,
  Sparkles,
  CheckCircle2,
  Circle,
  ListTodo,
  Calendar as CalendarIcon,
  Bell,
  StickyNote,
  MessageCircle,
  CheckCheck,
  Send,
  AtSign,
  EyeOff,
  Eye,
  X,
  GripVertical,
  Cloud,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import AnchorDependencyDialog from '@/components/lanzamientos/AnchorDependencyDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import MultiAnchorSelector from '@/components/lanzamientos/MultiAnchorSelector';
import TaskDatePopover from '@/components/lanzamientos/TaskDatePopover';
import { ResponsibleSelector, type ResponsibleRef } from '@/components/releases/ResponsibleSelector';
import CronogramaSetupWizard from '@/components/releases/CronogramaSetupWizard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import GanttChart from '@/components/lanzamientos/GanttChart';
import { useRelease, useTracks, useReleaseMilestones, type ReleaseMilestone } from '@/hooks/useReleases';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { 
  generateTimelineFromConfig, 
  groupTasksByWorkflow,
  type ReleaseConfig,
  type GeneratedTask 
} from '@/lib/releaseTimelineTemplates';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

type SubtaskType = 'full' | 'checkbox' | 'note' | 'comment';

interface CommentMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

interface Subtask {
  id: string;
  name: string;
  type: SubtaskType;
  // Full subtask fields
  responsible?: string;
  responsible_ref?: ResponsibleRef | null;
  startDate?: Date | null;
  estimatedDays?: number;
  // Checkbox fields
  dueDate?: Date | null;
  reminderDays?: number[] | null; // Days before due date to remind (supports multiple)
  status?: TaskStatus;
  anchoredTo?: string[]; // Support multiple anchors like main tasks
  completed?: boolean;
  // Note fields (directed to a specific person)
  content?: string;
  directedTo?: ResponsibleRef | null;
  // Comment thread fields
  thread?: CommentMessage[];
  resolved?: boolean;
}

interface ReleaseTask {
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

interface WorkflowSection {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  tasks: ReleaseTask[];
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-muted text-muted-foreground' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'completado', label: 'Completado', color: 'bg-green-500/20 text-green-600' },
  { value: 'retrasado', label: 'Retrasado', color: 'bg-red-500/20 text-red-600' },
];

const WORKFLOW_METADATA: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  audio: { name: 'Flujo de Audio', icon: Music, color: 'border-l-blue-500' },
  visual: { name: 'Flujo Visual y Arte', icon: Palette, color: 'border-l-pink-500' },
  fabricacion: { name: 'Flujo de Fabricación', icon: Package, color: 'border-l-yellow-500' },
  contenido: { name: 'Flujo Contenido Promocional', icon: Video, color: 'border-l-purple-500' },
  marketing: { name: 'Marketing (Waterfall)', icon: Megaphone, color: 'border-l-orange-500' },
  directo: { name: 'Flujo de Directo', icon: Mic2, color: 'border-l-green-500' },
};

// Default empty workflows structure
const EMPTY_WORKFLOWS: WorkflowSection[] = Object.entries(WORKFLOW_METADATA).map(([id, meta]) => ({
  id,
  name: meta.name,
  icon: meta.icon,
  color: meta.color,
  tasks: [],
}));

type ViewMode = 'list' | 'gantt';

// --- Sortable Workflow Card Component ---
interface SortableWorkflowCardProps {
  workflow: WorkflowSection;
  openSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  updateTask: (workflowId: string, taskId: string, updates: Partial<ReleaseTask>) => void;
  addTask: (workflowId: string) => void;
  requestDeleteTask: (workflowId: string, taskId: string) => void;
  toggleTaskExpanded: (workflowId: string, taskId: string) => void;
  addSubtask: (workflowId: string, taskId: string) => void;
  addChecklistItem: (workflowId: string, taskId: string) => void;
  addNote: (workflowId: string, taskId: string) => void;
  addComment: (workflowId: string, taskId: string) => void;
  updateSubtask: (workflowId: string, taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (workflowId: string, taskId: string, subtaskId: string) => void;
  handleTaskDateUpdate: (workflowId: string, taskId: string, newStartDate: Date, newEstimatedDays: number) => void;
  availableTasksForAnchor: { id: string; name: string; workflowId: string; workflowName: string }[];
  getTaskName: (taskId: string) => string;
  getDueDate: (startDate: Date | null, days: number) => Date | null;
  release: any;
  STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[];
  selectedTaskIds: Set<string>;
  toggleTaskSelect: (taskId: string) => void;
}

function SortableWorkflowCard({
  workflow,
  openSections,
  toggleSection,
  updateTask,
  addTask,
  requestDeleteTask,
  toggleTaskExpanded,
  addSubtask,
  addChecklistItem,
  addNote,
  addComment,
  updateSubtask,
  deleteSubtask,
  handleTaskDateUpdate,
  availableTasksForAnchor,
  getTaskName,
  getDueDate,
  release,
  STATUS_OPTIONS: statusOptions,
  selectedTaskIds,
  toggleTaskSelect,
}: SortableWorkflowCardProps) {
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
                        <TableRow>
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
                              onValueChange={(value: TaskStatus) => updateTask(workflow.id, task.id, { status: value })}
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
                        {/* Subtasks rows */}
                        {task.expanded && (task.subtasks || []).map(subtask => {
                          if (subtask.type === 'note') {
                            return (
                              <TableRow key={subtask.id} className="bg-amber-50/50 dark:bg-amber-950/20">
                                <TableCell colSpan={5}>
                                  <div className="flex flex-col gap-2 pl-8">
                                    <div className="flex items-center gap-2">
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
                                      className="min-h-[50px] border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-sm flex-1 resize-none ml-6"
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
                              </TableRow>
                            );
                          }

                          if (subtask.type === 'comment') {
                            return (
                              <TableRow key={subtask.id} className={cn(
                                "border-l-2",
                                subtask.resolved
                                  ? "bg-green-50/50 dark:bg-green-950/20 border-l-green-500"
                                  : "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500"
                              )}>
                                <TableCell colSpan={5}>
                                  <div className="flex flex-col gap-2 pl-8">
                                    <div className="flex items-center gap-2">
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
                                      <div key={msg.id || idx} className="flex items-start gap-2 ml-6">
                                        <AtSign className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                        <div className="flex-1 text-sm">
                                          <span className="font-medium text-xs">{msg.authorName}</span>
                                          <p className="text-muted-foreground">{msg.content}</p>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex items-center gap-2 ml-6">
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
                              </TableRow>
                            );
                          }

                          if (subtask.type === 'checkbox') {
                            const isOverdue = subtask.dueDate && !subtask.completed && new Date() > subtask.dueDate;
                            return (
                              <TableRow key={subtask.id} className="bg-muted/30">
                                <TableCell colSpan={4}>
                                  <div className="flex items-center gap-2 pl-8">
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
                                              { value: 1, label: '1d' },
                                              { value: 2, label: '2d' },
                                              { value: 3, label: '3d' },
                                              { value: 5, label: '5d' },
                                              { value: 7, label: '1sem' },
                                              { value: 14, label: '2sem' },
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
                              </TableRow>
                            );
                          }

                          // Full subtask type
                          const subtaskDueDate = getDueDate(subtask.startDate ?? null, subtask.estimatedDays ?? 0);
                          const subtaskStatusOption = statusOptions.find(s => s.value === subtask.status);

                          return (
                            <TableRow key={subtask.id} className="bg-muted/30">
                              <TableCell>
                                <div className="flex items-center gap-1 pl-8">
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
                            </TableRow>
                          );
                        })}
                        {/* Add subtask inline button when expanded */}
                        {task.expanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/30">
                            <TableCell colSpan={6}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground ml-8"
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

export default function ReleaseCronograma() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading } = useRelease(id);
  const { data: tracks = [] } = useTracks(id);
  const { data: savedMilestones = [], isLoading: loadingMilestones } = useReleaseMilestones(id);
  
  // Load workflow order from localStorage
  const [workflows, setWorkflows] = useState<WorkflowSection[]>(() => {
    try {
      const stored = localStorage.getItem(`workflow_order_${id}`);
      if (stored) {
        const order: string[] = JSON.parse(stored);
        const sorted = [...EMPTY_WORKFLOWS].sort((a, b) => {
          const ai = order.indexOf(a.id);
          const bi = order.indexOf(b.id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        return sorted;
      }
    } catch { /* ignore */ }
    return EMPTY_WORKFLOWS;
  });
  // Undo stack
  const [undoStack, setUndoStack] = useState<WorkflowSection[][]>([]);

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [JSON.parse(JSON.stringify(workflows)), ...prev].slice(0, 20));
  }, [workflows]);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      const [lastState, ...rest] = prev;
      if (lastState) {
        // Restore icons from metadata since they can't be serialized
        const restored = lastState.map(w => {
          const meta = WORKFLOW_METADATA[w.id];
          return meta ? { ...w, icon: meta.icon } : w;
        });
        setWorkflows(restored);
      }
      return rest;
    });
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(WORKFLOW_METADATA).map(id => [id, true]))
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWorkflows(prev => {
      const oldIndex = prev.findIndex(w => w.id === active.id);
      const newIndex = prev.findIndex(w => w.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(`workflow_order_${id}`, JSON.stringify(reordered.map(w => w.id)));
      return reordered;
    });
  }, [id]);
  const [showWizard, setShowWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Regenerate confirmation state
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState<'keep' | 'overwrite' | null>(null);

  // Selection & hiding state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`hidden_tasks_${id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [showHiddenDialog, setShowHiddenDialog] = useState(false);

  // Persist hidden tasks
  const updateHiddenTasks = useCallback((newSet: Set<string>) => {
    setHiddenTaskIds(newSet);
    localStorage.setItem(`hidden_tasks_${id}`, JSON.stringify([...newSet]));
  }, [id]);

  // Ctrl+Z / Cmd+Z keyboard shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const hideSelectedTasks = useCallback(() => {
    const newHidden = new Set(hiddenTaskIds);
    selectedTaskIds.forEach(id => newHidden.add(id));
    updateHiddenTasks(newHidden);
    setSelectedTaskIds(new Set());
  }, [hiddenTaskIds, selectedTaskIds, updateHiddenTasks]);

  const restoreTask = useCallback((taskId: string) => {
    const newHidden = new Set(hiddenTaskIds);
    newHidden.delete(taskId);
    updateHiddenTasks(newHidden);
  }, [hiddenTaskIds, updateHiddenTasks]);

  const restoreAllTasks = useCallback(() => {
    updateHiddenTasks(new Set());
  }, [updateHiddenTasks]);

  const toggleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);
  
  // Delete task confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{
    workflowId: string;
    taskId: string;
    taskName: string;
    isCompleted: boolean;
  } | null>(null);

  // Gantt context menu dialog state (responsible / anchor)
  const [ganttContextDialog, setGanttContextDialog] = useState<{
    type: 'responsible' | 'anchor';
    workflowId: string;
    taskId: string;
  } | null>(null);

  const ganttContextTask = useMemo(() => {
    if (!ganttContextDialog) return null;
    const wf = workflows.find(w => w.id === ganttContextDialog.workflowId);
    return wf?.tasks.find(t => t.id === ganttContextDialog.taskId) ?? null;
  }, [ganttContextDialog, workflows]);
  
  // Anchor dependency dialog state
  const [anchorDialogOpen, setAnchorDialogOpen] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<{
    workflowId: string;
    taskId: string;
    newStartDate: Date;
    newEstimatedDays: number;
    oldStartDate: Date;
    daysDelta: number;
    dependentTasks: { id: string; name: string; workflowId: string; workflowName: string }[];
  } | null>(null);

  // Number of songs - use tracks count or default to 1
  const numSongs = useMemo(() => Math.max(tracks.length, 1), [tracks]);

  // Track whether initial load has completed (to avoid auto-saving on mount)
  const hasInitializedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load saved milestones into workflows on mount
  useEffect(() => {
    if (savedMilestones.length > 0) {
      const tasksByCategory: Record<string, ReleaseTask[]> = {};
      
      savedMilestones.forEach((m: any) => {
        const category = m.category || 'marketing';
        if (!tasksByCategory[category]) {
          tasksByCategory[category] = [];
        }

        const meta = (m.metadata && typeof m.metadata === 'object') ? m.metadata : {};
        
        tasksByCategory[category].push({
          id: m.id,
          name: m.title,
          responsible: m.responsible || '',
          responsible_ref: meta.responsible_ref || null,
          startDate: m.due_date ? new Date(m.due_date) : null,
          estimatedDays: meta.estimatedDays ?? 7,
          status: (m.status === 'pending' ? 'pendiente' : 
                   m.status === 'in_progress' ? 'en_proceso' :
                   m.status === 'completed' ? 'completado' : 
                   m.status === 'delayed' ? 'retrasado' : 'pendiente') as TaskStatus,
          anchoredTo: meta.anchoredTo || undefined,
          customStartDate: meta.customStartDate || undefined,
          subtasks: meta.subtasks || undefined,
          _sortOrder: m.sort_order ?? 0,
        } as ReleaseTask & { _sortOrder: number });
      });

      // Sort tasks by sort_order within each category
      Object.keys(tasksByCategory).forEach(cat => {
        tasksByCategory[cat].sort((a: any, b: any) => (a._sortOrder ?? 0) - (b._sortOrder ?? 0));
        tasksByCategory[cat].forEach((t: any) => delete t._sortOrder);
      });

      setWorkflows(prev => 
        prev.map(workflow => ({
          ...workflow,
          tasks: tasksByCategory[workflow.id] || [],
        }))
      );

      // Mark as initialized after a tick to avoid triggering auto-save
      setTimeout(() => { hasInitializedRef.current = true; }, 100);
    } else {
      hasInitializedRef.current = true;
    }
  }, [savedMilestones]);

  // Check if timeline is empty (no tasks with dates)
  const isTimelineEmpty = useMemo(() => {
    const allTasks = workflows.flatMap(w => w.tasks);
    return allTasks.length === 0 || allTasks.every(t => !t.startDate);
  }, [workflows]);

  // Has milestones in DB
  const hasSavedMilestones = savedMilestones.length > 0;

  // Save milestones to database (preserving task IDs and metadata)
  const saveMilestonesToDB = useCallback(async (workflowsToSave: WorkflowSection[], showToast = false) => {
    if (!id) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      // Delete existing milestones for this release
      await supabase
        .from('release_milestones')
        .delete()
        .eq('release_id', id);

      // Prepare milestones with metadata and sort_order, preserving task IDs
      const milestones = workflowsToSave.flatMap(workflow =>
        workflow.tasks.map((task, index) => ({
          id: task.id,
          release_id: id,
          title: task.name,
          due_date: task.startDate ? format(task.startDate, 'yyyy-MM-dd') : null,
          days_offset: null,
          is_anchor: !!task.anchoredTo,
          status: task.status === 'pendiente' ? 'pending' :
                  task.status === 'en_proceso' ? 'in_progress' :
                  task.status === 'completado' ? 'completed' :
                  task.status === 'retrasado' ? 'delayed' : 'pending',
          category: workflow.id,
          responsible: task.responsible || null,
          notes: null,
          sort_order: index,
          metadata: {
            estimatedDays: task.estimatedDays,
            anchoredTo: task.anchoredTo || null,
            customStartDate: task.customStartDate || null,
            subtasks: task.subtasks || null,
            responsible_ref: task.responsible_ref || null,
          },
        }))
      );

      if (milestones.length > 0) {
        const { error } = await supabase
          .from('release_milestones')
          .insert(milestones as any);

        if (error) throw error;
      }

      // Don't invalidate queries to avoid re-triggering load
      if (showToast) {
        toast.success('Cronograma guardado');
      }
      setSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving milestones:', error);
      toast.error('Error al guardar el cronograma');
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  // Auto-save with debounce (1.5s after last change)
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (!id) return;

    const timer = setTimeout(() => {
      saveMilestonesToDB(workflows);
    }, 1500);

    return () => clearTimeout(timer);
  }, [workflows, saveMilestonesToDB, id]);

  // Handle wizard generation and save to DB
  const handleGenerateFromWizard = useCallback(async (config: ReleaseConfig) => {
    const generatedTasks = generateTimelineFromConfig(config);
    const groupedTasks = groupTasksByWorkflow(generatedTasks);

    let finalWorkflows: WorkflowSection[];

    if (regenerateMode === 'keep') {
      // Merge mode: keep existing data, only update dates
      finalWorkflows = workflows.map(workflow => {
        const newTasks = groupedTasks[workflow.id] || [];
        const existingTasks = workflow.tasks;

        // For each generated task, try to find an existing match by name
        const mergedTasks: ReleaseTask[] = newTasks.map(genTask => {
          const existing = existingTasks.find(et => et.name === genTask.name);
          if (existing) {
            // Keep all existing data, only update dates
            return {
              ...existing,
              startDate: genTask.startDate,
              estimatedDays: genTask.estimatedDays,
            };
          }
          // New task from wizard
          return { ...genTask, responsible_ref: null } as ReleaseTask;
        });

        // Append existing tasks that weren't in the generated set
        const mergedNames = new Set(newTasks.map(t => t.name));
        const orphanTasks = existingTasks.filter(et => !mergedNames.has(et.name));

        return {
          ...workflow,
          tasks: [...mergedTasks, ...orphanTasks],
        };
      });
    } else {
      // Overwrite mode: current behavior
      finalWorkflows = EMPTY_WORKFLOWS.map(workflow => {
        const newTasks = groupedTasks[workflow.id] || [];
        return {
          ...workflow,
          tasks: newTasks.map(t => ({
            ...t,
            responsible_ref: null,
          })) as ReleaseTask[],
        };
      });
    }

    setWorkflows(finalWorkflows);
    setRegenerateMode(null);

    // Save to database (explicit save from wizard)
    await saveMilestonesToDB(finalWorkflows, true);
  }, [saveMilestonesToDB, regenerateMode, workflows]);

  // Get all tasks that are anchored to a given task
  const getDependentTasks = useCallback((sourceTaskId: string) => {
    const dependents: { id: string; name: string; workflowId: string; workflowName: string }[] = [];
    workflows.forEach(workflow => {
      workflow.tasks.forEach(task => {
        if (task.anchoredTo?.includes(sourceTaskId) && !task.customStartDate) {
          dependents.push({
            id: task.id,
            name: task.name,
            workflowId: workflow.id,
            workflowName: workflow.name,
          });
        }
      });
    });
    return dependents;
  }, [workflows]);

  // Get task name by ID
  const getTaskName = useCallback((taskId: string) => {
    for (const workflow of workflows) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) return task.name;
    }
    return '';
  }, [workflows]);

  // Available tasks for multi-anchor selector
  const availableTasksForAnchor = useMemo(() => {
    return workflows.flatMap(w => 
      w.tasks.map(t => ({
        id: t.id,
        name: t.name,
        workflowId: w.id,
        workflowName: w.name,
      }))
    );
  }, [workflows]);

  // Handle date update with anchor check
  const handleTaskDateUpdate = useCallback((
    workflowId: string,
    taskId: string,
    newStartDate: Date,
    newEstimatedDays: number
  ) => {
    const workflow = workflows.find(w => w.id === workflowId);
    const task = workflow?.tasks.find(t => t.id === taskId);
    
    if (!task || !task.startDate) {
      pushUndo();
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { ...w, tasks: w.tasks.map(t => 
              t.id === taskId ? { ...t, startDate: newStartDate, estimatedDays: newEstimatedDays } : t
            )}
          : w
      ));
      return;
    }

    const daysDelta = differenceInDays(newStartDate, task.startDate);
    const dependentTasks = getDependentTasks(taskId);

    if (dependentTasks.length > 0 && daysDelta !== 0) {
      setPendingDateChange({
        workflowId,
        taskId,
        newStartDate,
        newEstimatedDays,
        oldStartDate: task.startDate,
        daysDelta,
        dependentTasks,
      });
      setAnchorDialogOpen(true);
    } else {
      pushUndo();
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { ...w, tasks: w.tasks.map(t => 
              t.id === taskId ? { ...t, startDate: newStartDate, estimatedDays: newEstimatedDays } : t
            )}
          : w
      ));
    }
  }, [workflows, getDependentTasks]);

  // Handle anchor dialog confirmation
  const handleAnchorConfirm = useCallback((selectedTaskIds: string[]) => {
    if (!pendingDateChange) return;

    const { workflowId, taskId, newStartDate, newEstimatedDays, daysDelta, dependentTasks } = pendingDateChange;

    pushUndo();
    setWorkflows(prev => prev.map(w => {
      const updatedTasks = w.tasks.map(t => {
        if (t.id === taskId && w.id === workflowId) {
          return { ...t, startDate: newStartDate, estimatedDays: newEstimatedDays };
        }
        if (selectedTaskIds.includes(t.id) && t.startDate) {
          const isDependent = dependentTasks.some(dt => dt.id === t.id && dt.workflowId === w.id);
          if (isDependent) {
            return { ...t, startDate: addDays(t.startDate, daysDelta) };
          }
        }
        return t;
      });
      return { ...w, tasks: updatedTasks };
    }));

    setAnchorDialogOpen(false);
    setPendingDateChange(null);
  }, [pendingDateChange]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const updateTask = (workflowId: string, taskId: string, updates: Partial<ReleaseTask>) => {
    pushUndo();
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(task =>
                task.id === taskId ? { ...task, ...updates } : task
              ),
            }
          : workflow
      )
    );
  };

  const addTask = (workflowId: string) => {
    const newTask: ReleaseTask = {
      id: `${workflowId}-${Date.now()}`,
      name: 'Nueva tarea',
      responsible: '',
      responsible_ref: null,
      startDate: null,
      estimatedDays: 7,
      status: 'pendiente',
    };
    pushUndo();
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? { ...workflow, tasks: [...workflow.tasks, newTask] }
          : workflow
      )
    );
  };

  // Request to delete a task - show confirmation dialog
  const requestDeleteTask = (workflowId: string, taskId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    const task = workflow?.tasks.find(t => t.id === taskId);
    if (task) {
      setTaskToDelete({
        workflowId,
        taskId,
        taskName: task.name,
        isCompleted: task.status === 'completado'
      });
      setDeleteDialogOpen(true);
    }
  };

  // Actually delete the task
  const confirmDeleteTask = () => {
    pushUndo();
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === taskToDelete.workflowId
          ? { ...workflow, tasks: workflow.tasks.filter(t => t.id !== taskToDelete.taskId) }
          : workflow
      )
    );
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
    toast.success('Tarea eliminada');
  };

  // Archive the task (mark as completed instead of deleting)
  const archiveTask = () => {
    if (!taskToDelete) return;
    updateTask(taskToDelete.workflowId, taskToDelete.taskId, { status: 'completado' });
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
    toast.success('Tarea marcada como completada');
  };

  // Toggle task expansion for subtasks
  const toggleTaskExpanded = (workflowId: string, taskId: string) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId ? { ...t, expanded: !t.expanded } : t
              ),
            }
          : workflow
      )
    );
  };

  // Add a full subtask to a task
  const addSubtask = (workflowId: string, taskId: string) => {
    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      name: 'Nueva subtarea',
      type: 'full',
      responsible: '',
      responsible_ref: null,
      startDate: null,
      estimatedDays: 3,
      status: 'pendiente',
    };
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId
                  ? { ...t, subtasks: [...(t.subtasks || []), newSubtask], expanded: true }
                  : t
              ),
            }
          : workflow
      )
    );
  };

  // Add a checkbox item to a task
  const addChecklistItem = (workflowId: string, taskId: string) => {
    const newItem: Subtask = {
      id: `checklist-${Date.now()}`,
      name: 'Nuevo elemento',
      type: 'checkbox',
      completed: false,
    };
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId
                  ? { ...t, subtasks: [...(t.subtasks || []), newItem], expanded: true }
                  : t
              ),
            }
          : workflow
      )
    );
  };

  // Add a note (directed to a team member)
  const addNote = (workflowId: string, taskId: string) => {
    const newNote: Subtask = {
      id: `note-${Date.now()}`,
      name: '',
      type: 'note',
      content: '',
      directedTo: null,
    };
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId
                  ? { ...t, subtasks: [...(t.subtasks || []), newNote], expanded: true }
                  : t
              ),
            }
          : workflow
      )
    );
  };

  // Add a comment thread
  const addComment = (workflowId: string, taskId: string) => {
    const newComment: Subtask = {
      id: `comment-${Date.now()}`,
      name: '',
      type: 'comment',
      thread: [],
      resolved: false,
    };
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId
                  ? { ...t, subtasks: [...(t.subtasks || []), newComment], expanded: true }
                  : t
              ),
            }
          : workflow
      )
    );
  };

  // Update a subtask
  const updateSubtask = (workflowId: string, taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId
                  ? {
                      ...t,
                      subtasks: (t.subtasks || []).map(st =>
                        st.id === subtaskId ? { ...st, ...updates } : st
                      ),
                    }
                  : t
              ),
            }
          : workflow
      )
    );
  };

  // Delete a subtask
  const deleteSubtask = (workflowId: string, taskId: string, subtaskId: string) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId
                  ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) }
                  : t
              ),
            }
          : workflow
      )
    );
  };

  const { totalTasks, completedTasks, progressPercent } = useMemo(() => {
    const allTasks = workflows.flatMap(w => w.tasks);
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'completado').length;
    return {
      totalTasks: total,
      completedTasks: completed,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [workflows]);

  const getDueDate = (startDate: Date | null, days: number): Date | null => {
    if (!startDate) return null;
    return addDays(startDate, days);
  };

  // Filter workflows that have tasks, excluding hidden tasks
  const workflowsWithTasks = useMemo(() => 
    workflows
      .map(w => ({
        ...w,
        tasks: w.tasks.filter(t => !hiddenTaskIds.has(t.id)),
      }))
      .filter(w => w.tasks.length > 0),
    [workflows, hiddenTaskIds]
  );

  // Get info about hidden tasks for the dialog
  const hiddenTasksInfo = useMemo(() => {
    const info: { id: string; name: string; workflowName: string }[] = [];
    workflows.forEach(w => {
      w.tasks.forEach(t => {
        if (hiddenTaskIds.has(t.id)) {
          info.push({ id: t.id, name: t.name, workflowName: w.name });
        }
      });
    });
    return info;
  }, [workflows, hiddenTaskIds]);

  if (isLoading || loadingMilestones) {
    return <Skeleton className="h-64 w-full" />;
  }

  // Show empty state with wizard prompt (only if no saved milestones)
  if (isTimelineEmpty && !hasSavedMilestones) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{release?.title}</p>
            <h1 className="text-2xl font-bold">Cronograma</h1>
          </div>
        </div>

        {/* Empty State Card */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Configura tu cronograma</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Responde algunas preguntas sobre tu lanzamiento y generaremos automáticamente 
              un cronograma con fechas sugeridas basadas en estándares de la industria musical.
            </p>
            <Button onClick={() => setShowWizard(true)} size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Configurar Cronograma
            </Button>
          </CardContent>
        </Card>

        {/* Wizard Dialog */}
        <CronogramaSetupWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          onGenerate={handleGenerateFromWizard}
          initialReleaseDate={release?.release_date ? new Date(release.release_date) : null}
          initialNumSongs={numSongs}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{release?.title}</p>
            <h1 className="text-2xl font-bold">Cronograma</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Guardando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Cloud className="w-3 h-3" />
              Guardado
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled={undoStack.length === 0} onClick={undo}>
                <Undo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Deshacer (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={() => {
            // If there are existing tasks, show confirmation first
            const hasTasks = workflows.some(w => w.tasks.length > 0);
            if (hasTasks) {
              setShowRegenerateConfirm(true);
            } else {
              setRegenerateMode('overwrite');
              setShowWizard(true);
            }
          }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar fechas
          </Button>
          {hiddenTasksInfo.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHiddenDialog(true)}>
              <EyeOff className="w-4 h-4 mr-2" />
              Ver ocultos ({hiddenTasksInfo.length})
            </Button>
          )}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="w-4 h-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="gantt" className="gap-2">
                <GanttIcon className="w-4 h-4" />
                Cronograma
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Compact Progress Bar + Selection controls */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-sm font-medium whitespace-nowrap">Progreso General</span>
        <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{completedTasks} de {totalTasks} completadas</span>
        <Badge variant="outline" className="text-[11px] px-1.5 py-0">{progressPercent}%</Badge>

        {selectedTaskIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedTaskIds.size} {selectedTaskIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
            </span>
            <Button size="sm" variant="default" onClick={hideSelectedTasks}>
              <EyeOff className="w-4 h-4 mr-1" />
              Ocultar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedTaskIds(new Set())}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* View Content */}
      {viewMode === 'gantt' ? (
        <Card>
          <CardContent className="pt-6">
            <GanttChart 
              workflows={workflowsWithTasks} 
              onUpdateTaskDate={handleTaskDateUpdate}
              onSetAnchor={(workflowId, taskId, anchoredTo) => {
                updateTask(workflowId, taskId, { anchoredTo });
              }}
              onUpdateTaskStatus={(workflowId, taskId, status) => {
                updateTask(workflowId, taskId, { status });
              }}
              onOpenResponsible={(workflowId, taskId) => {
                setGanttContextDialog({ type: 'responsible', workflowId, taskId });
              }}
              onOpenAnchor={(workflowId, taskId) => {
                setGanttContextDialog({ type: 'anchor', workflowId, taskId });
              }}
              getTaskName={getTaskName}
              selectedTaskIds={selectedTaskIds}
              onTaskSelect={toggleTaskSelect}
              onHideTask={(taskId) => {
                const newHidden = new Set(hiddenTaskIds);
                newHidden.add(taskId);
                updateHiddenTasks(newHidden);
              }}
              onClearSelection={() => setSelectedTaskIds(new Set())}
            />
          </CardContent>
        </Card>
      ) : (
        /* Workflow Sections - List View */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={workflowsWithTasks.map(w => w.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4" onClick={() => setSelectedTaskIds(new Set())}>
            {workflowsWithTasks.map(workflow => (
              <SortableWorkflowCard
                key={workflow.id}
                workflow={workflow}
                openSections={openSections}
                toggleSection={toggleSection}
                updateTask={updateTask}
                addTask={addTask}
                requestDeleteTask={requestDeleteTask}
                toggleTaskExpanded={toggleTaskExpanded}
                addSubtask={addSubtask}
                addChecklistItem={addChecklistItem}
                addNote={addNote}
                addComment={addComment}
                updateSubtask={updateSubtask}
                deleteSubtask={deleteSubtask}
                handleTaskDateUpdate={handleTaskDateUpdate}
                availableTasksForAnchor={availableTasksForAnchor}
                getTaskName={getTaskName}
                getDueDate={getDueDate}
                release={release}
                STATUS_OPTIONS={STATUS_OPTIONS}
                selectedTaskIds={selectedTaskIds}
                toggleTaskSelect={toggleTaskSelect}
              />
            ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Ya tienes tareas configuradas
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p>¿Qué deseas hacer al regenerar el cronograma?</p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setRegenerateMode('keep');
                      setShowRegenerateConfirm(false);
                      setShowWizard(true);
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="font-medium text-foreground">Mantener datos existentes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Solo actualiza las fechas según la nueva configuración. Tus subtareas, notas y responsables se conservan.
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setRegenerateMode('overwrite');
                      setShowRegenerateConfirm(false);
                      setShowWizard(true);
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:border-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <p className="font-medium text-foreground">Sobreescribir todo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Genera un cronograma nuevo desde cero. Se eliminarán todos los cambios anteriores.
                    </p>
                  </button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Wizard Dialog */}
      <CronogramaSetupWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onGenerate={handleGenerateFromWizard}
        initialReleaseDate={release?.release_date ? new Date(release.release_date) : null}
        initialNumSongs={numSongs}
      />

      {/* Anchor Dependency Dialog */}
      <AnchorDependencyDialog
        open={anchorDialogOpen}
        onOpenChange={setAnchorDialogOpen}
        sourceName={pendingDateChange ? getTaskName(pendingDateChange.taskId) : ''}
        daysDelta={pendingDateChange?.daysDelta || 0}
        dependentTasks={pendingDateChange?.dependentTasks || []}
        onConfirm={handleAnchorConfirm}
      />

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Eliminar tarea
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ¿Estás seguro de que quieres eliminar <strong>"{taskToDelete?.taskName}"</strong>?
              </p>
              {!taskToDelete?.isCompleted && (
                <p className="text-muted-foreground">
                  Esta acción no se puede deshacer. Si la tarea está terminada, considera marcarla como completada para no perder la información.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!taskToDelete?.isCompleted && (
              <Button variant="outline" onClick={archiveTask} className="gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Marcar completada
              </Button>
            )}
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Hidden tasks dialog */}
      <Dialog open={showHiddenDialog} onOpenChange={setShowHiddenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tareas ocultas</DialogTitle>
            <DialogDescription>
              Estas tareas están ocultas en las vistas de lista y cronograma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {hiddenTasksInfo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay tareas ocultas</p>
            ) : (
              hiddenTasksInfo.map(task => (
                <div key={task.id} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <p className="text-xs text-muted-foreground">{task.workflowName}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreTask(task.id)}>
                    <Eye className="w-3 h-3 mr-1" />
                    Mostrar
                  </Button>
                </div>
              ))
            )}
          </div>
          {hiddenTasksInfo.length > 1 && (
            <Button variant="outline" className="w-full" onClick={restoreAllTasks}>
              Restaurar todas
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Gantt context menu dialog: Responsible / Anchor */}
      <Dialog open={!!ganttContextDialog} onOpenChange={(open) => { if (!open) setGanttContextDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{ganttContextDialog?.type === 'responsible' ? 'Asignar responsable' : 'Anclar tarea'}</DialogTitle>
            <DialogDescription>
              {ganttContextTask?.name}
            </DialogDescription>
          </DialogHeader>
          {ganttContextDialog?.type === 'responsible' && ganttContextTask && (
            <ResponsibleSelector
              value={ganttContextTask.responsible_ref ?? null}
              onChange={(ref) => {
                updateTask(ganttContextDialog.workflowId, ganttContextDialog.taskId, {
                  responsible_ref: ref,
                  responsible: ref?.name || '',
                });
                setGanttContextDialog(null);
              }}
              artistId={release?.artist_id}
              placeholder="Seleccionar responsable"
            />
          )}
          {ganttContextDialog?.type === 'anchor' && ganttContextTask && (() => {
            const currentAnchors = ganttContextTask.anchoredTo || [];
            const selectableTasks = availableTasksForAnchor.filter(
              t => t.id !== ganttContextDialog.taskId && !currentAnchors.includes(t.id)
            );
            const grouped = selectableTasks.reduce<Record<string, typeof selectableTasks>>((acc, task) => {
              if (!acc[task.workflowName]) acc[task.workflowName] = [];
              acc[task.workflowName].push(task);
              return acc;
            }, {});

            return (
              <div className="space-y-3">
                {/* Current anchors */}
                {currentAnchors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {currentAnchors.map(anchorId => (
                      <Badge
                        key={anchorId}
                        variant="secondary"
                        className="pl-2 pr-1 py-1 gap-1 text-xs"
                      >
                        <span className="truncate max-w-[140px]">{getTaskName(anchorId) || anchorId}</span>
                        <button
                          onClick={() => updateTask(ganttContextDialog.workflowId, ganttContextDialog.taskId, {
                            anchoredTo: currentAnchors.filter(id => id !== anchorId).length > 0
                              ? currentAnchors.filter(id => id !== anchorId)
                              : undefined,
                          })}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sin dependencias. La fecha se establecerá manualmente.
                  </p>
                )}

                {/* Add anchor selector */}
                {selectableTasks.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Añadir dependencia:</p>
                    <Command className="border rounded-lg">
                      <CommandInput placeholder="Buscar tarea..." className="h-8" />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>No hay tareas disponibles</CommandEmpty>
                        {Object.entries(grouped).map(([workflowName, tasks]) => (
                          <CommandGroup key={workflowName} heading={workflowName}>
                            {tasks.map(task => (
                              <CommandItem
                                key={task.id}
                                value={`${task.name} ${workflowName}`}
                                onSelect={() => {
                                  updateTask(ganttContextDialog.workflowId, ganttContextDialog.taskId, {
                                    anchoredTo: [...currentAnchors, task.id],
                                  });
                                }}
                                className="text-xs cursor-pointer"
                              >
                                <Plus className="w-3 h-3 mr-2" />
                                {task.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
