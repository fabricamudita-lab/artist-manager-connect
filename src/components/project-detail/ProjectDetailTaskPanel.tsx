import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Upload, FileText, CalendarIcon, Paperclip, Plus, ChevronDown, ChevronRight,
  ExternalLink, FolderOpen, Trash2, Copy, AlertTriangle, Check, X, Link,
  MessageSquare, Activity, Send,
} from "lucide-react";

interface TaskDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  tasks: any[];
  profile: any;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onUpdateTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (task: any) => void;
  onDuplicateTask: (task: any) => void;
  onSetTask: (task: any) => void;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  showEventFolderSelector: boolean;
  onShowEventFolderSelectorChange: (show: boolean) => void;
  onFileUpload: (files: FileList | null) => void;
  onLinkFromEventFolder: (folder: string) => void;
  onRemoveFile: (fileId: string) => void;
  autosaveTask: (task: any) => void;
}

export function ProjectDetailTaskPanel({
  open, onOpenChange, task, tasks, profile,
  collapsedSections, onToggleSection,
  onUpdateTask, onDeleteTask, onCompleteTask, onDuplicateTask, onSetTask,
  newComment, onNewCommentChange, onAddComment,
  fileInputRef, showEventFolderSelector, onShowEventFolderSelectorChange,
  onFileUpload, onLinkFromEventFolder, onRemoveFile, autosaveTask,
}: TaskDetailPanelProps) {
  if (!task) return null;

  const handleFieldChange = (field: string, value: any) => {
    const updatedTask = { ...task, [field]: value };
    onSetTask(updatedTask);
    onUpdateTask(updatedTask);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalles de la tarea</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {/* Título editable */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <Input 
              value={task.nombre}
              onChange={(e) => handleFieldChange('nombre', e.target.value)}
              className="font-medium"
            />
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select value={task.estado} onValueChange={(value) => handleFieldChange('estado', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">⬜ Pendiente</SelectItem>
                <SelectItem value="en_progreso">🟨 En progreso</SelectItem>
                <SelectItem value="completada">🟩 Completada</SelectItem>
                <SelectItem value="bloqueada">🟥 Bloqueada</SelectItem>
                <SelectItem value="cancelada">⬛ Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select value={task.categoria} onValueChange={(value) => handleFieldChange('categoria', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Planificación", "Documentación", "Legal", "Técnico", "Financiero", "Marketing", "Logística", "Análisis", "Diseño", "Comunicación"].map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select value={task.prioridad} onValueChange={(value) => handleFieldChange('prioridad', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta">🔴 Alta</SelectItem>
                <SelectItem value="Media">🟡 Media</SelectItem>
                <SelectItem value="Baja">🟢 Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Responsables */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Responsables</label>
            <div className="border rounded-md p-2 min-h-[40px]">
              <div className="flex flex-wrap gap-1">
                {task.responsables.map((responsable: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {responsable}
                    <button
                      onClick={() => {
                        const newResponsables = task.responsables.filter((_: any, i: number) => i !== index);
                        handleFieldChange('responsables', newResponsables);
                      }}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >×</button>
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Responsables actuales. En el futuro podrás seleccionar del equipo del proyecto.
            </p>
          </div>

          {/* Vencimiento */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vencimiento</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !task.vencimiento && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {task.vencimiento ? format(new Date(task.vencimiento), "PPP") : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.vencimiento ? new Date(task.vencimiento) : undefined}
                  onSelect={(date) => handleFieldChange('vencimiento', date ? date.toISOString() : null)}
                  className={cn("p-3 pointer-events-auto")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Comentarios */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comentarios</label>
            <Textarea
              value={task.comentarios || ""}
              onChange={(e) => handleFieldChange('comentarios', e.target.value)}
              placeholder="Añadir comentarios o notas..."
              rows={4}
            />
          </div>

          {/* Ejecución Section */}
          <Collapsible open={!collapsedSections.ejecucion} onOpenChange={() => onToggleSection('ejecucion')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full pt-4 border-t">
              <h3 className="text-sm font-medium">Ejecución</h3>
              {collapsedSections.ejecucion ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Definition of Done */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Definition of Done</label>
                <div className="space-y-2">
                  {(task.definitionOfDone || []).map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.completed} onChange={(e) => {
                        const newDod = [...(task.definitionOfDone || [])];
                        newDod[index] = { ...item, completed: e.target.checked };
                        handleFieldChange('definitionOfDone', newDod);
                      }} className="rounded border-gray-300" />
                      <Input value={item.text} onChange={(e) => {
                        const newDod = [...(task.definitionOfDone || [])];
                        newDod[index] = { ...item, text: e.target.value };
                        handleFieldChange('definitionOfDone', newDod);
                      }} className="flex-1 text-sm" placeholder="Criterio de aceptación..." />
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newDod = (task.definitionOfDone || []).filter((_: any, i: number) => i !== index);
                        handleFieldChange('definitionOfDone', newDod);
                      }}><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    const newDod = [...(task.definitionOfDone || []), { id: Date.now().toString(), text: "", completed: false }];
                    handleFieldChange('definitionOfDone', newDod);
                  }} className="w-full"><Plus className="w-4 h-4 mr-2" />Añadir criterio</Button>
                </div>
              </div>

              {/* Pasos */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pasos</label>
                <div className="space-y-2">
                  {(task.pasos || []).map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.completed} onChange={(e) => {
                        const newPasos = [...(task.pasos || [])];
                        newPasos[index] = { ...item, completed: e.target.checked };
                        handleFieldChange('pasos', newPasos);
                      }} className="rounded border-gray-300" />
                      <Input value={item.text} onChange={(e) => {
                        const newPasos = [...(task.pasos || [])];
                        newPasos[index] = { ...item, text: e.target.value };
                        const updatedTask = { ...task, pasos: newPasos };
                        onSetTask(updatedTask);
                        autosaveTask(updatedTask);
                      }} onBlur={(e) => {
                        const newPasos = [...(task.pasos || [])];
                        newPasos[index] = { ...item, text: e.target.value };
                        handleFieldChange('pasos', newPasos);
                      }} onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const newPasos = [...(task.pasos || []), { id: Date.now().toString(), text: "", completed: false }];
                          handleFieldChange('pasos', newPasos);
                          setTimeout(() => {
                            const inputs = document.querySelectorAll('input[placeholder="Paso a seguir..."]');
                            (inputs[inputs.length - 1] as HTMLInputElement)?.focus();
                          }, 50);
                        }
                      }} className="flex-1 text-sm" placeholder="Paso a seguir..." />
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newPasos = (task.pasos || []).filter((_: any, i: number) => i !== index);
                        handleFieldChange('pasos', newPasos);
                      }}><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    const newPasos = [...(task.pasos || []), { id: Date.now().toString(), text: "", completed: false }];
                    handleFieldChange('pasos', newPasos);
                  }} className="w-full"><Plus className="w-4 h-4 mr-2" />Añadir paso</Button>
                </div>
              </div>

              {/* Recursos necesarios */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Recursos necesarios</label>
                <div className="space-y-2">
                  {(task.recursos || []).map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input value={item.name} onChange={(e) => {
                        const newRecursos = [...(task.recursos || [])];
                        newRecursos[index] = { ...item, name: e.target.value };
                        handleFieldChange('recursos', newRecursos);
                      }} className="flex-1 text-sm" placeholder="Nombre del recurso..." />
                      <Input value={item.url} onChange={(e) => {
                        const newRecursos = [...(task.recursos || [])];
                        newRecursos[index] = { ...item, url: e.target.value };
                        handleFieldChange('recursos', newRecursos);
                      }} className="flex-1 text-sm" placeholder="URL..." />
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newRecursos = (task.recursos || []).filter((_: any, i: number) => i !== index);
                        handleFieldChange('recursos', newRecursos);
                      }}><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    const newRecursos = [...(task.recursos || []), { id: Date.now().toString(), name: "", url: "" }];
                    handleFieldChange('recursos', newRecursos);
                  }} className="w-full"><Plus className="w-4 h-4 mr-2" />Añadir recurso</Button>
                </div>
              </div>

              {/* Dependencias */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Dependencias</label>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Bloqueada por:</label>
                  <Select value="" onValueChange={(value) => {
                    if (value && !task.bloqueadaPor?.includes(value)) {
                      handleFieldChange('bloqueadaPor', [...(task.bloqueadaPor || []), value]);
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tarea..." /></SelectTrigger>
                    <SelectContent>
                      {tasks.filter(t => t.id !== task.id).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nombre} ({t.etapa})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    {(task.bloqueadaPor || []).map((taskId: string) => {
                      const blockingTask = tasks.find(t => t.id === taskId);
                      return blockingTask ? (
                        <Badge key={taskId} variant={blockingTask.estado === "completada" ? "default" : "destructive"} className="text-xs">
                          {blockingTask.nombre}
                          <button onClick={() => handleFieldChange('bloqueadaPor', (task.bloqueadaPor || []).filter((id: string) => id !== taskId))} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">×</button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Bloquea a:</label>
                  <Select value="" onValueChange={(value) => {
                    if (value && !task.bloqueaA?.includes(value)) {
                      handleFieldChange('bloqueaA', [...(task.bloqueaA || []), value]);
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tarea..." /></SelectTrigger>
                    <SelectContent>
                      {tasks.filter(t => t.id !== task.id).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nombre} ({t.etapa})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    {(task.bloqueaA || []).map((taskId: string) => {
                      const blockedTask = tasks.find(t => t.id === taskId);
                      return blockedTask ? (
                        <Badge key={taskId} variant="outline" className="text-xs">
                          {blockedTask.nombre}
                          <button onClick={() => handleFieldChange('bloqueaA', (task.bloqueaA || []).filter((id: string) => id !== taskId))} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">×</button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Contexto Section */}
          <Collapsible open={!collapsedSections.contexto} onOpenChange={() => onToggleSection('contexto')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full pt-4 border-t">
              <h3 className="text-sm font-medium">Contexto</h3>
              {collapsedSections.contexto ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Brief */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Brief / Información adicional</label>
                <Textarea
                  value={task.brief || ""}
                  onChange={(e) => { const u = { ...task, brief: e.target.value }; onSetTask(u); autosaveTask(u); }}
                  onBlur={(e) => handleFieldChange('brief', e.target.value)}
                  placeholder="Información adicional sobre la tarea..."
                  rows={3}
                />
              </div>

              {/* Riesgos */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Riesgos & mitigaciones</label>
                <div className="space-y-2">
                  {(task.riesgos || []).map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <Input value={item.text} onChange={(e) => {
                        const newRiesgos = [...(task.riesgos || [])];
                        newRiesgos[index] = { ...item, text: e.target.value };
                        handleFieldChange('riesgos', newRiesgos);
                      }} className="flex-1 text-sm" placeholder="Describir riesgo y mitigación..." />
                      <Button variant="ghost" size="sm" onClick={() => {
                        handleFieldChange('riesgos', (task.riesgos || []).filter((_: any, i: number) => i !== index));
                      }}><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    handleFieldChange('riesgos', [...(task.riesgos || []), { id: Date.now().toString(), text: "" }]);
                  }} className="w-full"><Plus className="w-4 h-4 mr-2" />Añadir riesgo</Button>
                </div>
              </div>

              {/* Comentarios thread */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2"><MessageSquare className="w-4 h-4" />Comentarios</label>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(task.comentarios || []).map((comment: any) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">{new Date(comment.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      {comment.mentions?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {comment.mentions.map((mention: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">@{mention}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea value={newComment} onChange={(e) => onNewCommentChange(e.target.value)} placeholder="Escribe un comentario... (usa @nombre para mencionar)" rows={2} className="flex-1" />
                  <Button size="sm" onClick={onAddComment} disabled={!newComment.trim()}><Send className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Actividad */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4" />Actividad</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(task.actividad || []).reverse().map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 py-2 border-l-2 border-muted pl-3">
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{activity.author}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!task.actividad || task.actividad.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay actividad registrada</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Archivos Section */}
          <Collapsible open={!collapsedSections.archivos} onOpenChange={() => onToggleSection('archivos')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full pt-4 border-t">
              <h3 className="text-sm font-medium">Archivos</h3>
              {collapsedSections.archivos ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />Subir archivo
                </Button>
                <Button variant="outline" size="sm" onClick={() => onShowEventFolderSelectorChange(true)} className="flex-1">
                  <Link className="w-4 h-4 mr-2" />Vincular desde carpeta
                </Button>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => onFileUpload(e.target.files)} />
              {showEventFolderSelector && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Seleccionar carpeta del evento</h4>
                    <Button variant="ghost" size="sm" onClick={() => onShowEventFolderSelectorChange(false)}><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {["Assets", "Facturas", "Contrato", "Sendings"].map((folder) => (
                      <Button key={folder} variant="outline" size="sm" onClick={() => onLinkFromEventFolder(folder)} className="justify-start">
                        <FolderOpen className="w-4 h-4 mr-2" />{folder}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {(task.archivos || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay archivos adjuntos</p>
                ) : (
                  (task.archivos || []).map((archivo: any) => (
                    <div key={archivo.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                      <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{archivo.nombre}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{archivo.origen}</span><span>•</span>
                          <span>{new Date(archivo.fechaSubida).toLocaleDateString()}</span>
                          {archivo.tipo === "vinculado" && (<><span>•</span><span className="text-blue-600">Vinculado</span></>)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="Ver/Descargar"><ExternalLink className="w-4 h-4" /></Button>
                        {archivo.tipo === "vinculado" && (
                          <Button variant="ghost" size="sm" title="Ver en carpeta"><FolderOpen className="w-4 h-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onRemoveFile(archivo.id)} title="Quitar vínculo" className="text-destructive hover:text-destructive"><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t">
            <Button className="w-full" onClick={() => onCompleteTask(task)} disabled={task.estado === "completada"}>
              <Check className="w-4 h-4 mr-2" />Marcar completada
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleFieldChange('estado', 'bloqueada')}>
              <AlertTriangle className="w-4 h-4 mr-2" />Bloquear tarea
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onDuplicateTask(task)}>
              <Copy className="w-4 h-4 mr-2" />Duplicar
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => {
              if (confirm("¿Estás seguro de que quieres eliminar esta tarea?")) onDeleteTask(task.id);
            }}>
              <Trash2 className="w-4 h-4 mr-2" />Eliminar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
