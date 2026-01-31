import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
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
  Sparkles,
  CheckCircle2,
  Circle,
  ListTodo
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

type SubtaskType = 'full' | 'checkbox';

interface Subtask {
  id: string;
  name: string;
  type: SubtaskType;
  // Full subtask fields
  responsible?: string;
  responsible_ref?: ResponsibleRef | null;
  startDate?: Date | null;
  estimatedDays?: number;
  status?: TaskStatus;
  anchoredTo?: string;
  // Checkbox fields
  completed?: boolean;
}

interface ReleaseTask {
  id: string;
  name: string;
  responsible: string;
  responsible_ref?: ResponsibleRef | null;
  startDate: Date | null;
  estimatedDays: number;
  status: TaskStatus;
  anchoredTo?: string;
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

export default function ReleaseCronograma() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading } = useRelease(id);
  const { data: tracks = [] } = useTracks(id);
  const { data: savedMilestones = [], isLoading: loadingMilestones } = useReleaseMilestones(id);
  
  const [workflows, setWorkflows] = useState<WorkflowSection[]>(EMPTY_WORKFLOWS);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(WORKFLOW_METADATA).map(id => [id, true]))
  );
  const [showWizard, setShowWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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

  // Load saved milestones into workflows on mount
  useEffect(() => {
    if (savedMilestones.length > 0) {
      // Convert milestones to workflow tasks
      const tasksByCategory: Record<string, ReleaseTask[]> = {};
      
      savedMilestones.forEach(m => {
        const category = m.category || 'marketing';
        if (!tasksByCategory[category]) {
          tasksByCategory[category] = [];
        }
        
        tasksByCategory[category].push({
          id: m.id,
          name: m.title,
          responsible: m.responsible || '',
          responsible_ref: null,
          startDate: m.due_date ? new Date(m.due_date) : null,
          estimatedDays: 7, // Default, could be stored in notes or metadata
          status: (m.status === 'pending' ? 'pendiente' : 
                   m.status === 'in_progress' ? 'en_proceso' :
                   m.status === 'completed' ? 'completado' : 
                   m.status === 'delayed' ? 'retrasado' : 'pendiente') as TaskStatus,
          anchoredTo: m.is_anchor ? undefined : undefined, // Could store anchor info
        });
      });

      setWorkflows(prev => 
        prev.map(workflow => ({
          ...workflow,
          tasks: tasksByCategory[workflow.id] || [],
        }))
      );
    }
  }, [savedMilestones]);

  // Check if timeline is empty (no tasks with dates)
  const isTimelineEmpty = useMemo(() => {
    const allTasks = workflows.flatMap(w => w.tasks);
    return allTasks.length === 0 || allTasks.every(t => !t.startDate);
  }, [workflows]);

  // Has milestones in DB
  const hasSavedMilestones = savedMilestones.length > 0;

  // Save milestones to database
  const saveMilestonesToDB = useCallback(async (tasksToSave: { workflowId: string; tasks: ReleaseTask[] }[]) => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      // Delete existing milestones for this release
      await supabase
        .from('release_milestones')
        .delete()
        .eq('release_id', id);

      // Prepare new milestones
      const milestones = tasksToSave.flatMap(({ workflowId, tasks }) =>
        tasks.map(task => ({
          release_id: id,
          title: task.name,
          due_date: task.startDate ? format(task.startDate, 'yyyy-MM-dd') : null,
          days_offset: null, // Could calculate from release date
          is_anchor: !!task.anchoredTo,
          status: task.status === 'pendiente' ? 'pending' :
                  task.status === 'en_proceso' ? 'in_progress' :
                  task.status === 'completado' ? 'completed' :
                  task.status === 'retrasado' ? 'delayed' : 'pending',
          category: workflowId,
          responsible: task.responsible || null,
          notes: null,
        }))
      );

      if (milestones.length > 0) {
        const { error } = await supabase
          .from('release_milestones')
          .insert(milestones);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['release-milestones', id] });
      toast.success('Cronograma guardado');
    } catch (error) {
      console.error('Error saving milestones:', error);
      toast.error('Error al guardar el cronograma');
    } finally {
      setIsSaving(false);
    }
  }, [id, queryClient]);

  // Handle wizard generation and save to DB
  const handleGenerateFromWizard = useCallback(async (config: ReleaseConfig) => {
    const generatedTasks = generateTimelineFromConfig(config);
    const groupedTasks = groupTasksByWorkflow(generatedTasks);

    const newWorkflows = EMPTY_WORKFLOWS.map(workflow => {
      const newTasks = groupedTasks[workflow.id] || [];
      return {
        ...workflow,
        tasks: newTasks.map(t => ({
          ...t,
          responsible_ref: null,
        })) as ReleaseTask[],
      };
    });

    setWorkflows(newWorkflows);

    // Save to database
    await saveMilestonesToDB(
      newWorkflows.map(w => ({ workflowId: w.id, tasks: w.tasks }))
    );
  }, [saveMilestonesToDB]);

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

  // Filter workflows that have tasks
  const workflowsWithTasks = useMemo(() => 
    workflows.filter(w => w.tasks.length > 0),
    [workflows]
  );

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
                          <TableHead className="w-[200px]">Tarea</TableHead>
                          <TableHead className="w-[120px]">Responsable</TableHead>
                          <TableHead className="w-[180px]">Fechas</TableHead>
                          <TableHead className="w-[130px]">Anclada a</TableHead>
                          <TableHead className="w-[110px]">Estado</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workflow.tasks.map(task => {
                          const dueDate = getDueDate(task.startDate, task.estimatedDays);
                          const statusOption = STATUS_OPTIONS.find(s => s.value === task.status);
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
                                        {task.startDate && dueDate ? (
                                          <span className="text-xs">
                                            {format(task.startDate, 'dd MMM', { locale: es })} → {format(dueDate, 'dd MMM yyyy', { locale: es })}
                                          </span>
                                        ) : task.startDate ? (
                                          <span className="text-xs">{format(task.startDate, 'dd MMM yyyy', { locale: es })}</span>
                                        ) : (
                                          'Seleccionar fechas'
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="range"
                                        selected={task.startDate && dueDate ? { from: task.startDate, to: dueDate } : undefined}
                                        defaultMonth={task.startDate || undefined}
                                        onSelect={(range) => {
                                          if (range?.from) {
                                            const newStart = range.from;
                                            const newEnd = range.to || range.from;
                                            const newDays = Math.max(1, differenceInDays(newEnd, newStart));
                                            updateTask(workflow.id, task.id, { 
                                              startDate: newStart, 
                                              estimatedDays: newDays 
                                            });
                                          }
                                        }}
                                        initialFocus
                                        className="pointer-events-auto"
                                      />
                                    </PopoverContent>
                                  </Popover>
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
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => deleteTask(workflow.id, task.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {/* Subtasks rows */}
                              {task.expanded && (task.subtasks || []).map(subtask => {
                                // Checkbox type - simple row
                                if (subtask.type === 'checkbox') {
                                  return (
                                    <TableRow key={subtask.id} className="bg-muted/30">
                                      <TableCell colSpan={5}>
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

                                // Full subtask type - complete row with all fields
                                const subtaskDueDate = getDueDate(subtask.startDate, subtask.estimatedDays);
                                const subtaskStatusOption = STATUS_OPTIONS.find(s => s.value === subtask.status);
                                
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
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                              'h-7 w-full justify-start text-left font-normal text-xs',
                                              !subtask.startDate && 'text-muted-foreground'
                                            )}
                                          >
                                            {subtask.startDate && subtaskDueDate ? (
                                              <span className="text-xs">
                                                {format(subtask.startDate, 'dd MMM', { locale: es })} → {format(subtaskDueDate, 'dd MMM', { locale: es })}
                                              </span>
                                            ) : subtask.startDate ? (
                                              <span className="text-xs">{format(subtask.startDate, 'dd MMM', { locale: es })}</span>
                                            ) : (
                                              'Seleccionar'
                                            )}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                            mode="range"
                                            selected={subtask.startDate && subtaskDueDate ? { from: subtask.startDate, to: subtaskDueDate } : undefined}
                                            defaultMonth={subtask.startDate || undefined}
                                            onSelect={(range) => {
                                              if (range?.from) {
                                                const newStart = range.from;
                                                const newEnd = range.to || range.from;
                                                const newDays = Math.max(1, differenceInDays(newEnd, newStart));
                                                updateSubtask(workflow.id, task.id, subtask.id, { 
                                                  startDate: newStart, 
                                                  estimatedDays: newDays 
                                                });
                                              }
                                            }}
                                            initialFocus
                                            className="pointer-events-auto"
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={subtask.anchoredTo || 'none'}
                                        onValueChange={(value) => updateSubtask(workflow.id, task.id, subtask.id, { anchoredTo: value === 'none' ? undefined : value })}
                                      >
                                        <SelectTrigger className="h-7 border-0 bg-transparent text-xs">
                                          <SelectValue placeholder="Sin ancla">
                                            {subtask.anchoredTo ? (
                                              <span className="text-xs">🔗 {getTaskName(subtask.anchoredTo)}</span>
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
    </div>
  );
}
