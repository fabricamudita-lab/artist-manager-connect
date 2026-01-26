import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  GanttChart as GanttIcon,
  ArrowLeft,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import GanttChart from '@/components/lanzamientos/GanttChart';
import { useRelease } from '@/hooks/useReleases';
import { 
  generateTimelineFromConfig, 
  groupTasksByWorkflow,
  type ReleaseConfig,
  type GeneratedTask 
} from '@/lib/releaseTimelineTemplates';

type TaskStatus = 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';

interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  responsible_ref?: ResponsibleRef | null;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  anchoredTo?: string;
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

export default function ReleaseCronograma() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading } = useRelease(id);
  
  const [workflows, setWorkflows] = useState<WorkflowSection[]>(EMPTY_WORKFLOWS);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(WORKFLOW_METADATA).map(id => [id, true]))
  );
  const [showWizard, setShowWizard] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  
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

  // Check if timeline is empty (no tasks with dates)
  const isTimelineEmpty = useMemo(() => {
    const allTasks = workflows.flatMap(w => w.tasks);
    return allTasks.length === 0 || allTasks.every(t => !t.startDate);
  }, [workflows]);

  // Handle wizard generation
  const handleGenerateFromWizard = useCallback((config: ReleaseConfig) => {
    const generatedTasks = generateTimelineFromConfig(config);
    const groupedTasks = groupTasksByWorkflow(generatedTasks);

    setWorkflows(prev => 
      prev.map(workflow => {
        const newTasks = groupedTasks[workflow.id] || [];
        return {
          ...workflow,
          tasks: newTasks.map(t => ({
            ...t,
            responsible_ref: null,
          })) as ReleaseTask[],
        };
      })
    );
    setHasGeneratedOnce(true);
  }, []);

  // Get all tasks that are anchored to a given task
  const getDependentTasks = useCallback((sourceTaskId: string) => {
    const dependents: { id: string; name: string; workflowId: string; workflowName: string }[] = [];
    workflows.forEach(workflow => {
      workflow.tasks.forEach(task => {
        if (task.anchoredTo === sourceTaskId) {
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

  // Filter workflows that have tasks
  const workflowsWithTasks = useMemo(() => 
    workflows.filter(w => w.tasks.length > 0),
    [workflows]
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  // Show empty state with wizard prompt
  if (isTimelineEmpty && !hasGeneratedOnce) {
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
          <Button variant="outline" size="sm" onClick={() => setShowWizard(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar fechas
          </Button>
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

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Progreso General</span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {progressPercent}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {completedTasks} de {totalTasks} tareas completadas
          </p>
        </CardContent>
      </Card>

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
              getTaskName={getTaskName}
            />
          </CardContent>
        </Card>
      ) : (
        /* Workflow Sections - List View */
        <div className="space-y-4">
        {workflowsWithTasks.map(workflow => {
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
                                <ResponsibleSelector
                                  value={task.responsible_ref ?? null}
                                  onChange={(ref) =>
                                    updateTask(workflow.id, task.id, {
                                      responsible_ref: ref,
                                      responsible: ref?.name || '',
                                    })
                                  }
                                  artistId={release?.artist_id}
                                  placeholder="Asignar..."
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
                                  value={task.anchoredTo || 'none'}
                                  onValueChange={(value) => updateTask(workflow.id, task.id, { anchoredTo: value === 'none' ? undefined : value })}
                                >
                                  <SelectTrigger className="h-8 border-0 bg-transparent text-xs">
                                    <SelectValue placeholder="Sin ancla">
                                      {task.anchoredTo ? (
                                        <span className="text-xs">🔗 {getTaskName(task.anchoredTo)}</span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">Sin ancla</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sin ancla</SelectItem>
                                    {workflowsWithTasks.flatMap(w => 
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

      {/* Wizard Dialog */}
      <CronogramaSetupWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onGenerate={handleGenerateFromWizard}
        initialReleaseDate={release?.release_date ? new Date(release.release_date) : null}
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
    </div>
  );
}
