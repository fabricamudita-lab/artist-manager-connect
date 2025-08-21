import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, CheckCircle2, FileText, Save, Filter, Users } from "lucide-react";
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

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
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
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  useEffect(() => {
    fetchChecklistItems();
  }, [projectId]);

  const fetchChecklistItems = async () => {
    try {
      const { data, error } = await supabase
        .from('project_checklist_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const checklistItems = data || [];
      setItems(checklistItems);
      
      // If checklist is empty, load a default system template
      if (checklistItems.length === 0 && canEdit) {
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

  const toggleItemCompletion = async (item: ChecklistItem) => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('project_checklist_items')
        .update({
          is_completed: !item.is_completed,
          completed_by: !item.is_completed ? user.data.user?.id : null,
          completed_at: !item.is_completed ? new Date().toISOString() : null,
        })
        .eq('id', item.id);

      if (error) throw error;

      fetchChecklistItems();
    } catch (error) {
      console.error('Error toggling item completion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del elemento.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async () => {
    if (!deleteConfirm) return;

    try {
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
      fetchChecklistItems();
      
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

  const completedCount = items.filter(item => item.is_completed).length;
  const progressPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // Get unique sections for filters
  const sections = Array.from(new Set(items.map(item => item.section || 'Sin categoría').filter(Boolean)));
  const owners = Array.from(new Set(items.map(item => item.description || 'Sin asignar').filter(Boolean)));

  // Filter items based on current filters
  const filteredItems = items.filter(item => {
    const sectionMatch = filterSection === 'all' || (item.section || 'Sin categoría') === filterSection;
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'completed' && item.is_completed) ||
      (filterStatus === 'pending' && !item.is_completed);
    const ownerMatch = filterOwner === 'all' || (item.description || 'Sin asignar') === filterOwner;
    
    return sectionMatch && statusMatch && ownerMatch;
  });

  // Group items by section
  const groupedItems = filteredItems.reduce((acc, item) => {
    const section = item.section || 'Sin categoría';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const getSectionDisplayName = (section: string) => {
    const sectionMap: Record<string, string> = {
      'PREPARATIVOS': 'Preparativos',
      'PRODUCCION': 'Producción', 
      'CIERRE': 'Cierre',
      'Sin categoría': 'Sin categoría'
    };
    return sectionMap[section] || section;
  };

  const getSectionColor = (section: string) => {
    const colorMap: Record<string, string> = {
      'PREPARATIVOS': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'PRODUCCION': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'CIERRE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Sin categoría': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colorMap[section] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Checklist del Proyecto
            </CardTitle>
            {canEdit && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenTemplateDialog(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Crear desde plantilla
                </Button>
                <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir elemento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Añadir elemento a la checklist</DialogTitle>
                      <DialogDescription>
                        Crea un nuevo elemento para la checklist del proyecto.
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
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenAddDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={addChecklistItem} disabled={!newTitle.trim()}>
                        Añadir
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenSaveTemplateDialog(true)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar como plantilla
                </Button>
                {items.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setClearAllConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Vaciar todo
                  </Button>
                )}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {completedCount} de {items.length} completados ({progressPercentage}%)
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
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay elementos en la checklist.
              {canEdit && " Se cargará automáticamente una plantilla predeterminada."}
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Filtros:</span>
                </div>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Por sección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las secciones</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {getSectionDisplayName(section)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterOwner} onValueChange={setFilterOwner}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Por responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los responsables</SelectItem>
                    {owners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Results count */}
              {filteredItems.length !== items.length && (
                <div className="text-sm text-muted-foreground mb-4">
                  Mostrando {filteredItems.length} de {items.length} elementos
                </div>
              )}

              {/* Grouped items by section */}
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([section, sectionItems]) => (
                  <div key={section} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`${getSectionColor(section)} font-medium`}
                      >
                        {getSectionDisplayName(section)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {sectionItems.filter(item => item.is_completed).length} / {sectionItems.length} completados
                      </span>
                    </div>
                    
                    <div className="space-y-2 ml-4">
                      {sectionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={item.is_completed}
                            onCheckedChange={() => canEdit && toggleItemCompletion(item)}
                            disabled={!canEdit}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.title}
                            </div>
                            {item.description && (
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                                  {item.description}
                                </span>
                              </div>
                            )}
                          </div>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirm(item)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay elementos que coincidan con los filtros seleccionados.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

      {/* Clear all items confirmation */}
      <AlertDialog open={clearAllConfirm} onOpenChange={setClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vaciar toda la checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Todos los elementos de la checklist serán eliminados permanentemente.
              ¿Estás seguro de que deseas continuar?
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
        checklistItems={items.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          sort_order: item.sort_order,
        }))}
        onTemplateSaved={() => {
          toast({
            title: "Plantilla guardada",
            description: "La plantilla se ha guardado correctamente.",
          });
        }}
      />
    </>
  );
}