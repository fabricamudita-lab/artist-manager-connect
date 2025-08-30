import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Trash2, Plus, CheckCircle2, FileText, Save, Filter, Users, ChevronDown, MoreVertical, Clock, CheckCircle, ChevronUp, TriangleAlert } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TemplateSelectionDialog } from "./TemplateSelectionDialog";
import { SaveTemplateDialog } from "./SaveAsTemplateDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  status: TaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
  section?: string;
  section_es?: string;
  owner_label_es?: string;
}

interface ProjectChecklistManagerProps {
  projectId: string;
  canEdit: boolean;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  'PENDING': 'Pendiente',
  'IN_PROGRESS': 'En progreso',
  'BLOCKED': 'Bloqueada',
  'IN_REVIEW': 'En revisión',
  'COMPLETED': 'Completada',
  'CANCELLED': 'Cancelada'
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  'PENDING': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'IN_PROGRESS': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-300',
  'BLOCKED': 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-300',
  'IN_REVIEW': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-300',
  'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-300',
  'CANCELLED': 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
};

export function ProjectChecklistManager({ projectId, canEdit }: ProjectChecklistManagerProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<ChecklistItem | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [openSaveTemplateDialog, setOpenSaveTemplateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<TaskStatus>>(new Set());
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkUpdateConfirm, setBulkUpdateConfirm] = useState<{
    count: number;
    status: TaskStatus;
    items: Set<string>;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'PREPARATIVOS': true,
    'PRODUCCION': true,
    'CIERRE': true
  });
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(true);
  const [blockingDialog, setBlockingDialog] = useState<{
    item: ChecklistItem;
    blockingTasks: string[];
    additionalInfo: string;
  } | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    item: ChecklistItem;
    reason: string;
  } | null>(null);

  useEffect(() => {
    fetchChecklistItems();
  }, [projectId]);

  // Helper functions for dependency management
  const extractBlockingInfo = (description: string | null) => {
    if (!description) return { blockingTasks: [], additionalInfo: '', otherContent: '', wasUnblocked: false };
    
    const blockingTasksMatch = description.match(/Tareas bloqueantes: ([^|]+)/);
    const additionalInfoMatch = description.match(/Información adicional: ([^|]+)/);
    const reviewMatch = description.match(/Motivo de revisión: ([^|]+)/);
    const unblockedMatch = description.match(/🎉 Esta tarea ya puede continuar - las dependencias se han completado/);
    
    let blockingTasks: string[] = [];
    let additionalInfo = '';
    let wasUnblocked = !!unblockedMatch;
    let otherContent = description;
    
    if (blockingTasksMatch) {
      blockingTasks = blockingTasksMatch[1].split(', ').filter(task => task.trim());
      otherContent = otherContent.replace(/Tareas bloqueantes: [^|]+(\s*\|\s*)?/g, '').trim();
    }
    
    if (additionalInfoMatch) {
      additionalInfo = additionalInfoMatch[1].trim();
      otherContent = otherContent.replace(/Información adicional: [^|]+(\s*\|\s*)?/g, '').trim();
    }
    
    if (reviewMatch) {
      otherContent = otherContent.replace(/Motivo de revisión: [^|]+(\s*\|\s*)?/g, '').trim();
    }
    
    if (unblockedMatch) {
      otherContent = otherContent.replace(/🎉 Esta tarea ya puede continuar - las dependencias se han completado(\s*\|\s*)?/g, '').trim();
    }
    
    // Clean up any remaining separators
    otherContent = otherContent.replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim();
    
    return { blockingTasks, additionalInfo, otherContent, wasUnblocked };
  };

  const getTasksThatBlockOthers = () => {
    const blockingTasks = new Set<string>();
    
    items.forEach(item => {
      if (item.status === 'BLOCKED') {
        const { blockingTasks: blocking } = extractBlockingInfo(item.description);
        blocking.forEach(taskTitle => blockingTasks.add(taskTitle));
      }
    });
    
    return blockingTasks;
  };

  const checkForUnblockedTasks = async () => {
    console.log('Checking for unblocked tasks...');
    const tasksToUpdate: ChecklistItem[] = [];
    
    items.forEach(item => {
      console.log(`Checking item: ${item.title}, status: ${item.status}`);
      if (item.status === 'BLOCKED') {
        const { blockingTasks, otherContent } = extractBlockingInfo(item.description);
        console.log(`Blocking tasks for "${item.title}":`, blockingTasks);
        
        // Check if all blocking tasks are now completed or cancelled
        const stillBlockedTasks = blockingTasks.filter(taskTitle => {
          const blockingTask = items.find(t => t.title === taskTitle);
          console.log(`Found blocking task "${taskTitle}":`, blockingTask?.status);
          return blockingTask && blockingTask.status !== 'COMPLETED' && blockingTask.status !== 'CANCELLED';
        });
        
        console.log(`Still blocked tasks for "${item.title}":`, stillBlockedTasks);
        
        if (stillBlockedTasks.length === 0 && blockingTasks.length > 0) {
          // Task is no longer blocked, add notification
          let newDescription = otherContent;
          if (newDescription) {
            newDescription += ' | ';
          }
          newDescription += '🎉 Esta tarea ya puede continuar - las dependencias se han completado';
          
          console.log(`Task "${item.title}" will be unblocked`);
          tasksToUpdate.push({
            ...item,
            description: newDescription,
            status: 'PENDING'
          });
        }
      }
    });
    
    console.log('Tasks to unblock:', tasksToUpdate.length);
    
    // Update unblocked tasks
    for (const task of tasksToUpdate) {
      console.log(`Updating task "${task.title}" to PENDING`);
      const { error } = await supabase
        .from('project_checklist_items')
        .update({ 
          description: task.description,
          status: 'PENDING'
        })
        .eq('id', task.id);
        
      if (error) {
        console.error('Error updating unblocked task:', error);
      }
    }
    
    if (tasksToUpdate.length > 0) {
      fetchChecklistItems();
      toast({
        title: "Tareas desbloqueadas",
        description: `${tasksToUpdate.length} tarea(s) ya pueden continuar.`,
      });
    }
  };

  const checkForUnblockedTasksWithItems = async (currentItems: ChecklistItem[]) => {
    console.log('Checking for unblocked tasks with fresh items...');
    const tasksToUpdate: ChecklistItem[] = [];
    
    currentItems.forEach(item => {
      console.log(`Checking item: ${item.title}, status: ${item.status}`);
      if (item.status === 'BLOCKED') {
        const { blockingTasks, otherContent } = extractBlockingInfo(item.description);
        console.log(`Blocking tasks for "${item.title}":`, blockingTasks);
        
        // Check if all blocking tasks are now completed or cancelled
        const stillBlockedTasks = blockingTasks.filter(taskTitle => {
          const blockingTask = currentItems.find(t => t.title === taskTitle);
          console.log(`Found blocking task "${taskTitle}":`, blockingTask?.status);
          return blockingTask && blockingTask.status !== 'COMPLETED' && blockingTask.status !== 'CANCELLED';
        });
        
        console.log(`Still blocked tasks for "${item.title}":`, stillBlockedTasks);
        
        if (stillBlockedTasks.length === 0 && blockingTasks.length > 0) {
          // Task is no longer blocked, add notification
          let newDescription = otherContent;
          if (newDescription) {
            newDescription += ' | ';
          }
          newDescription += '🎉 Esta tarea ya puede continuar - las dependencias se han completado';
          
          console.log(`Task "${item.title}" will be unblocked`);
          tasksToUpdate.push({
            ...item,
            description: newDescription,
            status: 'PENDING'
          });
        }
      }
    });
    
    console.log('Tasks to unblock:', tasksToUpdate.length);
    
    // Update unblocked tasks
    for (const task of tasksToUpdate) {
      console.log(`Updating task "${task.title}" to PENDING`);
      const { error } = await supabase
        .from('project_checklist_items')
        .update({ 
          description: task.description,
          status: 'PENDING'
        })
        .eq('id', task.id);
        
      if (error) {
        console.error('Error updating unblocked task:', error);
      }
    }
    
    if (tasksToUpdate.length > 0) {
      fetchChecklistItems();
      toast({
        title: "Tareas desbloqueadas",
        description: `${tasksToUpdate.length} tarea(s) ya pueden continuar.`,
      });
    }
  };

  const fetchChecklistItems = async (skipDefaultTemplate = false) => {
    try {
      const { data, error } = await supabase
        .from('project_checklist_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const checklistItems = data || [];
      setItems(checklistItems);
      
      // If checklist is empty, load a default system template (unless explicitly skipped)
      if (checklistItems.length === 0 && canEdit && !skipDefaultTemplate) {
        await loadDefaultTemplate();
      }
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos de la checklist.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      // Load the "Concert" template as default
      const { data: template, error: templateError } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_system_template', true)
        .eq('name_es', 'Concierto')
        .maybeSingle();

      if (templateError || !template) {
        console.log('No default template found, skipping auto-load');
        return;
      }

      await applyTemplate(template.id);
    } catch (error) {
      console.error('Error loading default template:', error);
    }
  };

  const applyTemplate = async (templateId: string) => {
    try {
      const { data: templateItems, error } = await supabase
        .from('checklist_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id || '';

      const checklistItems = (templateItems || []).map((item, index) => ({
        project_id: projectId,
        title: item.task_es || item.task,
        description: item.owner_label_es || null,
        section: item.section_es || item.section,
        sort_order: index,
        created_by: userId,
      }));

      if (checklistItems.length > 0) {
        const { error: insertError } = await supabase
          .from('project_checklist_items')
          .insert(checklistItems);

        if (insertError) throw insertError;
        
        fetchChecklistItems();
      }
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const addChecklistItem = async () => {
    if (!newTitle.trim()) return;

    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('project_checklist_items')
        .insert({
          project_id: projectId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          sort_order: items.length,
          created_by: user.data.user?.id || '',
        });

      if (error) throw error;

      setNewTitle("");
      setNewDescription("");
      setOpenAddDialog(false);
      fetchChecklistItems();
      
      toast({
        title: "Elemento añadido",
        description: "El elemento se ha añadido a la checklist correctamente.",
      });
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el elemento a la checklist.",
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (item: ChecklistItem, newStatus: TaskStatus) => {
    console.log('updateTaskStatus called with:', { itemId: item.id, newStatus, itemTitle: item.title });
    
    // If changing to BLOCKED status, show the blocking dialog
    if (newStatus === 'BLOCKED') {
      console.log('Setting blocking dialog for BLOCKED status');
      setBlockingDialog({
        item,
        blockingTasks: [],
        additionalInfo: ''
      });
      return;
    }

    // If changing to IN_REVIEW status, show the review dialog
    if (newStatus === 'IN_REVIEW') {
      console.log('Setting review dialog for IN_REVIEW status');
      setReviewDialog({
        item,
        reason: ''
      });
      return;
    }

    try {
      console.log('Updating task status:', {
        itemId: item.id,
        newStatus,
        selectedItems: Array.from(selectedItems),
        isSelected: selectedItems.has(item.id),
        selectedCount: selectedItems.size
      });

      const user = await supabase.auth.getUser();
      const updates: any = { status: newStatus };
      
      // Clean blocking/review text when completing or cancelling
      if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        const { otherContent } = extractBlockingInfo(item.description);
        updates.description = otherContent || null;
      }
      
      // Update legacy is_completed field for backwards compatibility
      if (newStatus === 'COMPLETED') {
        updates.is_completed = true;
        updates.completed_by = user.data.user?.id;
        updates.completed_at = new Date().toISOString();
      } else {
        updates.is_completed = false;
        updates.completed_by = null;
        updates.completed_at = null;
      }

      // If this item is selected and there are multiple selected items, show confirmation dialog
      if (selectedItems.has(item.id) && selectedItems.size > 1) {
        console.log('Updating multiple selected items:', Array.from(selectedItems));
        
        // Set up bulk update confirmation
        setBulkUpdateConfirm({
          count: selectedItems.size,
          status: newStatus,
          items: new Set(selectedItems)
        });
        return; // Exit here, the actual update will happen in the confirmation dialog
      } else {
        console.log('Updating single item');
        
        // Update only the single item
        const { error } = await supabase
          .from('project_checklist_items')
          .update(updates)
          .eq('id', item.id);

        if (error) throw error;

        fetchChecklistItems();
        
        // Check for tasks that might now be unblocked after fetching fresh data
        if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
          setTimeout(async () => {
            // Re-fetch items to get the latest state
            const { data: latestItems } = await supabase
              .from('project_checklist_items')
              .select('*')
              .eq('project_id', projectId)
              .order('sort_order', { ascending: true });
              
            if (latestItems) {
              await checkForUnblockedTasksWithItems(latestItems);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    }
  };

  const handleBlockingConfirm = async () => {
    if (!blockingDialog) return;

    try {
      const user = await supabase.auth.getUser();
      const updates: any = { 
        status: 'BLOCKED',
        is_completed: false,
        completed_by: null,
        completed_at: null
      };

      // Add blocking information to description
      const { otherContent } = extractBlockingInfo(blockingDialog.item.description);
      let description = otherContent;
      
      // Remove duplicates and filter empty values from blocking tasks
      const uniqueBlockingTasks = [...new Set(blockingDialog.blockingTasks.filter(task => task.trim()))];
      
      // Append blocking information
      if (uniqueBlockingTasks.length > 0 || blockingDialog.additionalInfo.trim()) {
        const blockingInfo = [];
        if (uniqueBlockingTasks.length > 0) {
          blockingInfo.push(`Tareas bloqueantes: ${uniqueBlockingTasks.join(', ')}`);
        }
        if (blockingDialog.additionalInfo.trim()) {
          blockingInfo.push(`Información adicional: ${blockingDialog.additionalInfo.trim()}`);
        }
        
        // Add blocking info to description
        if (description) {
          description += ` | ${blockingInfo.join(' | ')}`;
        } else {
          description = blockingInfo.join(' | ');
        }
        updates.description = description;
      } else {
        // If no blocking info, just keep the original content
        updates.description = description || null;
      }

      const { error } = await supabase
        .from('project_checklist_items')
        .update(updates)
        .eq('id', blockingDialog.item.id);

      if (error) throw error;

      setBlockingDialog(null);
      fetchChecklistItems();
      
      toast({
        title: "Tarea bloqueada",
        description: "La tarea ha sido marcada como bloqueada correctamente.",
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    }
  };

  const handleReviewConfirm = async () => {
    if (!reviewDialog) return;

    try {
      const user = await supabase.auth.getUser();
      const updates: any = { 
        status: 'IN_REVIEW',
        is_completed: false,
        completed_by: null,
        completed_at: null
      };

      // Add review reason to description
      if (reviewDialog.reason.trim()) {
        let description = reviewDialog.item.description || '';
        const reviewInfo = `Motivo de revisión: ${reviewDialog.reason.trim()}`;
        
        if (description) {
          description += ` | ${reviewInfo}`;
        } else {
          description = reviewInfo;
        }
        updates.description = description;
      }

      const { error } = await supabase
        .from('project_checklist_items')
        .update(updates)
        .eq('id', reviewDialog.item.id);

      if (error) throw error;

      setReviewDialog(null);
      fetchChecklistItems();
      
      toast({
        title: "Tarea en revisión",
        description: "La tarea ha sido marcada para revisión correctamente.",
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    }
  };

  const toggleItemCompletion = async (item: ChecklistItem) => {
    const newStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await updateTaskStatus(item, newStatus);
  };

  const deleteItem = async () => {
    if (!deleteConfirm) return;

    try {
      // If this item is selected and there are multiple selected items, delete all selected
      if (selectedItems.has(deleteConfirm.id) && selectedItems.size > 1) {
        const { error } = await supabase
          .from('project_checklist_items')
          .delete()
          .in('id', Array.from(selectedItems));

        if (error) throw error;

        setSelectedItems(new Set());
        setDeleteConfirm(null);
        fetchChecklistItems();
        
        toast({
          title: "Elementos eliminados",
          description: `${selectedItems.size} elementos han sido eliminados de la checklist.`,
        });
      } else {
        // Delete only the single item
        const { error } = await supabase
          .from('project_checklist_items')
          .delete()
          .eq('id', deleteConfirm.id);

        if (error) throw error;

        setDeleteConfirm(null);
        fetchChecklistItems();
        
        toast({
          title: "Elemento eliminado",
          description: "El elemento se ha eliminado de la checklist.",
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento de la checklist.",
        variant: "destructive",
      });
    }
  };

  const clearAllItems = async () => {
    try {
      const { error } = await supabase
        .from('project_checklist_items')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      setClearAllConfirm(false);
      setItems([]); // Clear the items immediately
      
      toast({
        title: "Checklist vaciada",
        description: "Todos los elementos han sido eliminados de la checklist.",
      });
    } catch (error) {
      console.error('Error clearing checklist:', error);
      toast({
        title: "Error",
        description: "No se pudo vaciar la checklist.",
        variant: "destructive",
      });
    }
  };

  // Selection functions
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const selectAllVisible = () => {
    // Calculate filtered items with normalized sections
    const visibleItems = items.filter(item => {
      let itemSection = item.section || 'SIN_CATEGORIA';
      if (itemSection === 'PRODUCCIÓN') itemSection = 'PRODUCCION';
      if (itemSection === 'Sin categoría' || itemSection === null) itemSection = 'SIN_CATEGORIA';
      
      const sectionMatch = filterSection === 'all' || itemSection === filterSection;
      const statusMatch = selectedStatuses.size === 0 || selectedStatuses.has(item.status || 'PENDING');
      const ownerMatch = filterOwner === 'all' || (item.description || 'Sin asignar') === filterOwner;
      return sectionMatch && statusMatch && ownerMatch;
    });
    const visibleItemIds = new Set(visibleItems.map(item => item.id));
    setSelectedItems(visibleItemIds);
  };

  // Bulk actions
  const bulkUpdateStatus = async (newStatus: TaskStatus) => {
    if (selectedItems.size === 0) return;

    try {
      const user = await supabase.auth.getUser();
      const updates: any = { status: newStatus };
      
      if (newStatus === 'COMPLETED') {
        updates.is_completed = true;
        updates.completed_by = user.data.user?.id;
        updates.completed_at = new Date().toISOString();
      } else {
        updates.is_completed = false;
        updates.completed_by = null;
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('project_checklist_items')
        .update(updates)
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchChecklistItems();
      
      toast({
        title: "Tareas actualizadas",
        description: `${selectedItems.size} tareas han sido marcadas como ${STATUS_LABELS[newStatus].toLowerCase()}.`,
      });
    } catch (error) {
      console.error('Error updating tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las tareas seleccionadas.",
        variant: "destructive",
      });
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      const { error } = await supabase
        .from('project_checklist_items')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchChecklistItems();
      
      toast({
        title: "Tareas eliminadas",
        description: `${selectedItems.size} tareas han sido eliminadas.`,
      });
    } catch (error) {
      console.error('Error deleting tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las tareas seleccionadas.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Checklist del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Cargando checklist...</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate progress based on COMPLETED status only
  const completedCount = items.filter(item => item.status === 'COMPLETED').length;
  const progressPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // Get unique sections for filters (normalize them)
  const sections = Array.from(new Set(items.map(item => {
    let section = item.section || 'SIN_CATEGORIA';
    if (section === 'PRODUCCIÓN') section = 'PRODUCCION';
    if (section === 'Sin categoría' || section === null) section = 'SIN_CATEGORIA';
    return section;
  }).filter(Boolean)));
  const owners = Array.from(new Set(items.map(item => item.description || 'Sin asignar').filter(Boolean)));

  // Filter items based on current filters
  const filteredItems = items.filter(item => {
    let itemSection = item.section || 'SIN_CATEGORIA';
    if (itemSection === 'PRODUCCIÓN') itemSection = 'PRODUCCION';
    if (itemSection === 'Sin categoría' || itemSection === null) itemSection = 'SIN_CATEGORIA';
    
    const sectionMatch = filterSection === 'all' || itemSection === filterSection;
    const statusMatch = selectedStatuses.size === 0 || selectedStatuses.has(item.status || 'PENDING');
    const ownerMatch = filterOwner === 'all' || (item.description || 'Sin asignar') === filterOwner;
    
    return sectionMatch && statusMatch && ownerMatch;
  });

  // Group items by section
  const groupedItems = filteredItems.reduce((acc, item) => {
    let section = item.section || 'SIN_CATEGORIA';
    // Normalize section names - handle accented versions
    if (section === 'PRODUCCIÓN') section = 'PRODUCCION';
    if (section === 'Sin categoría' || section === null) section = 'SIN_CATEGORIA';
    
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const getSectionDisplayName = (section: string) => {
    const sectionMap: Record<string, string> = {
      'PREPARATIVOS': 'PREPARATIVOS',
      'PRODUCCION': 'PRODUCCION', 
      'CIERRE': 'CIERRE',
      'SIN_CATEGORIA': 'SIN CATEGORIA'
    };
    return sectionMap[section] || section;
  };

  const getSectionColor = (section: string) => {
    // Return neutral colors for all sections
    return 'bg-muted text-muted-foreground';
  };

  // Get status counts for filter labels
  const statusCounts = items.reduce((acc, item) => {
    const status = item.status || 'PENDING';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  return (
    <>
      <Collapsible open={isChecklistExpanded} onOpenChange={setIsChecklistExpanded}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Checklist
                    {isChecklistExpanded ? (
                      <ChevronUp className="w-4 h-4 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-2" />
                    )}
                  </CardTitle>
                </Button>
              </CollapsibleTrigger>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <MoreVertical className="w-4 h-4 mr-2" />
                      Acciones
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg">
                    <DropdownMenuItem onClick={() => setOpenTemplateDialog(true)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Crear desde plantilla
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenAddDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir elemento
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenSaveTemplateDialog(true)}>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar como plantilla
                    </DropdownMenuItem>
                    {items.length > 0 && (
                      <DropdownMenuItem 
                        onClick={() => setClearAllConfirm(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Vaciar todo
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {items.length > 0 && (
              <div className="flex items-center justify-between text-sm mt-3">
                <div className="text-muted-foreground">
                  {completedCount} completadas · {progressPercentage}%
                </div>
                <div className="h-2 bg-muted rounded-full w-32">
                  <div 
                    className="h-2 bg-primary rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No hay elementos en la checklist.
                  {canEdit && " Se cargará automáticamente una plantilla predeterminada."}
                </div>
              ) : (
                <>
                  {/* Gmail-style action bar */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-6">
                    <div className="flex items-center gap-4">
                      {/* Master checkbox */}
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedItems.size > 0 && selectedItems.size === filteredItems.length && filteredItems.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                selectAllVisible();
                              } else {
                                clearSelection();
                              }
                            }}
                            className="border-2"
                          />
                          <span className="text-sm">
                            {selectedItems.size > 0 ? `${selectedItems.size} seleccionadas` : 'Seleccionar todas'}
                          </span>
                          
                          {/* Deselect button - always integrated, only visible when items are selected */}
                          {selectedItems.size > 0 && (
                            <Button
                              onClick={clearSelection}
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                            >
                              Deseleccionar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <Select value={filterSection} onValueChange={setFilterSection}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Por sección" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg">
                          <SelectItem value="all">Todas las secciones</SelectItem>
                          {sections.map((section) => (
                            <SelectItem key={section} value={section}>
                              {getSectionDisplayName(section)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Multi-select Status Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-40 justify-between">
                            <span>
                              {selectedStatuses.size === 0 ? 'Todos los estados' : 
                               selectedStatuses.size === 1 ? STATUS_LABELS[Array.from(selectedStatuses)[0]] :
                               `${selectedStatuses.size} estados`}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-background border shadow-lg">
                          {Object.entries(STATUS_LABELS).map(([status, label]) => (
                            <DropdownMenuCheckboxItem
                              key={status}
                              checked={selectedStatuses.has(status as TaskStatus)}
                              onCheckedChange={(checked) => {
                                const newStatuses = new Set(selectedStatuses);
                                if (checked) {
                                  newStatuses.add(status as TaskStatus);
                                } else {
                                  newStatuses.delete(status as TaskStatus);
                                }
                                setSelectedStatuses(newStatuses);
                              }}
                            >
                              <Badge variant="secondary" className={`${STATUS_COLORS[status as TaskStatus]} mr-2`}>
                                {label}
                              </Badge>
                              ({statusCounts[status as TaskStatus] || 0})
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Select value={filterOwner} onValueChange={setFilterOwner}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Por responsable" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg">
                          <SelectItem value="all">Todos</SelectItem>
                          {owners.map((owner) => (
                            <SelectItem key={owner} value={owner}>
                              {owner}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>


                  {/* Sections */}
                  {Object.entries(groupedItems).map(([section, sectionItems]) => {
                    const sectionCompleted = sectionItems.filter(item => item.status === 'COMPLETED').length;
                    const sectionProgress = sectionItems.length > 0 ? Math.round((sectionCompleted / sectionItems.length) * 100) : 0;
                    
                    return (
                      <div key={section} className="mb-6">
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedSections(prev => ({
                            ...prev,
                            [section]: !prev[section]
                          }))}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className={getSectionColor(section)}>
                              {getSectionDisplayName(section)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ({sectionCompleted}/{sectionItems.length} completadas · {sectionProgress}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-2 bg-muted rounded-full w-24">
                              <div 
                                className="h-2 bg-primary rounded-full transition-all duration-300" 
                                style={{ width: `${sectionProgress}%` }}
                              />
                            </div>
                            {expandedSections[section] ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4 transform -rotate-90" />
                            )}
                          </div>
                        </div>

                        {expandedSections[section] && (
                          <div className="mt-2 space-y-2">
                            {sectionItems.map((item) => {
                              // Define card background based on status
                              let cardBackgroundClass = 'bg-background';
                              if (item.status === 'COMPLETED') {
                                cardBackgroundClass = 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/50';
                              } else if (item.status === 'CANCELLED') {
                                cardBackgroundClass = 'bg-gray-100 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600/50';
                              } else if (item.status === 'IN_PROGRESS') {
                                cardBackgroundClass = 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50';
                              } else if (item.status === 'BLOCKED') {
                                cardBackgroundClass = 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50';
                              } else if (item.status === 'IN_REVIEW') {
                                cardBackgroundClass = 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800/50';
                              }
                              // PENDING remains with default background (bg-background)

                              return (
                                <div 
                                  key={item.id} 
                                  className={`p-3 rounded border hover:shadow-sm transition-all ${
                                    selectedItems.has(item.id) ? 'bg-primary/5 border-primary/20' : cardBackgroundClass
                                  }`}
                                >
                                <div className="flex items-start gap-3">
                                   {canEdit && (
                                     <SelectionCheckbox
                                       checked={selectedItems.has(item.id)}
                                       onCheckedChange={() => toggleItemSelection(item.id)}
                                       className="mt-1"
                                     />
                                   )}
                                  
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-start justify-between gap-3">
                                       <div className="flex-1">
                                         <div className="flex items-center gap-2">
                                           <h4 className={`font-medium ${item.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                                             {item.title}
                                           </h4>
                                           {getTasksThatBlockOthers().has(item.title) && (
                                             <TriangleAlert className="w-4 h-4 text-orange-500 flex-shrink-0" aria-label="Esta tarea está bloqueando otras" />
                                           )}
                                           {extractBlockingInfo(item.description).wasUnblocked && item.status === 'PENDING' && (
                                             <TriangleAlert className="w-4 h-4 text-green-500 flex-shrink-0" aria-label="Esta tarea fue desbloqueada recientemente" />
                                           )}
                                         </div>
                                         {item.description && (
                                           <p className="text-sm text-muted-foreground mt-1">
                                             {item.description}
                                           </p>
                                         )}
                                       </div>
                                      
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Status badge and quick actions */}
                                        <div className="flex items-center gap-2">
                                          {canEdit ? (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="ghost" className="h-6 px-2">
                                                  <Badge variant="secondary" className={STATUS_COLORS[item.status || 'PENDING']}>
                                                    {STATUS_LABELS[item.status || 'PENDING']}
                                                  </Badge>
                                                  <ChevronDown className="w-3 h-3 ml-1" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent className="bg-background border shadow-lg">
                                                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                                  <DropdownMenuItem
                                                    key={status}
                                                    onClick={() => updateTaskStatus(item, status as TaskStatus)}
                                                  >
                                                    <Badge variant="secondary" className={`${STATUS_COLORS[status as TaskStatus]} mr-2`}>
                                                      {label}
                                                    </Badge>
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          ) : (
                                            <Badge variant="secondary" className={STATUS_COLORS[item.status || 'PENDING']}>
                                              {STATUS_LABELS[item.status || 'PENDING']}
                                            </Badge>
                                          )}
                                        </div>

                                        {canEdit && (
                                          <div className="flex items-center gap-1">
                                            {/* Quick toggle completed */}
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => toggleItemCompletion(item)}
                                              className="h-6 w-6 p-0"
                                            >
                                              {item.status === 'COMPLETED' ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Clock className="w-4 h-4 text-muted-foreground" />
                                              )}
                                            </Button>
                                            
                                            {/* Delete button */}
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setDeleteConfirm(item)}
                                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                 </div>
                                </div>
                              );
                            })}
                           </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete single item confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El elemento "{deleteConfirm?.title}" será eliminado permanentemente de la checklist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirmation */}
      <AlertDialog open={clearAllConfirm} onOpenChange={setClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vaciar toda la checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Todos los elementos de la checklist serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAllItems}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Vaciar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template dialogs temporarily disabled - will be fixed in next update */}

      {/* Add new item dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir elemento a la checklist</DialogTitle>
            <DialogDescription>
              Agrega un nuevo elemento a la checklist del proyecto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-medium">
                Título
              </label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título del elemento"
              />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Descripción (opcional)
              </label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descripción del elemento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addChecklistItem}>
              Añadir elemento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk update confirmation */}
      <AlertDialog 
        open={!!bulkUpdateConfirm} 
        onOpenChange={() => setBulkUpdateConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Actualizar elementos seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkUpdateConfirm && (
                <>
                  Se actualizarán {bulkUpdateConfirm.count} elementos al estado "{STATUS_LABELS[bulkUpdateConfirm.status]}".
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (bulkUpdateConfirm) {
                  try {
                    await bulkUpdateStatus(bulkUpdateConfirm.status);
                    setBulkUpdateConfirm(null);
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "No se pudieron actualizar las tareas seleccionadas.",
                      variant: "destructive",
                    });
                  }
                }
              }}
            >
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocking dialog */}
      <Dialog open={!!blockingDialog} onOpenChange={() => setBlockingDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Marcar tarea como bloqueada</DialogTitle>
            <DialogDescription>
              Proporciona información sobre qué está bloqueando esta tarea: "{blockingDialog?.item.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="blocking-tasks" className="text-sm font-medium mb-2 block">
                ¿Hay alguna tarea que esté bloqueando esta?
              </label>
              <div className="space-y-2">
                {items
                  .filter(item => item.id !== blockingDialog?.item.id && item.status !== 'COMPLETED')
                  .map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`blocking-${item.id}`}
                        checked={blockingDialog?.blockingTasks.includes(item.title) || false}
                        onCheckedChange={(checked) => {
                          if (!blockingDialog) return;
                          const newBlockingTasks = checked
                            ? [...blockingDialog.blockingTasks, item.title]
                            : blockingDialog.blockingTasks.filter(t => t !== item.title);
                          setBlockingDialog({
                            ...blockingDialog,
                            blockingTasks: newBlockingTasks
                          });
                        }}
                      />
                      <label htmlFor={`blocking-${item.id}`} className="text-sm">
                        {item.title}
                        <Badge variant="secondary" className={`${STATUS_COLORS[item.status || 'PENDING']} ml-2`}>
                          {STATUS_LABELS[item.status || 'PENDING']}
                        </Badge>
                      </label>
                    </div>
                  ))}
                {items.filter(item => item.id !== blockingDialog?.item.id && item.status !== 'COMPLETED').length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay otras tareas disponibles para seleccionar.</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="additional-info" className="text-sm font-medium mb-2 block">
                Información adicional (opcional)
              </label>
              <Textarea
                id="additional-info"
                value={blockingDialog?.additionalInfo || ''}
                onChange={(e) => {
                  if (!blockingDialog) return;
                  setBlockingDialog({
                    ...blockingDialog,
                    additionalInfo: e.target.value
                  });
                }}
                placeholder="Describe qué está bloqueando esta tarea o proporciona información adicional..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockingDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleBlockingConfirm} variant="destructive">
              Marcar como bloqueada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar tarea en revisión</DialogTitle>
            <DialogDescription>
              Añade el motivo por el cual la tarea "{reviewDialog?.item.title}" necesita revisión.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="review-reason" className="text-sm font-medium mb-2 block">
              Motivo de revisión (opcional)
            </label>
            <Textarea
              id="review-reason"
              value={reviewDialog?.reason || ''}
              onChange={(e) => {
                if (!reviewDialog) return;
                setReviewDialog({
                  ...reviewDialog,
                  reason: e.target.value
                });
              }}
              placeholder="Describe por qué esta tarea necesita revisión..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReviewConfirm} variant="secondary">
              Marcar en revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <TemplateSelectionDialog
        open={openTemplateDialog}
        onOpenChange={setOpenTemplateDialog}
        projectId={projectId}
        onTemplateApplied={fetchChecklistItems}
      />

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={openSaveTemplateDialog}
        onOpenChange={setOpenSaveTemplateDialog}
        checklistItems={items}
        onTemplateSaved={() => {
          setOpenSaveTemplateDialog(false);
          toast({
            title: "Plantilla guardada",
            description: "La plantilla se ha guardado correctamente.",
          });
        }}
      />
    </>
  );
}