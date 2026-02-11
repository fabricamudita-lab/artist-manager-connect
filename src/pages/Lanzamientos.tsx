import { useState, useMemo, useCallback } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronDown, 
  Plus, 
  Trash2,
  Music,
  Palette,
  Package,
  Video,
  Megaphone,
  Mic2,
  List,
  GanttChart as GanttIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import AnchorDependencyDialog from '@/components/lanzamientos/AnchorDependencyDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import GanttChart from '@/components/lanzamientos/GanttChart';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  anchoredTo?: string[]; // IDs of tasks this one is anchored to
  customStartDate?: boolean; // Whether the date is manually set
}

interface WorkflowSection {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  tasks: ReleaseTask[];
}

export type { ReleaseTask, WorkflowSection, TaskStatus };

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-muted text-muted-foreground' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'completado', label: 'Completado', color: 'bg-green-500/20 text-green-600' },
  { value: 'retrasado', label: 'Retrasado', color: 'bg-red-500/20 text-red-600' },
];

const INITIAL_WORKFLOWS: WorkflowSection[] = [
  {
    id: 'audio',
    name: 'Flujo de Audio',
    icon: Music,
    color: 'border-l-blue-500',
    tasks: [
      { id: 'audio-1', name: 'Grabación', responsible: '', startDate: null, estimatedDays: 14, status: 'pendiente' },
      { id: 'audio-2', name: 'Edición/Limpieza', responsible: '', startDate: null, estimatedDays: 7, status: 'pendiente' },
      { id: 'audio-3', name: 'Mezcla', responsible: '', startDate: null, estimatedDays: 10, status: 'pendiente' },
      { id: 'audio-4', name: 'Mastering', responsible: '', startDate: null, estimatedDays: 5, status: 'pendiente' },
      { id: 'audio-5', name: 'Label Copy', responsible: '', startDate: null, estimatedDays: 2, status: 'pendiente' },
      { id: 'audio-6', name: 'Registro Legal', responsible: '', startDate: null, estimatedDays: 3, status: 'pendiente' },
    ],
  },
  {
    id: 'visual',
    name: 'Flujo Visual y Arte',
    icon: Palette,
    color: 'border-l-pink-500',
    tasks: [
      { id: 'visual-1', name: 'Planificación Fotos', responsible: '', startDate: null, estimatedDays: 5, status: 'pendiente' },
      { id: 'visual-2', name: 'Shooting', responsible: '', startDate: null, estimatedDays: 2, status: 'pendiente' },
      { id: 'visual-3', name: 'Diseño LP', responsible: '', startDate: null, estimatedDays: 10, status: 'pendiente' },
      { id: 'visual-4', name: 'Diseño CD', responsible: '', startDate: null, estimatedDays: 7, status: 'pendiente' },
      { id: 'visual-5', name: 'Fotos Oficiales', responsible: '', startDate: null, estimatedDays: 5, status: 'pendiente' },
      { id: 'visual-6', name: 'Adaptación Digital', responsible: '', startDate: null, estimatedDays: 3, status: 'pendiente' },
      { id: 'visual-7', name: 'Cartel Gira', responsible: '', startDate: null, estimatedDays: 5, status: 'pendiente' },
      { id: 'visual-8', name: 'Web', responsible: '', startDate: null, estimatedDays: 7, status: 'pendiente' },
    ],
  },
  {
    id: 'fabricacion',
    name: 'Flujo de Fabricación',
    icon: Package,
    color: 'border-l-yellow-500',
    tasks: [
      { id: 'fab-1', name: 'Envío a Fábrica', responsible: '', startDate: null, estimatedDays: 2, status: 'pendiente' },
      { id: 'fab-2', name: 'Test Pressing', responsible: '', startDate: null, estimatedDays: 14, status: 'pendiente' },
      { id: 'fab-3', name: 'Recepción Stock', responsible: '', startDate: null, estimatedDays: 21, status: 'pendiente' },
    ],
  },
  {
    id: 'contenido',
    name: 'Flujo Contenido Promocional',
    icon: Video,
    color: 'border-l-purple-500',
    tasks: [
      { id: 'cont-1', name: 'Visualisers', responsible: '', startDate: null, estimatedDays: 7, status: 'pendiente' },
      { id: 'cont-2', name: 'Clips Redes', responsible: '', startDate: null, estimatedDays: 5, status: 'pendiente' },
      { id: 'cont-3', name: 'Making Of', responsible: '', startDate: null, estimatedDays: 10, status: 'pendiente' },
      { id: 'cont-4', name: 'Entrevistas', responsible: '', startDate: null, estimatedDays: 3, status: 'pendiente' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing (Waterfall)',
    icon: Megaphone,
    color: 'border-l-orange-500',
    tasks: [
      { id: 'mkt-1', name: 'Single 1', responsible: '', startDate: null, estimatedDays: 14, status: 'pendiente' },
      { id: 'mkt-2', name: 'Single 2', responsible: '', startDate: null, estimatedDays: 14, status: 'pendiente' },
      { id: 'mkt-3', name: 'Single 3', responsible: '', startDate: null, estimatedDays: 14, status: 'pendiente' },
      { id: 'mkt-4', name: 'Focus Track', responsible: '', startDate: null, estimatedDays: 7, status: 'pendiente' },
      { id: 'mkt-5', name: 'Pre-Save', responsible: '', startDate: null, estimatedDays: 14, status: 'pendiente' },
      { id: 'mkt-6', name: 'Salida Digital', responsible: '', startDate: null, estimatedDays: 1, status: 'pendiente' },
      { id: 'mkt-7', name: 'Venta Física', responsible: '', startDate: null, estimatedDays: 1, status: 'pendiente' },
    ],
  },
  {
    id: 'directo',
    name: 'Flujo de Directo',
    icon: Mic2,
    color: 'border-l-green-500',
    tasks: [
      { id: 'dir-1', name: 'Diseño Luces', responsible: '', startDate: null, estimatedDays: 14, status: 'pendiente' },
      { id: 'dir-2', name: 'Ensayos Musicales', responsible: '', startDate: null, estimatedDays: 21, status: 'pendiente' },
      { id: 'dir-3', name: 'Stage/Residencia', responsible: '', startDate: null, estimatedDays: 7, status: 'pendiente' },
      { id: 'dir-4', name: 'Inicio Gira', responsible: '', startDate: null, estimatedDays: 1, status: 'pendiente' },
    ],
  },
];

type ViewMode = 'list' | 'gantt';

export default function Lanzamientos() {
  const [workflows, setWorkflows] = useState<WorkflowSection[]>(INITIAL_WORKFLOWS);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(INITIAL_WORKFLOWS.map(w => [w.id, true]))
  );
  
  // Anchor dependency dialog state
  const [anchorDialogOpen, setAnchorDialogOpen] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<{
    workflowId: string;
    taskId: string;
    newStartDate: Date;
    newEstimatedDays: number;
    oldStartDate: Date;
    daysDelta: number;
    dependentTasks: import('@/components/lanzamientos/AnchorDependencyDialog').DependentTask[];
  } | null>(null);

  // Helper: find a task across all workflows
  const findTask = useCallback((taskId: string) => {
    for (const w of workflows) {
      const t = w.tasks.find(t => t.id === taskId);
      if (t) return { task: t, workflowId: w.id, workflowName: w.name };
    }
    return null;
  }, [workflows]);

  // Recursive: get the full dependency chain
  const getFullDependencyChain = useCallback((
    sourceTaskId: string,
    daysDelta: number,
    depth = 1,
    visited = new Set<string>()
  ): import('@/components/lanzamientos/AnchorDependencyDialog').DependentTask[] => {
    if (visited.has(sourceTaskId)) return [];
    visited.add(sourceTaskId);
    const result: import('@/components/lanzamientos/AnchorDependencyDialog').DependentTask[] = [];
    workflows.forEach(workflow => {
      workflow.tasks.forEach(task => {
        if (task.anchoredTo?.includes(sourceTaskId) && !visited.has(task.id)) {
          const currentStart = task.startDate;
          const currentEnd = currentStart ? addDays(currentStart, task.estimatedDays) : null;
          const newStart = currentStart ? addDays(currentStart, daysDelta) : null;
          const newEnd = newStart ? addDays(newStart, task.estimatedDays) : null;
          const sourceInfo = findTask(sourceTaskId);
          let isConflict = true;
          if (daysDelta < 0 && currentStart && sourceInfo?.task.startDate) {
            const sourceNewEnd = addDays(addDays(sourceInfo.task.startDate, daysDelta), sourceInfo.task.estimatedDays);
            isConflict = sourceNewEnd > currentStart;
          }
          result.push({ id: task.id, name: task.name, workflowId: workflow.id, workflowName: workflow.name, depth, currentStartDate: currentStart, currentEndDate: currentEnd, newStartDate: newStart, newEndDate: newEnd, isConflict });
          result.push(...getFullDependencyChain(task.id, daysDelta, depth + 1, visited));
        }
      });
    });
    return result;
  }, [workflows, findTask]);

  // Get task name by ID
  const getTaskName = useCallback((taskId: string) => {
    for (const workflow of workflows) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) return task.name;
    }
    return '';
  }, [workflows]);

  // Handle date update with anchor check (recursive cascade)
  const handleTaskDateUpdate = useCallback((
    workflowId: string,
    taskId: string,
    newStartDate: Date,
    newEstimatedDays: number
  ) => {
    const workflow = workflows.find(w => w.id === workflowId);
    const task = workflow?.tasks.find(t => t.id === taskId);
    if (!task || !task.startDate) {
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
    const fullChain = getFullDependencyChain(taskId, daysDelta);
    const conflictTasks = fullChain.filter(t => t.isConflict);
    if (conflictTasks.length > 0 && daysDelta !== 0) {
      setPendingDateChange({ workflowId, taskId, newStartDate, newEstimatedDays, oldStartDate: task.startDate, daysDelta, dependentTasks: fullChain });
      setAnchorDialogOpen(true);
    } else {
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { ...w, tasks: w.tasks.map(t => 
              t.id === taskId ? { ...t, startDate: newStartDate, estimatedDays: newEstimatedDays } : t
            )}
          : w
      ));
    }
  }, [workflows, getFullDependencyChain]);

  // Handle anchor dialog confirmation
  const handleAnchorConfirm = useCallback((selectedTaskIds: string[]) => {
    if (!pendingDateChange) return;
    const { workflowId, taskId, newStartDate, newEstimatedDays, daysDelta } = pendingDateChange;
    const selectedSet = new Set(selectedTaskIds);
    setWorkflows(prev => prev.map(w => {
      const updatedTasks = w.tasks.map(t => {
        if (t.id === taskId && w.id === workflowId) return { ...t, startDate: newStartDate, estimatedDays: newEstimatedDays };
        if (selectedSet.has(t.id) && t.startDate) return { ...t, startDate: addDays(t.startDate, daysDelta) };
        return t;
      });
      return { ...w, tasks: updatedTasks };
    }));
    setAnchorDialogOpen(false);
    setPendingDateChange(null);
  }, [pendingDateChange]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateTask = (workflowId: string, taskId: string, updates: Partial<ReleaseTask>) => {
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
      startDate: null,
      estimatedDays: 7,
      status: 'pendiente',
    };
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? { ...workflow, tasks: [...workflow.tasks, newTask] }
          : workflow
      )
    );
  };

  const deleteTask = (workflowId: string, taskId: string) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? { ...workflow, tasks: workflow.tasks.filter(t => t.id !== taskId) }
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-playfair">Lanzamientos</h1>
          <p className="text-muted-foreground">Gestiona el cronograma de lanzamiento de tu disco</p>
        </div>
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

      {/* Compact Progress Bar */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-sm font-medium whitespace-nowrap">Progreso General</span>
        <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{completedTasks} de {totalTasks} completadas</span>
        <Badge variant="outline" className="text-[11px] px-1.5 py-0">{progressPercent}%</Badge>
      </div>

      {/* View Content */}
      {viewMode === 'gantt' ? (
        <Card>
          <CardContent className="pt-6">
            <GanttChart 
              workflows={workflows} 
              onUpdateTaskDate={handleTaskDateUpdate}
              onSetAnchor={(workflowId, taskId, anchoredTo) => {
                updateTask(workflowId, taskId, { anchoredTo });
              }}
              getTaskName={getTaskName}
            />
          </CardContent>
        </Card>
      ) : (
        /* Workflow Sections - List View */
        <div className="space-y-4">
        {workflows.map(workflow => {
          const Icon = workflow.icon;
          const sectionCompleted = workflow.tasks.filter(t => t.status === 'completado').length;
          const sectionTotal = workflow.tasks.length;
          const sectionPercent = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;

          return (
            <Card key={workflow.id} className={`border-l-4 ${workflow.color}`}>
              <Collapsible open={openSections[workflow.id]} onOpenChange={() => toggleSection(workflow.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <Badge variant="secondary" className="ml-2">
                          {sectionPercent}% ({sectionCompleted}/{sectionTotal})
                        </Badge>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-5 h-5 transition-transform duration-200',
                          openSections[workflow.id] && 'rotate-180'
                        )}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Tarea</TableHead>
                          <TableHead className="w-[130px]">Responsable</TableHead>
                          <TableHead className="w-[130px]">Fecha Inicio</TableHead>
                          <TableHead className="w-[80px]">Días</TableHead>
                          <TableHead className="w-[130px]">Vencimiento</TableHead>
                          <TableHead className="w-[150px]">Anclada a</TableHead>
                          <TableHead className="w-[130px]">Estado</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workflow.tasks.map(task => {
                          const dueDate = getDueDate(task.startDate, task.estimatedDays);
                          const statusOption = STATUS_OPTIONS.find(s => s.value === task.status);

                          return (
                            <TableRow key={task.id}>
                              <TableCell>
                                <Input
                                  value={task.name}
                                  onChange={e => updateTask(workflow.id, task.id, { name: e.target.value })}
                                  className="h-8 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={task.responsible}
                                  onChange={e => updateTask(workflow.id, task.id, { responsible: e.target.value })}
                                  placeholder="Asignar..."
                                  className="h-8 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted"
                                />
                              </TableCell>
                              <TableCell>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        'h-8 w-full justify-start text-left font-normal',
                                        !task.startDate && 'text-muted-foreground'
                                      )}
                                    >
                                      {task.startDate
                                        ? format(task.startDate, 'dd MMM yyyy', { locale: es })
                                        : 'Seleccionar'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={task.startDate || undefined}
                                      onSelect={date => updateTask(workflow.id, task.id, { startDate: date || null })}
                                      initialFocus
                                      className="pointer-events-auto"
                                    />
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={task.estimatedDays}
                                  onChange={e => updateTask(workflow.id, task.id, { estimatedDays: parseInt(e.target.value) || 0 })}
                                  className="h-8 w-16 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted text-center"
                                  min={1}
                                />
                              </TableCell>
                              <TableCell>
                                <span className={cn('text-sm', !dueDate && 'text-muted-foreground')}>
                                  {dueDate ? format(dueDate, 'dd MMM yyyy', { locale: es }) : '—'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={task.anchoredTo?.[0] || 'none'}
                                  onValueChange={(value) => updateTask(workflow.id, task.id, { 
                                    anchoredTo: value === 'none' ? undefined : [value] 
                                  })}
                                >
                                  <SelectTrigger className="h-8 border-0 bg-transparent text-xs">
                                    <SelectValue placeholder="Sin ancla">
                                      {task.anchoredTo && task.anchoredTo.length > 0 ? (
                                        <span className="text-xs">🔗 {task.anchoredTo.length > 1 ? `${task.anchoredTo.length} anclas` : getTaskName(task.anchoredTo[0])}</span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">Sin ancla</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sin ancla</SelectItem>
                                    {workflows.flatMap(w => 
                                      w.tasks
                                        .filter(t => t.id !== task.id)
                                        .map(t => (
                                          <SelectItem key={t.id} value={t.id}>
                                            {t.name} ({w.name})
                                          </SelectItem>
                                        ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={task.status}
                                  onValueChange={(value: TaskStatus) => updateTask(workflow.id, task.id, { status: value })}
                                >
                                  <SelectTrigger className="h-8 border-0 bg-transparent">
                                    <SelectValue>
                                      <Badge className={cn('font-normal', statusOption?.color)}>
                                        {statusOption?.label}
                                      </Badge>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map(option => (
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
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteTask(workflow.id, task.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
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
          );
        })}
        </div>
      )}

      {/* Anchor Dependency Dialog */}
      <AnchorDependencyDialog
        open={anchorDialogOpen}
        onOpenChange={setAnchorDialogOpen}
        sourceName={pendingDateChange ? getTaskName(pendingDateChange.taskId) : ''}
        daysDelta={pendingDateChange?.daysDelta || 0}
        dependentTasks={pendingDateChange?.dependentTasks || []}
        onConfirm={handleAnchorConfirm}
      />
    </div>
  );
}
