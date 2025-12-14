import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
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
              workflows={workflows} 
              onUpdateTaskDate={(workflowId, taskId, newDate) => {
                setWorkflows(prev => prev.map(w => 
                  w.id === workflowId 
                    ? { ...w, tasks: w.tasks.map(t => 
                        t.id === taskId ? { ...t, startDate: newDate } : t
                      )}
                    : w
                ));
              }}
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
                          <TableHead className="w-[200px]">Tarea</TableHead>
                          <TableHead className="w-[150px]">Responsable</TableHead>
                          <TableHead className="w-[140px]">Fecha Inicio</TableHead>
                          <TableHead className="w-[100px]">Días Est.</TableHead>
                          <TableHead className="w-[140px]">Vencimiento</TableHead>
                          <TableHead className="w-[140px]">Estado</TableHead>
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
    </div>
  );
}
