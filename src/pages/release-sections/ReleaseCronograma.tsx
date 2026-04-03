import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  arrayMove,
} from '@dnd-kit/sortable';
import { 
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
  EyeOff,
  Eye,
  X,
  Cloud,
  Loader2,
  Maximize2,
  Minimize2,
  FileDown,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import AnchorDependencyDialog from '@/components/lanzamientos/AnchorDependencyDialog';
import AnchoredStatusDialog from '@/components/lanzamientos/AnchoredStatusDialog';
import { ResponsibleSelector, type ResponsibleRef } from '@/components/releases/ResponsibleSelector';
import CronogramaSetupWizard from '@/components/releases/CronogramaSetupWizard';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import GanttChart from '@/components/lanzamientos/GanttChart';
import { useRelease, useTracks, useReleaseMilestones, type ReleaseMilestone } from '@/hooks/useReleases';
import { exportCronogramaPDF } from '@/utils/exportCronogramaPDF';
import { exportCronogramaGanttPDF } from '@/utils/exportCronogramaGanttPDF';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import MultiAnchorSelector from '@/components/lanzamientos/MultiAnchorSelector';
import { 
  generateTimelineFromConfig, 
  groupTasksByWorkflow,
  type ReleaseConfig,
  type GeneratedTask 
} from '@/lib/releaseTimelineTemplates';
import {
  SortableWorkflowCard,
  type TaskStatus,
  type SubtaskType,
  type CommentMessage,
  type Subtask,
  type ReleaseTask,
  type WorkflowSection,
} from '@/components/cronograma/SortableWorkflowCard';

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

// SortableWorkflowCard extracted to src/components/cronograma/SortableWorkflowCard.tsx

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

  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'list' ? 'list' : (searchParams.get('focus') ? 'gantt' : 'list');
  const initialCollapsed = searchParams.get('collapsed') === 'all';
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode as ViewMode);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    initialCollapsed
      ? Object.fromEntries(Object.keys(WORKFLOW_METADATA).map(id => [id, false]))
      : Object.fromEntries(Object.keys(WORKFLOW_METADATA).map(id => [id, true]))
  );
  const [fitToView, setFitToView] = useState(false);

  // Focus scroll effect from query params
  useEffect(() => {
    const focusId = searchParams.get('focus');
    const mode = searchParams.get('mode');
    if (!focusId && !mode) return;

    // Clean params after reading
    setSearchParams({}, { replace: true });

    if (focusId) {
      // Wait for Gantt to render, then scroll to the workflow
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-workflow-id="${focusId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Flash highlight
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg', 'transition-all');
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []); // Only run on mount

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

  // Alert-based navigation from Task Center
  useEffect(() => {
    const alertParam = searchParams.get('alert');
    if (!alertParam || loadingMilestones) return;

    if (alertParam === 'cronograma-empty') {
      setTimeout(() => setShowWizard(true), 400);
    }

    if (alertParam === 'cronograma-delayed' || alertParam === 'cronograma-upcoming') {
      // Open all sections
      setOpenSections(Object.fromEntries(Object.keys(WORKFLOW_METADATA).map(id => [id, true])));
      
      setTimeout(() => {
        const statusToFind = alertParam === 'cronograma-delayed' ? 'retrasado' : null;
        const ringColor = alertParam === 'cronograma-delayed' 
          ? ['ring-2', 'ring-destructive', 'ring-offset-2']
          : ['ring-2', 'ring-amber-500', 'ring-offset-2'];
        
        // Find matching task rows
        const allRows = document.querySelectorAll<HTMLElement>('tr[data-task-status]');
        const matchingRows: HTMLElement[] = [];
        
        allRows.forEach(row => {
          const status = row.getAttribute('data-task-status');
          if (alertParam === 'cronograma-delayed' && status === 'retrasado') {
            matchingRows.push(row);
          } else if (alertParam === 'cronograma-upcoming' && row.hasAttribute('data-task-upcoming')) {
            matchingRows.push(row);
          }
        });

        if (matchingRows.length > 0) {
          matchingRows[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          matchingRows.forEach(el => {
            el.classList.add(...ringColor, 'transition-all', 'duration-300');
            setTimeout(() => {
              el.classList.remove(...ringColor, 'transition-all', 'duration-300');
            }, 3000);
          });
        }
      }, 800);
    }

    // Clean alert param
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('alert');
      return next;
    }, { replace: true });
  }, [loadingMilestones]);
  
  // Regenerate confirmation state
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState<'keep' | 'overwrite' | null>(null);
  const [showDeleteCronograma, setShowDeleteCronograma] = useState(false);

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
  
  // Anchor dependency dialog state (date changes)
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

  // Anchored status dialog state (status → retrasado)
  const [statusAnchorDialogOpen, setStatusAnchorDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    workflowId: string;
    taskId: string;
    newStatus: TaskStatus;
    sourceName: string;
    dependentTasks: { id: string; name: string; workflowId: string; workflowName: string; currentStatus: TaskStatus }[];
  } | null>(null);

  // Number of songs - use tracks count or default to 1
  const numSongs = useMemo(() => Math.max(tracks.length, 1), [tracks]);

  // Track whether initial load has completed (to avoid auto-saving on mount)
  const hasInitializedRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);
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
        const { data: inserted, error } = await supabase
          .from('release_milestones')
          .insert(milestones as any)
          .select();

        if (error) throw error;

        // Update local state with DB-generated UUIDs
        if (inserted && inserted.length > 0) {
          skipNextAutoSaveRef.current = true;
          setWorkflows(prev => {
            const updated = prev.map(wf => ({
              ...wf,
              tasks: wf.tasks.map(t => {
                const match = inserted.find(
                  (m: any) => m.title === t.name && m.category === wf.id
                );
                return match ? { ...t, id: match.id } : t;
              }),
            }));
            return updated;
          });
        }
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
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

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

  // Helper: find a task across all workflows
  const findTask = useCallback((taskId: string): { task: ReleaseTask; workflowId: string; workflowName: string } | null => {
    for (const w of workflows) {
      const t = w.tasks.find(t => t.id === taskId);
      if (t) return { task: t, workflowId: w.id, workflowName: w.name };
    }
    return null;
  }, [workflows]);

  // Recursive: get the full dependency chain for a task
  const getFullDependencyChain = useCallback((
    sourceTaskId: string,
    daysDelta: number,
    depth = 1,
    visited = new Set<string>()
  ): import('@/components/lanzamientos/AnchorDependencyDialog').DependentTask[] => {
    if (visited.has(sourceTaskId)) return []; // cycle protection
    visited.add(sourceTaskId);

    const result: import('@/components/lanzamientos/AnchorDependencyDialog').DependentTask[] = [];

    workflows.forEach(workflow => {
      workflow.tasks.forEach(task => {
        if (task.anchoredTo?.includes(sourceTaskId) && !task.customStartDate && !visited.has(task.id)) {
          const currentStart = task.startDate;
          const currentEnd = currentStart ? addDays(currentStart, task.estimatedDays) : null;
          const newStart = currentStart ? addDays(currentStart, daysDelta) : null;
          const newEnd = newStart ? addDays(newStart, task.estimatedDays) : null;

          // For postpone (delta > 0): always a conflict
          // For advance (delta < 0): conflict only if the source's new end overlaps with this task's start
          const sourceInfo = findTask(sourceTaskId);
          let isConflict = true;
          if (daysDelta < 0 && currentStart && sourceInfo?.task.startDate) {
            const sourceNewEnd = addDays(addDays(sourceInfo.task.startDate, daysDelta), sourceInfo.task.estimatedDays);
            isConflict = sourceNewEnd > currentStart;
          }

          result.push({
            id: task.id,
            name: task.name,
            workflowId: workflow.id,
            workflowName: workflow.name,
            depth,
            currentStartDate: currentStart,
            currentEndDate: currentEnd,
            newStartDate: newStart,
            newEndDate: newEnd,
            isConflict,
          });

          // Recurse into this task's dependents
          const childDeps = getFullDependencyChain(task.id, daysDelta, depth + 1, visited);
          result.push(...childDeps);
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

  // Check if a task is blocked by incomplete predecessors
  const isTaskBlocked = useCallback((task: ReleaseTask) => {
    if (!task.anchoredTo || task.anchoredTo.length === 0) return false;
    for (const anchorId of task.anchoredTo) {
      for (const w of workflows) {
        const pred = w.tasks.find(t => t.id === anchorId);
        if (pred && pred.status !== 'completado') return true;
      }
    }
    return false;
  }, [workflows]);

  // Manufacturing risk alert
  const fabRiskAlert = useMemo(() => {
    const fabWorkflow = workflows.find(w => w.id === 'fabricacion');
    if (!fabWorkflow) return { show: false };
    const envioTask = fabWorkflow.tasks.find(t =>
      t.id.includes('fab-1') || t.id.includes('fab-envio') || t.name.toLowerCase().includes('envío a fábrica') || t.name.toLowerCase().includes('envio a fabrica')
    );
    if (!envioTask || envioTask.startDate) return { show: false };
    if (!release?.release_date) return { show: false };
    const releaseDate = new Date(release.release_date);
    const daysUntilRelease = differenceInDays(releaseDate, new Date());
    return { show: daysUntilRelease < 70 && daysUntilRelease > 0 };
  }, [workflows, release]);


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

  // Handle date update with anchor check (recursive cascade)
  const handleTaskDateUpdate = useCallback((
    workflowId: string,
    taskId: string,
    newStartDate: Date,
    newEstimatedDays: number,
    subtaskId?: string
  ) => {
    // If updating a subtask, find it inside the parent task
    if (subtaskId) {
      pushUndo();
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { ...w, tasks: w.tasks.map(t => 
              t.id === taskId && t.subtasks
                ? { ...t, subtasks: t.subtasks.map(st => 
                    st.id === subtaskId ? { ...st, startDate: newStartDate, estimatedDays: newEstimatedDays } : st
                  )}
                : t
            )}
          : w
      ));
      return;
    }

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
    if (daysDelta === 0 && newEstimatedDays === task.estimatedDays) {
      return; // no change
    }

    const fullChain = getFullDependencyChain(taskId, daysDelta);
    const conflictTasks = fullChain.filter(t => t.isConflict);

    if (conflictTasks.length > 0 && daysDelta !== 0) {
      setPendingDateChange({
        workflowId,
        taskId,
        newStartDate,
        newEstimatedDays,
        oldStartDate: task.startDate,
        daysDelta,
        dependentTasks: fullChain,
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
  }, [workflows, getFullDependencyChain]);

  // Handle workflow shift (move all tasks in a workflow by daysDelta)
  const handleShiftWorkflow = useCallback((workflowId: string, daysDelta: number) => {
    if (daysDelta === 0) return;
    pushUndo();
    setWorkflows(prev => prev.map(w => {
      if (w.id !== workflowId) return w;
      return {
        ...w,
        tasks: w.tasks.map(t => {
          const updatedSubtasks = t.subtasks?.map(st => 
            st.startDate ? { ...st, startDate: addDays(st.startDate, daysDelta) } : st
          );
          if (!t.startDate) return updatedSubtasks ? { ...t, subtasks: updatedSubtasks } : t;
          return { 
            ...t, 
            startDate: addDays(t.startDate, daysDelta),
            ...(updatedSubtasks ? { subtasks: updatedSubtasks } : {}),
          };
        }),
      };
    }));
  }, []);

  // Handle anchor dialog confirmation (apply to full chain)
  const handleAnchorConfirm = useCallback((selectedTaskIds: string[]) => {
    if (!pendingDateChange) return;

    const { workflowId, taskId, newStartDate, newEstimatedDays, daysDelta } = pendingDateChange;
    const selectedSet = new Set(selectedTaskIds);

    pushUndo();
    setWorkflows(prev => prev.map(w => {
      const updatedTasks = w.tasks.map(t => {
        if (t.id === taskId && w.id === workflowId) {
          return { ...t, startDate: newStartDate, estimatedDays: newEstimatedDays };
        }
        if (selectedSet.has(t.id) && t.startDate) {
          return { ...t, startDate: addDays(t.startDate, daysDelta) };
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

  // Handle status update — intercepts 'retrasado' to show anchored dialog
  const handleTaskStatusUpdate = useCallback((workflowId: string, taskId: string, status: TaskStatus) => {
    if (status !== 'retrasado') {
      updateTask(workflowId, taskId, { status });
      return;
    }

    // Find all tasks anchored to this task across all workflows
    const dependents: { id: string; name: string; workflowId: string; workflowName: string; currentStatus: TaskStatus }[] = [];
    for (const w of workflows) {
      for (const t of w.tasks) {
        if (t.anchoredTo?.includes(taskId)) {
          dependents.push({
            id: t.id,
            name: t.name,
            workflowId: w.id,
            workflowName: w.name,
            currentStatus: t.status,
          });
        }
      }
    }

    if (dependents.length === 0) {
      updateTask(workflowId, taskId, { status });
      return;
    }

    const sourceName = getTaskName(taskId);
    setPendingStatusChange({ workflowId, taskId, newStatus: status, sourceName, dependentTasks: dependents });
    setStatusAnchorDialogOpen(true);
  }, [workflows, getTaskName]);

  // Confirm handler for anchored status dialog
  const handleStatusAnchorConfirm = useCallback((decisions: Record<string, TaskStatus | 'keep'>) => {
    if (!pendingStatusChange) return;
    const { workflowId, taskId, newStatus } = pendingStatusChange;
    pushUndo();
    setWorkflows(prev => prev.map(w => ({
      ...w,
      tasks: w.tasks.map(t => {
        if (t.id === taskId && w.id === workflowId) return { ...t, status: newStatus };
        const decision = decisions[t.id];
        if (decision && decision !== 'keep') return { ...t, status: decision as TaskStatus };
        return t;
      }),
    })));
    setStatusAnchorDialogOpen(false);
    setPendingStatusChange(null);
  }, [pendingStatusChange, pushUndo]);

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

  // Reorder subtasks within a task
  const reorderSubtasks = useCallback((workflowId: string, taskId: string, oldIndex: number, newIndex: number) => {
    pushUndo();
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              tasks: workflow.tasks.map(t =>
                t.id === taskId
                  ? { ...t, subtasks: arrayMove(t.subtasks || [], oldIndex, newIndex) }
                  : t
              ),
            }
          : workflow
      )
    );
  }, []);

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
          tracks={tracks.map(t => ({ id: t.id, title: t.title, track_number: t.track_number, isrc: t.isrc }))}
          releaseId={id}
          onTrackCreated={() => queryClient.invalidateQueries({ queryKey: ['tracks', id] })}
          releaseType={release?.type as 'single' | 'ep' | 'album' | undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!fitToView && (
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
          <Button variant="outline" size="sm" onClick={() => {
            const exportData = workflows.map(w => ({
              id: w.id,
              name: w.name,
              tasks: w.tasks.map(t => ({
                name: t.name,
                responsible: t.responsible,
                startDate: t.startDate,
                estimatedDays: t.estimatedDays,
                status: t.status,
              })),
            }));
            const title = release?.title || 'Sin título';
            const dateStr = release?.release_date ? format(new Date(release.release_date), "d 'de' MMMM yyyy", { locale: es }) : undefined;

            if (viewMode === 'gantt') {
              exportCronogramaGanttPDF(exportData, title, undefined, dateStr);
            } else {
              exportCronogramaPDF(exportData, title, undefined, dateStr);
            }
          }}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
           </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteCronograma(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar cronograma
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          {viewMode === 'gantt' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setFitToView(prev => !prev)}
                >
                  {fitToView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{fitToView ? 'Vista detallada' : 'Vista completa'}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      )}
      {fitToView && (
        <div className="flex items-center justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setFitToView(false)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Vista detallada</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Compact Progress Bar + Selection controls */}
      {!fitToView && (
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
      )}

      {fabRiskAlert.show && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ El proceso de fabricación física requiere mínimo 8-10 semanas. Revisa las fechas de Envío a Fábrica.
          </AlertDescription>
        </Alert>
      )}

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
                handleTaskStatusUpdate(workflowId, taskId, status);
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
              fitToView={fitToView}
              onShiftWorkflow={handleShiftWorkflow}
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
                onUpdateTaskStatus={handleTaskStatusUpdate}
                addTask={addTask}
                requestDeleteTask={requestDeleteTask}
                toggleTaskExpanded={toggleTaskExpanded}
                addSubtask={addSubtask}
                addChecklistItem={addChecklistItem}
                addNote={addNote}
                addComment={addComment}
                updateSubtask={updateSubtask}
                deleteSubtask={deleteSubtask}
                reorderSubtasks={reorderSubtasks}
                handleTaskDateUpdate={handleTaskDateUpdate}
                availableTasksForAnchor={availableTasksForAnchor}
                getTaskName={getTaskName}
                getDueDate={getDueDate}
                release={release}
                STATUS_OPTIONS={STATUS_OPTIONS}
                selectedTaskIds={selectedTaskIds}
                toggleTaskSelect={toggleTaskSelect}
                isTaskBlocked={isTaskBlocked}
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

      {/* Delete Cronograma Confirmation Dialog */}
      <AlertDialog open={showDeleteCronograma} onOpenChange={setShowDeleteCronograma}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Eliminar cronograma
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las tareas y flujos del cronograma. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const milestoneIds = workflows.flatMap(w => w.tasks.map(t => t.id));
                  if (milestoneIds.length > 0) {
                    const { error } = await supabase
                      .from('release_milestones')
                      .delete()
                      .eq('release_id', id!);
                    if (error) throw error;
                  }
                  setWorkflows([]);
                  queryClient.invalidateQueries({ queryKey: ['release-milestones', id] });
                  toast.success('Cronograma eliminado');
                } catch (err: any) {
                  toast.error('Error al eliminar: ' + (err?.message || 'Error desconocido'));
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CronogramaSetupWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onGenerate={handleGenerateFromWizard}
        initialReleaseDate={release?.release_date ? new Date(release.release_date) : null}
        initialNumSongs={numSongs}
        tracks={tracks.map(t => ({ id: t.id, title: t.title, track_number: t.track_number, isrc: t.isrc }))}
        releaseId={id}
        onTrackCreated={() => queryClient.invalidateQueries({ queryKey: ['tracks', id] })}
        releaseType={release?.type as 'single' | 'ep' | 'album' | undefined}
      />

      {/* Anchor Dependency Dialog */}
      <AnchorDependencyDialog
        open={anchorDialogOpen}
        onOpenChange={setAnchorDialogOpen}
        sourceName={pendingDateChange ? getTaskName(pendingDateChange.taskId) : ''}
        daysDelta={pendingDateChange?.daysDelta || 0}
        dependentTasks={pendingDateChange?.dependentTasks || []}
        onConfirm={handleAnchorConfirm}
        releaseDate={release?.release_date ? new Date(release.release_date) : null}
      />

      {/* Anchored Status Dialog — shown when a task is marked retrasado and has anchored dependents */}
      <AnchoredStatusDialog
        open={statusAnchorDialogOpen}
        onOpenChange={setStatusAnchorDialogOpen}
        sourceName={pendingStatusChange?.sourceName ?? ''}
        newStatus={pendingStatusChange?.newStatus ?? 'retrasado'}
        dependentTasks={pendingStatusChange?.dependentTasks ?? []}
        onConfirm={handleStatusAnchorConfirm}
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
