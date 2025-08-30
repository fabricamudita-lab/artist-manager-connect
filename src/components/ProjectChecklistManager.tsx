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
import { Trash2, Plus, CheckCircle2, FileText, Save, Filter, Users, ChevronDown, MoreVertical, Clock, CheckCircle, ChevronUp } from "lucide-react";
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
  'PENDING': 'Pendientes',
  'IN_PROGRESS': 'En progreso',
  'BLOCKED': 'Bloqueadas',
  'IN_REVIEW': 'En revisión',
  'COMPLETED': 'Completadas',
  'CANCELLED': 'Canceladas'
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

  useEffect(() => {
    fetchChecklistItems();
  }, [projectId]);

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
    const colorMap: Record<string, string> = {
      'PREPARATIVOS': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'PRODUCCION': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'CIERRE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'SIN_CATEGORIA': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colorMap[section] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
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

                  {/* Bulk action bar - only visible when items are selected */}
                  {selectedItems.size > 0 && canEdit && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {selectedItems.size} elementos seleccionados
                        </span>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                Cambiar estado
                                <ChevronDown className="w-4 h-4 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-background border shadow-lg">
                              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => {
                                    setBulkUpdateConfirm({
                                      count: selectedItems.size,
                                      status: status as TaskStatus,
                                      items: new Set(selectedItems)
                                    });
                                  }}
                                >
                                  <Badge variant="secondary" className={`${STATUS_COLORS[status as TaskStatus]} mr-2`}>
                                    {label}
                                  </Badge>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (selectedItems.size > 0) {
                                const firstSelectedItem = items.find(item => selectedItems.has(item.id));
                                if (firstSelectedItem) {
                                  setDeleteConfirm(firstSelectedItem);
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

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
                            {sectionItems.map((item) => (
                              <div 
                                key={item.id} 
                                className={`p-3 rounded border hover:shadow-sm transition-all ${
                                  selectedItems.has(item.id) ? 'bg-primary/5 border-primary/20' : 'bg-background'
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
                                        <h4 className={`font-medium ${item.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                                          {item.title}
                                        </h4>
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
                            ))}
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
    </>
  );
}