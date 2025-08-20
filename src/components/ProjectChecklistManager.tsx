import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, CheckCircle2, FileText, Save } from "lucide-react";
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
      setItems(data || []);
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

  const addChecklistItem = async () => {
    if (!newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('project_checklist_items')
        .insert({
          project_id: projectId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          sort_order: items.length,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
        });

      if (error) throw error;

      toast({
        title: "Elemento añadido",
        description: "El elemento se ha añadido a la checklist.",
      });

      setNewTitle("");
      setNewDescription("");
      setOpenAddDialog(false);
      fetchChecklistItems();
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
      const updates = item.is_completed
        ? { is_completed: false, completed_by: null, completed_at: null }
        : { is_completed: true, completed_by: user.data.user?.id, completed_at: new Date().toISOString() };

      const { error } = await supabase
        .from('project_checklist_items')
        .update(updates)
        .eq('id', item.id);

      if (error) throw error;
      fetchChecklistItems();
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el elemento.",
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

      toast({
        title: "Elemento eliminado",
        description: "El elemento ha sido eliminado de la checklist.",
      });

      setDeleteConfirm(null);
      fetchChecklistItems();
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento.",
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

      toast({
        title: "Checklist vaciada",
        description: "Todos los elementos han sido eliminados de la checklist.",
      });

      setClearAllConfirm(false);
      fetchChecklistItems();
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
                {items.length === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenTemplateDialog(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Crear desde plantilla
                  </Button>
                )}
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
                {items.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenSaveTemplateDialog(true)}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar como plantilla
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setClearAllConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Vaciar todo
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {completedCount} de {items.length} completados ({progressPercentage}%)
            </div>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay elementos en la checklist.
              {canEdit && " Añade el primer elemento para empezar."}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
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
                      <div className={`text-sm mt-1 ${item.is_completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                        {item.description}
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