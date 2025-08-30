import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistItem } from "./ProjectChecklistManager";
import { 
  Link, 
  Copy, 
  ExternalLink, 
  FileText, 
  DollarSign, 
  Users, 
  Calendar,
  Edit3,
  Save,
  X,
  Plus
} from 'lucide-react';
import { toast } from "@/hooks/use-toast";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ChecklistItem;
  projectId: string;
  onUpdateTask?: (task: ChecklistItem) => void;
}

interface LinkableItem {
  id: string;
  title: string;
  type: string;
  status?: string;
  created_at?: string;
  description?: string;
}

interface TaskNote {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

export const TaskDetailDialog = ({ open, onOpenChange, task, projectId, onUpdateTask }: TaskDetailDialogProps) => {
  const [linkedItems, setLinkedItems] = useState<string[]>([]);
  const [linkedItemsDetails, setLinkedItemsDetails] = useState<LinkableItem[]>([]);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Load linked items and notes from localStorage
  useEffect(() => {
    if (open && task) {
      const storedLinks = localStorage.getItem(`task_links_${task.id}`);
      const taskLinkedItems = storedLinks ? JSON.parse(storedLinks) : [];
      setLinkedItems(taskLinkedItems);

      const storedNotes = localStorage.getItem(`task_notes_${task.id}`);
      const taskNotes = storedNotes ? JSON.parse(storedNotes) : [];
      setNotes(taskNotes);

      // Get linked items details (simplified for demo)
      // In a real app, you'd fetch these from your database
      const mockLinkedItems: LinkableItem[] = taskLinkedItems.map((id: string) => ({
        id,
        title: `Elemento ${id.substring(0, 8)}`,
        type: 'Presupuesto',
        status: 'Pendiente',
        created_at: new Date().toISOString(),
        description: 'Descripción del elemento vinculado'
      }));
      setLinkedItemsDetails(mockLinkedItems);
    }
  }, [open, task]);

  const addNote = () => {
    if (!newNote.trim()) return;

    const note: TaskNote = {
      id: Date.now().toString(),
      text: newNote,
      createdAt: new Date().toISOString(),
      author: 'Usuario Actual'
    };

    const updatedNotes = [...notes, note];
    setNotes(updatedNotes);
    localStorage.setItem(`task_notes_${task.id}`, JSON.stringify(updatedNotes));
    setNewNote('');
    setIsEditingNote(false);

    toast({
      title: "Nota añadida",
      description: "La nota se ha guardado correctamente",
    });
  };

  const copyTaskInfo = () => {
    const taskInfo = `
📋 TAREA: ${task.title}
📁 Sección: ${task.section}
📊 Estado: ${task.status}
📝 Descripción: ${task.description || 'Sin descripción'}

${linkedItemsDetails.length > 0 ? `🔗 ELEMENTOS VINCULADOS:
${linkedItemsDetails.map(item => `• ${item.type}: ${item.title} (${item.status})`).join('\n')}` : ''}

${notes.length > 0 ? `📝 NOTAS:
${notes.map(note => `• ${note.text} - ${note.author} (${new Date(note.createdAt).toLocaleDateString()})`).join('\n')}` : ''}

---
Generado desde el sistema de gestión de proyectos
    `.trim();

    navigator.clipboard.writeText(taskInfo);
    toast({
      title: "Información copiada",
      description: "La información de la tarea se ha copiado al portapapeles",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'presupuesto':
      case 'budget':
        return <DollarSign className="w-4 h-4" />;
      case 'documento':
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'solicitud':
      case 'request':
        return <Users className="w-4 h-4" />;
      case 'approval':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Link className="w-4 h-4" />;
    }
  };

  const removeLink = (itemId: string) => {
    const updatedLinks = linkedItems.filter(id => id !== itemId);
    setLinkedItems(updatedLinks);
    localStorage.setItem(`task_links_${task.id}`, JSON.stringify(updatedLinks));
    
    const updatedDetails = linkedItemsDetails.filter(item => item.id !== itemId);
    setLinkedItemsDetails(updatedDetails);

    toast({
      title: "Enlace eliminado",
      description: "El elemento ha sido desvinculado de la tarea",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalles de la Tarea
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Task Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{task.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Sección</Label>
                    <p className="text-sm text-muted-foreground">{task.section}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Estado</Label>
                    <Badge variant="outline" className="ml-2">
                      {task.status}
                    </Badge>
                  </div>
                </div>
                
                {task.description && (
                  <div>
                    <Label className="text-sm font-medium">Descripción</Label>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTaskInfo}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Info
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Linked Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Elementos Vinculados ({linkedItemsDetails.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedItemsDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay elementos vinculados a esta tarea
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedItemsDetails.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getTypeIcon(item.type)}
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Ver elemento"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLink(item.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Desvincular"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Notas y Comentarios ({notes.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingNote(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir Nota
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Add Note Form */}
                {isEditingNote && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <Textarea
                      placeholder="Escribe tu nota o comentario..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={addNote}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingNote(false);
                          setNewNote('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes List */}
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay notas para esta tarea
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 border rounded-lg bg-background"
                      >
                        <p className="text-sm mb-2">{note.text}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{note.author}</span>
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};