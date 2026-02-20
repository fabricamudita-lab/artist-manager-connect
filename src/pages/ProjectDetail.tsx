import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { AddTeamMemberDialog } from "@/components/AddTeamMemberDialog";
import { TeamMemberProfileDialog } from "@/components/TeamMemberProfileDialog";
import { ApprovalsModule } from "@/components/ApprovalsModule";
import { AuthzBreadcrumb } from "@/components/AuthzBreadcrumb";
import { useAuthz, useConditionalRender } from "@/hooks/useAuthz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import BudgetDetailsDialog from "@/components/BudgetDetailsDialog";
import CreateBudgetDialog from "@/components/CreateBudgetDialog";
import { CreateSolicitudDialog } from "@/components/CreateSolicitudDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  FileText, 
  CalendarDays, 
  User, 
  Paperclip, 
  Plus, 
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Target, 
  Users,
  Download,
  Eye,
  ExternalLink,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  Filter,
  CalendarIcon,
  Trash2,
  Copy,
  AlertTriangle,
  Check,
  X,
  Link,
  Home,
  Folder,
} from "lucide-react";
import { MessageSquare, Activity, Send, Share2, BarChart2, TrendingUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProjectChecklistManager } from "@/components/ProjectChecklistManager";
import { ProjectFilesManager } from "@/components/ProjectFilesManager";
import { ProjectShareDialog } from "@/components/ProjectShareDialog";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  objective?: string | null;
  status: 'en_curso' | 'finalizado' | 'archivado';
  artist_id?: string | null;
  start_date?: string | null;
  end_date_estimada?: string | null;
  artist_name?: string | null;
  workspace_id?: string | null;
}

interface Artist {
  id: string;
  name: string;
  workspace_id: string;
}

interface Workspace {
  id: string;
  name: string;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { renderIf } = useConditionalRender();
  
  // Authorization check for this project
  const permissions = useAuthz({ projectId: id });
  
  // Debug permissions
  console.log('ProjectDetail - ID:', id);
  console.log('ProjectDetail - Permissions:', permissions);
  
  const [project, setProject] = useState<Project | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [team, setTeam] = useState<{ id: string; full_name: string; role: string | null }[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);

  const [openBudget, setOpenBudget] = useState(false);
  const [openSolicitud, setOpenSolicitud] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [openAddTask, setOpenAddTask] = useState(false);
  const [openAddMember, setOpenAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{id: string, type: 'profile' | 'contact'} | null>(null);
  const [editingTeamMemberId, setEditingTeamMemberId] = useState<string | null>(null);
  const [editingTeamMemberRole, setEditingTeamMemberRole] = useState('');
  const [currentStage, setCurrentStage] = useState<"PREPARATIVOS" | "PRODUCCIÓN" | "CIERRE" | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showEventFolderSelector, setShowEventFolderSelector] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Document upload state
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    category: '',
    file: null as File | null
  });

  // Document folder state
  const [currentDocumentFolder, setCurrentDocumentFolder] = useState<string | null>(null);
  const [documentFolders, setDocumentFolders] = useState<Record<string, any[]>>({});
  const [documentUploadProgress, setDocumentUploadProgress] = useState<Record<string, number>>({});

  // Load collapsed sections from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('taskPanel-collapsedSections');
    if (saved) {
      setCollapsedSections(JSON.parse(saved));
    }
  }, []);

  // Save collapsed sections to localStorage
  const toggleSection = (section: string) => {
    const newState = { ...collapsedSections, [section]: !collapsedSections[section] };
    setCollapsedSections(newState);
    localStorage.setItem('taskPanel-collapsedSections', JSON.stringify(newState));
  };

  // Tasks state
  const [tasks, setTasks] = useState([
    // Seed data for testing
    {
      id: "1",
      etapa: "PREPARATIVOS",
      nombre: "Confirmar disponibilidad de fechas",
      categoria: "Planificación",
      responsables: ["María García"],
      prioridad: "Alta",
      estado: "completada",
      comentarios: ""
    },
    {
      id: "2", 
      etapa: "PREPARATIVOS",
      nombre: "Solicitar riders técnicos",
      categoria: "Documentación",
      responsables: ["Juan López", "Ana Martín"],
      prioridad: "Media",
      estado: "en_progreso",
      comentarios: ""
    },
    {
      id: "3",
      etapa: "PREPARATIVOS", 
      nombre: "Contratar seguro del evento",
      categoria: "Legal",
      responsables: ["Carlos Ruiz"],
      prioridad: "Alta",
      estado: "pendiente",
      comentarios: ""
    },
    {
      id: "4",
      etapa: "PRODUCCIÓN",
      nombre: "Montaje del escenario",
      categoria: "Técnico",
      responsables: ["Equipo Técnico"],
      prioridad: "Alta",
      estado: "pendiente",
      comentarios: ""
    },
    {
      id: "5",
      etapa: "PRODUCCIÓN",
      nombre: "Prueba de sonido",
      categoria: "Técnico", 
      responsables: ["Técnico de sonido"],
      prioridad: "Media",
      estado: "bloqueada",
      comentarios: ""
    },
    {
      id: "6",
      etapa: "CIERRE",
      nombre: "Liquidación económica",
      categoria: "Financiero",
      responsables: ["Administración"],
      prioridad: "Alta",
      estado: "pendiente",
      comentarios: ""
    },
    {
      id: "7",
      etapa: "CIERRE",
      nombre: "Evaluación post-evento",
      categoria: "Análisis",
      responsables: ["Director de proyecto"],
      prioridad: "Baja",
      estado: "cancelada",
      comentarios: ""
    }
  ]);

  // Filter state - will be initialized after user and project are loaded
  const [activeFilters, setActiveFilters] = useState(new Set([
    "pendiente", "en_progreso", "completada", "bloqueada", "cancelada"
  ]));

  // Get filter storage key
  const getFilterStorageKey = () => {
    if (!profile?.user_id || !id) return null;
    return `checklist_filters_${profile.user_id}_${id}`;
  };

  // Save filters to localStorage
  const saveFiltersToStorage = (filters: Set<string>) => {
    const key = getFilterStorageKey();
    if (key) {
      localStorage.setItem(key, JSON.stringify([...filters]));
    }
  };

  // Load filters from localStorage
  const loadFiltersFromStorage = () => {
    const key = getFilterStorageKey();
    if (key) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return new Set(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading filters from storage:', error);
      }
    }
    // Default filters if nothing saved or error
    return new Set(["pendiente", "en_progreso", "completada", "bloqueada", "cancelada"]);
  };

  // Load filters when user and project are available
  useEffect(() => {
    if (profile?.user_id && id) {
      const savedFilters = loadFiltersFromStorage();
      setActiveFilters(savedFilters);
    }
  }, [profile?.user_id, id]);

  // Organize documents into folders when documents change
  useEffect(() => {
    const folders: Record<string, any[]> = {
      'Contratos': [],
      'Riders': [],
      'Financiero': [],
      'Prensa': [],
      'Legal': [],
      'Otros': []
    };

    documents.forEach((doc) => {
      const categoryMapping = {
        'contract': 'Contratos',
        'rider': 'Riders', 
        'financial': 'Financiero',
        'press': 'Prensa',
        'legal': 'Legal',
        'other': 'Otros',
        'setlist': 'Otros'
      };
      
      const folderName = categoryMapping[doc.category] || 'Otros';
      folders[folderName].push(doc);
    });

    setDocumentFolders(folders);
  }, [documents]);

  // Helper function to get status icon
  const getStatusIcon = (estado) => {
    switch (estado) {
      case "pendiente": return "⬜";
      case "en_progreso": return "🟨";
      case "completada": return "🟩";
      case "bloqueada": return "🟥";
      case "cancelada": return "⬛";
      default: return "⬜";
    }
  };

  // Helper function to get status label for tooltip
  const getStatusLabel = (estado) => {
    switch (estado) {
      case "pendiente": return "Pendiente";
      case "en_progreso": return "En progreso";
      case "completada": return "Completada";
      case "bloqueada": return "Bloqueada";
      case "cancelada": return "Cancelada";
      default: return "Pendiente";
    }
  };

  // Helper function to calculate progress for each stage (based on filtered tasks)
  const getStageProgress = (etapa) => {
    const stageTasks = tasks.filter(task => task.etapa === etapa && activeFilters.has(task.estado));
    const completedTasks = stageTasks.filter(task => task.estado === "completada");
    const total = stageTasks.length;
    const completed = completedTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  // Debounce utility
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Autosave with debounce
  const autosaveTask = React.useCallback(
    debounce((task: any) => {
      const updatedTasks = tasks.map(t => t.id === task.id ? task : t);
      setTasks(updatedTasks);
      toast({ title: "Cambios guardados automáticamente" });
    }, 1000),
    [tasks]
  );

  // Helper function to render tasks for a stage
  const renderStageTasks = (etapa) => {
    const stageTasks = tasks.filter(task => task.etapa === etapa && activeFilters.has(task.estado));
    const allStageTasks = tasks.filter(task => task.etapa === etapa);
    
    if (allStageTasks.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">No hay tareas en esta etapa</p>
          <Button variant="secondary" size="sm" onClick={() => {
            setCurrentStage(etapa);
            setOpenAddTask(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir tarea
          </Button>
        </div>
      );
    }

    if (stageTasks.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">No hay tareas visibles con los filtros actuales</p>
          <Button variant="secondary" size="sm" onClick={() => {
            setCurrentStage(etapa);
            setOpenAddTask(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir tarea
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {stageTasks.map(task => (
          <div 
            key={task.id} 
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => {
              setSelectedTask(task);
              setTaskPanelOpen(true);
            }}
          >
            <div 
              className="text-sm leading-none flex-shrink-0"
              title={getStatusLabel(task.estado)}
              style={{ fontSize: '14px' }}
            >
              {getStatusIcon(task.estado)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{task.nombre}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{task.categoria}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{task.responsables.join(", ")}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="pt-2">
          <Button variant="secondary" size="sm" onClick={() => {
            setCurrentStage(etapa);
            setOpenAddTask(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir tarea
          </Button>
        </div>
      </div>
    );
  };

  // Task creation function
  const handleCreateTask = (taskData: any) => {
    const newTask = {
      ...taskData,
      id: Date.now().toString(), // Simple ID generation for now
      definitionOfDone: [],
      pasos: [],
      recursos: [],
      bloqueadaPor: [],
      bloqueaA: [],
      brief: "",
      riesgos: [],
      comentarios: [],
      actividad: [],
      archivos: []
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
  };

  // Task update function
  const handleUpdateTask = (updatedTask: any) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  // Task delete function
  const handleDeleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    setTaskPanelOpen(false);
    setSelectedTask(null);
  };

  // Task duplicate function
  const handleDuplicateTask = (task: any) => {
    const duplicatedTask = {
      ...task,
      id: Date.now().toString(),
      nombre: `${task.nombre} (Copia)`,
      estado: "pendiente",
      definitionOfDone: task.definitionOfDone?.map(item => ({ ...item, id: Date.now() + Math.random() })) || [],
      pasos: task.pasos?.map(item => ({ ...item, id: Date.now() + Math.random() })) || [],
      recursos: task.recursos?.map(item => ({ ...item, id: Date.now() + Math.random() })) || [],
      bloqueadaPor: [],
      bloqueaA: [],
      brief: task.brief || "",
      riesgos: task.riesgos?.map(item => ({ ...item, id: Date.now() + Math.random() })) || [],
      comentarios: [],
      actividad: [
        {
          id: Date.now().toString(),
          type: "created",
          description: "Tarea duplicada",
          author: profile?.full_name || "Usuario",
          timestamp: new Date().toISOString()
        }
      ],
      archivos: []
    };
    setTasks(prevTasks => [...prevTasks, duplicatedTask]);
  };

  // Check if task has blocking dependencies
  const hasBlockingDependencies = (task: any) => {
    if (!task.bloqueadaPor || task.bloqueadaPor.length === 0) return false;
    
    const blockingTasks = tasks.filter(t => 
      task.bloqueadaPor.includes(t.id) && t.estado !== "completada"
    );
    return blockingTasks.length > 0;
  };

  // Handle task completion with dependency check
  const handleCompleteTask = (task: any) => {
    if (hasBlockingDependencies(task)) {
      setShowBlockedDialog(true);
    } else {
      const updatedTask = { ...task, estado: "completada" };
      // Add activity log
      const newActivity = {
        id: Date.now().toString(),
        type: "status_change",
        description: `Estado cambiado de '${task.estado}' a 'completada'`,
        author: profile?.full_name || "Usuario",
        timestamp: new Date().toISOString()
      };
      updatedTask.actividad = [...(task.actividad || []), newActivity];
      setSelectedTask(updatedTask);
      handleUpdateTask(updatedTask);
    }
  };

  // Add comment function
  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTask) return;
    
    const comment = {
      id: Date.now().toString(),
      author: profile?.full_name || "Usuario",
      content: newComment,
      timestamp: new Date().toISOString(),
      mentions: [] // TODO: Extract @mentions from content
    };
    
    const updatedTask = {
      ...selectedTask,
      comentarios: [...(selectedTask.comentarios || []), comment]
    };
    
    setSelectedTask(updatedTask);
    handleUpdateTask(updatedTask);
    setNewComment("");
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files || !selectedTask) return;
    
    const file = files[0];
    const newFile = {
      id: Date.now().toString(),
      nombre: file.name,
      origen: "Subido",
      fechaSubida: new Date().toISOString(),
      tipo: "subido",
      rutaArchivo: `/tareas/${file.name}`
    };
    
    const updatedTask = {
      ...selectedTask,
      archivos: [...(selectedTask.archivos || []), newFile]
    };
    
    setSelectedTask(updatedTask);
    handleUpdateTask(updatedTask);
    
    toast({ title: "Archivo subido", description: `${file.name} se ha adjuntado a la tarea` });
  };

  // Handle linking from event folder
  const handleLinkFromEventFolder = (folder: string) => {
    if (!selectedTask) return;
    
    // Simulate file selection from event folder
    const mockFile = {
      id: Date.now().toString(),
      nombre: `Documento-${folder}.pdf`,
      origen: folder,
      fechaSubida: new Date().toISOString(),
      tipo: "vinculado",
      rutaArchivo: `/eventos/current-event/${folder.toLowerCase()}/documento.pdf`
    };
    
    const updatedTask = {
      ...selectedTask,
      archivos: [...(selectedTask.archivos || []), mockFile]
    };
    
    setSelectedTask(updatedTask);
    handleUpdateTask(updatedTask);
    setShowEventFolderSelector(false);
    
    toast({ title: "Archivo vinculado", description: `Documento de ${folder} vinculado a la tarea` });
  };

  // Remove file attachment
  const handleRemoveFile = (fileId: string) => {
    if (!selectedTask) return;
    
    const updatedTask = {
      ...selectedTask,
      archivos: (selectedTask.archivos || []).filter(file => file.id !== fileId)
    };
    
    setSelectedTask(updatedTask);
    handleUpdateTask(updatedTask);
    
    toast({ title: "Archivo desvinculado", description: "El archivo se ha desvinculado de la tarea" });
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data: proj, error } = await supabase
          .from('projects')
          .select('id, name, description, objective, status, artist_id, start_date, end_date_estimada, workspace_id')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!proj) return;
        
        const p: Project = {
          id: proj.id,
          name: proj.name,
          description: proj.description,
          objective: proj.objective,
          status: proj.status,
          artist_id: proj.artist_id,
          start_date: proj.start_date,
          end_date_estimada: proj.end_date_estimada,
          workspace_id: proj.workspace_id,
          artist_name: null,
        };
        setProject(p);
        
        // Fetch artist data separately if artist_id exists
        if (proj.artist_id) {
          const { data: artistData } = await supabase
            .from('artists')
            .select('id, name, workspace_id')
            .eq('id', proj.artist_id)
            .maybeSingle();
          
          if (artistData) {
            setArtist(artistData);
            p.artist_name = artistData.name;
            setProject({ ...p });
          }
        }
        
        // Fetch workspace data separately if workspace_id exists
        if (proj.workspace_id) {
          const { data: workspaceData } = await supabase
            .from('workspaces')
            .select('id, name')
            .eq('id', proj.workspace_id)
            .maybeSingle();
          
          if (workspaceData) {
            setWorkspace(workspaceData);
          }
        }
        
        document.title = `${p.name} | Proyectos`;
      } catch (e) {
        console.error('Error project', e);
      }
    };

    const loadLinked = async () => {
      try {
        const [bRes, cRes, dRes, sRes, tRes] = await Promise.all([
          supabase.from('budgets').select('id, name, event_date, show_status, type, city, country, venue, budget_status, internal_notes, created_at, artist_id, event_time, fee, formato, profiles:artist_id(full_name)').eq('project_id', id).order('created_at', { ascending: false }),
          supabase.from('contracts').select('id, title, status, file_path').eq('project_id', id).order('created_at', { ascending: false }),
          supabase.from('documents').select('id, title, file_url, category').eq('project_id', id).order('created_at', { ascending: false }),
          supabase.from('solicitudes').select('id, nombre_solicitante, estado, fecha_creacion').eq('project_id', id).order('fecha_creacion', { ascending: false }),
          supabase.from('project_team').select('id, role, profile_id, contact_id, profiles:profile_id(full_name), contacts:contact_id(name)').eq('project_id', id),
        ]);
        if (bRes.error) throw bRes.error;
        if (cRes.error) throw cRes.error;
        if (dRes.error) throw dRes.error;
        if (sRes.error) throw sRes.error;
        if (tRes.error) throw tRes.error;
        setBudgets(bRes.data || []);
        setContracts(cRes.data || []);
        setDocuments(dRes.data || []);
        setSolicitudes(sRes.data || []);
        // Map team members from profiles or contacts
        const teamData = (tRes.data || []).map((t: any) => ({
          id: t.id,
          full_name: t.profiles?.full_name || t.contacts?.name || 'Sin nombre',
          role: t.role
        }));
        setTeam(teamData);
      } catch (e) {
        console.error('Error linked', e);
      }
    };

    load();
    loadLinked();
  }, [id]);

  // Team member management functions
  const handleUpdateTeamMemberRole = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_team')
        .update({ role: editingTeamMemberRole })
        .eq('id', memberId);
      
      if (error) throw error;
      
      setTeam(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: editingTeamMemberRole } : m
      ));
      setEditingTeamMemberId(null);
      toast({ title: 'Rol actualizado' });
    } catch (e) {
      console.error('Error updating role:', e);
      toast({ title: 'Error', description: 'No se pudo actualizar el rol', variant: 'destructive' });
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_team')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      setTeam(prev => prev.filter(m => m.id !== memberId));
      toast({ title: 'Miembro eliminado del equipo' });
    } catch (e) {
      console.error('Error removing member:', e);
      toast({ title: 'Error', description: 'No se pudo eliminar el miembro', variant: 'destructive' });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'en_curso':
        return 'warning';
      case 'finalizado':
        return 'success';
      case 'archivado':
        return 'muted';
      default:
        return 'muted';
    }
  };

  const getProjectStatusIcon = (status: string) => {
    switch (status) {
      case 'en_curso':
        return <Clock className="w-3 h-3" />;
      case 'finalizado':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'archivado':
        return <FolderOpen className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const handleUploadContract = async (file: File) => {
    if (!id) return;
    try {
      const path = `${id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('contracts').insert({
        project_id: id,
        title: file.name,
        status: 'borrador',
        file_bucket: 'contracts',
        file_path: path,
        created_by: profile?.user_id,
      });
      if (insErr) throw insErr;
      toast({ title: 'Contrato subido', description: 'El contrato se ha añadido al proyecto' });
      // refresh contracts list
      const { data, error } = await supabase.from('contracts').select('id, title, status, file_path').eq('project_id', id).order('created_at', { ascending: false });
      if (!error) setContracts(data || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo subir el contrato', variant: 'destructive' });
    }
  };

  // Document upload function
  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDocument.title || !newDocument.category || !newDocument.file) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos y selecciona un archivo.",
        variant: "destructive",
      });
      return;
    }

    setUploadingDocument(true);

    try {
      const fileExt = newDocument.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, newDocument.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          title: newDocument.title,
          category: newDocument.category,
          file_type: newDocument.file.type,
          file_size: newDocument.file.size,
          file_url: publicUrl,
          artist_id: project.artist_id,
          uploaded_by: profile?.id,
          project_id: id,
        });

      if (dbError) throw dbError;

      // Reset form and refresh documents
      setNewDocument({ title: '', category: '', file: null });
      setShowDocumentUpload(false);
      
      // Refresh documents list
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_url, category')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      
      if (!error) setDocuments(data || []);

      toast({
        title: "Documento subido",
        description: "El documento se ha subido correctamente.",
      });

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Error al subir el documento. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const refreshBudgets = async () => {
    try {
      const { data, error } = await supabase.from('budgets').select('id, name, event_date, show_status, type, city, country, venue, budget_status, internal_notes, created_at, artist_id, event_time, fee, profiles:artist_id(full_name)').eq('project_id', id).order('created_at', { ascending: false });
      if (!error) setBudgets(data || []);
    } catch (e) {
      console.error('Error refreshing budgets', e);
    }
  };

  if (!project) {
    return <div className="text-sm text-muted-foreground">Cargando proyecto…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <AuthzBreadcrumb 
        workspace={workspace || undefined}
        artist={artist || undefined}
        project={project ? { id: project.id, name: project.name } : undefined}
      />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent rounded-lg border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge variant={getStatusVariant(project.status)} className="gap-1">
                {getProjectStatusIcon(project.status)}
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {project.artist_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{project.artist_name}</span>
                </div>
              )}
              {project.start_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-sm">Inicio: {new Date(project.start_date).toLocaleDateString()}</span>
                </div>
              )}
              {project.end_date_estimada && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Fin estimado: {new Date(project.end_date_estimada).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Team avatars stacked */}
            {team.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {team.slice(0, 4).map((member, i) => (
                    <TooltipProvider key={member.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar
                            className="w-7 h-7 border-2 border-background cursor-default"
                            style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }}
                          >
                            <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                              {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{member.full_name}</p>
                          {member.role && <p className="text-xs text-muted-foreground">{member.role}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
                {team.length > 4 && (
                  <span className="text-xs text-muted-foreground ml-1">+{team.length - 4} más</span>
                )}
                <span className="text-xs text-muted-foreground">· {team.length} miembro{team.length !== 1 ? 's' : ''} en el equipo</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {renderIf(permissions.canEdit, (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <Link className="w-4 h-4 mr-2" />
                    Vincular entidad
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setOpenSolicitud(true)}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Crear solicitud vinculada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenBudget(true)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Crear presupuesto vinculado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

            {renderIf(permissions.canEdit, (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear nuevo
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setOpenBudget(true)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Presupuesto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenSolicitud(true)}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Solicitud
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Contrato (PDF)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
        </div>
      </div>
          
      {renderIf(permissions.canEdit, (
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadContract(f);
        }} />
      ))}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Details */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Detalles del Proyecto</CardTitle>
            <Target className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {project.objective && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Objetivo</div>
                <p className="text-sm leading-relaxed">{project.objective}</p>
              </div>
            )}
            {project.description && project.description !== project.objective && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Descripción</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Equipo involucrado</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Aún no hay miembros asignados</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setOpenAddMember(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir miembro
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {team.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 group">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {member.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name}</p>
                      {editingTeamMemberId === member.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={editingTeamMemberRole}
                            onChange={(e) => setEditingTeamMemberRole(e.target.value)}
                            className="h-6 text-xs py-0 px-2"
                            placeholder="Rol en este proyecto..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateTeamMemberRole(member.id);
                              if (e.key === 'Escape') setEditingTeamMemberId(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdateTeamMemberRole(member.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingTeamMemberId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p 
                          className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => {
                            setEditingTeamMemberId(member.id);
                            setEditingTeamMemberRole(member.role || '');
                          }}
                        >
                          {member.role || 'Sin rol asignado (clic para editar)'}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingTeamMemberId(member.id);
                          setEditingTeamMemberRole(member.role || '');
                        }}>
                          Editar rol
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleRemoveTeamMember(member.id)}
                        >
                          Quitar del equipo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setOpenAddMember(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir miembro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklist Section */}
      <ProjectChecklistManager 
        projectId={id || ""} 
        canEdit={permissions.canEdit || profile?.active_role === 'management' || profile?.active_role === 'artist' || true}
      />

      {/* Content Tabs */}
      <Card>
        <Tabs defaultValue="vista-general" className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <TabsList className="grid grid-cols-9 flex-1">
                <TabsTrigger value="vista-general" className="text-xs sm:text-sm">
                  Vista General
                </TabsTrigger>
                <TabsTrigger value="proyectos" className="text-xs sm:text-sm">
                  Archivos
                </TabsTrigger>
                <TabsTrigger value="cronograma" className="text-xs sm:text-sm">
                  Cronograma
                </TabsTrigger>
                <TabsTrigger value="presupuestos" className="text-xs sm:text-sm">
                  Presupuestos
                  {budgets.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                      {budgets.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs sm:text-sm">
                  Documentos
                  {documents.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                      {documents.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="contratos" className="text-xs sm:text-sm">
                  Contratos
                  {contracts.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                      {contracts.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="solicitudes" className="text-xs sm:text-sm">
                  Solicitudes
                  {solicitudes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                      {solicitudes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="aprobaciones" className="text-xs sm:text-sm">
                  Aprobaciones
                </TabsTrigger>
                <TabsTrigger value="notas" className="text-xs sm:text-sm">Notas</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)} className="ml-4">
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* ── VISTA GENERAL ─────────────────────────────────────────── */}
            <TabsContent value="vista-general" className="mt-0 space-y-6">
              {/* Misión + Por qué */}
              {(project.objective || project.description) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.objective && (
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-green-700 dark:text-green-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Misión del proyecto</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{project.objective}</p>
                    </div>
                  )}
                  {project.description && project.description !== project.objective && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Por qué existe</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{project.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const allChecklistItems = tasks;
                  const completedItems = allChecklistItems.filter(t => t.estado === 'completada').length;
                  const totalItems = allChecklistItems.length;
                  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                  return (
                    <div className="rounded-lg border bg-card p-4 space-y-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
                      <div className="text-2xl font-bold text-primary">{pct}%</div>
                      <div className="text-sm font-semibold text-foreground">Checklist</div>
                      <div className="text-xs text-muted-foreground">{completedItems}/{totalItems} tareas completadas</div>
                    </div>
                  );
                })()}
                <div className="rounded-lg border bg-card p-4 space-y-1 hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{budgets.length}</div>
                  <div className="text-sm font-semibold text-foreground">Presupuestos</div>
                  <div className="text-xs text-muted-foreground">vinculados al proyecto</div>
                </div>
                <div className="rounded-lg border bg-card p-4 space-y-1 hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{solicitudes.length}</div>
                  <div className="text-sm font-semibold text-foreground">Solicitudes</div>
                  <div className="text-xs text-muted-foreground">vinculadas al proyecto</div>
                </div>
                <div className="rounded-lg border bg-card p-4 space-y-1 hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{contracts.length}</div>
                  <div className="text-sm font-semibold text-foreground">Contratos</div>
                  <div className="text-xs text-muted-foreground">vinculados al proyecto</div>
                </div>
              </div>

              {/* Entidades vinculadas */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Entidades vinculadas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shows / Presupuestos */}
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-green-600" />
                        Shows (Booking)
                      </span>
                      <Badge variant="secondary" className="text-xs">{budgets.length}</Badge>
                    </div>
                    {budgets.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No hay presupuestos vinculados</p>
                    ) : (
                      <div className="space-y-2">
                        {budgets.slice(0, 4).map((b) => (
                          <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <div>
                              <p className="text-xs font-medium text-foreground">{b.name}</p>
                              {b.event_date && <p className="text-xs text-muted-foreground">{new Date(b.event_date).toLocaleDateString('es-ES')}</p>}
                            </div>
                            {b.show_status && <Badge variant="outline" className="text-xs h-5">{b.show_status}</Badge>}
                          </div>
                        ))}
                        {budgets.length > 4 && (
                          <p className="text-xs text-muted-foreground pt-1">+{budgets.length - 4} más → ver en Presupuestos</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Solicitudes */}
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-600" />
                        Solicitudes
                      </span>
                      <Badge variant="secondary" className="text-xs">{solicitudes.length}</Badge>
                    </div>
                    {solicitudes.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No hay solicitudes vinculadas</p>
                    ) : (
                      <div className="space-y-2">
                        {solicitudes.slice(0, 4).map((s) => (
                          <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <div>
                              <p className="text-xs font-medium text-foreground">{s.nombre_solicitante || 'Solicitud'}</p>
                              {s.fecha_creacion && <p className="text-xs text-muted-foreground">{new Date(s.fecha_creacion).toLocaleDateString('es-ES')}</p>}
                            </div>
                            <Badge variant="outline" className="text-xs h-5">{s.estado}</Badge>
                          </div>
                        ))}
                        {solicitudes.length > 4 && (
                          <p className="text-xs text-muted-foreground pt-1">+{solicitudes.length - 4} más → ver en Solicitudes</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Documentos */}
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-amber-600" />
                        Documentos
                      </span>
                      <Badge variant="secondary" className="text-xs">{documents.length}</Badge>
                    </div>
                    {documents.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No hay documentos adjuntos</p>
                    ) : (
                      <div className="space-y-2">
                        {documents.slice(0, 4).map((d) => (
                          <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
                            <Badge variant="outline" className="text-xs h-5 ml-2">{d.category}</Badge>
                          </div>
                        ))}
                        {documents.length > 4 && (
                          <p className="text-xs text-muted-foreground pt-1">+{documents.length - 4} más → ver en Documentos</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contratos */}
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-violet-600" />
                        Contratos
                      </span>
                      <Badge variant="secondary" className="text-xs">{contracts.length}</Badge>
                    </div>
                    {contracts.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No hay contratos vinculados</p>
                    ) : (
                      <div className="space-y-2">
                        {contracts.slice(0, 4).map((c) => (
                          <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <p className="text-xs font-medium text-foreground truncate">{c.title || c.file_name}</p>
                            <Badge variant="outline" className="text-xs h-5 ml-2 capitalize">{c.status}</Badge>
                          </div>
                        ))}
                        {contracts.length > 4 && (
                          <p className="text-xs text-muted-foreground pt-1">+{contracts.length - 4} más → ver en Contratos</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── CRONOGRAMA GANTT ──────────────────────────────────────── */}
            <TabsContent value="cronograma" className="mt-0">
              {(() => {
                // Build timeline from project dates
                const startDate = project.start_date ? new Date(project.start_date) : null;
                const endDate = project.end_date_estimada ? new Date(project.end_date_estimada) : null;

                if (!startDate || !endDate) {
                  return (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium mb-2">Sin rango de fechas</h3>
                      <p className="text-sm text-muted-foreground">Define la fecha de inicio y fin del proyecto para ver el cronograma.</p>
                    </div>
                  );
                }

                // Generate months between start and end
                const months: { label: string; year: number; month: number }[] = [];
                const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                while (cur <= endMonth) {
                  months.push({
                    label: cur.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
                    year: cur.getFullYear(),
                    month: cur.getMonth(),
                  });
                  cur.setMonth(cur.getMonth() + 1);
                }

                const totalMonths = months.length || 1;

                // Helper: get column position for a date (0-indexed month offset from start)
                const getCol = (dateStr: string | null) => {
                  if (!dateStr) return null;
                  const d = new Date(dateStr);
                  return (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
                };

                // Build gantt items from budgets and solicitudes
                const ganttItems: { id: string; label: string; type: 'budget' | 'solicitud'; startCol: number; span: number; status: string }[] = [];

                budgets.forEach((b) => {
                  const col = getCol(b.event_date);
                  if (col !== null && col >= 0 && col < totalMonths) {
                    ganttItems.push({ id: b.id, label: b.name, type: 'budget', startCol: col, span: 1, status: b.show_status || '' });
                  }
                });

                solicitudes.forEach((s) => {
                  const col = getCol(s.fecha_creacion || s.created_at);
                  if (col !== null && col >= 0 && col < totalMonths) {
                    ganttItems.push({ id: s.id, label: s.nombre_solicitante || 'Solicitud', type: 'solicitud', startCol: col, span: 1, status: s.estado || '' });
                  }
                });

                const typeColors = {
                  budget: 'bg-green-500',
                  solicitud: 'bg-blue-500',
                };
                const typeLabelMap = { budget: '🎤 Show/Presupuesto', solicitud: '📬 Solicitud' };

                return (
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex gap-4 flex-wrap">
                      {Object.entries({ budget: '#22c55e', solicitud: '#3b82f6' }).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                          {typeLabelMap[type as keyof typeof typeLabelMap]}
                        </div>
                      ))}
                    </div>

                    {/* Gantt grid */}
                    <div className="overflow-x-auto border rounded-lg">
                      {/* Header */}
                      <div
                        className="grid bg-muted/50 border-b"
                        style={{ gridTemplateColumns: `200px repeat(${totalMonths}, minmax(64px, 1fr))` }}
                      >
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Entidad</div>
                        {months.map((m, i) => (
                          <div key={i} className="px-1 py-2 text-xs font-medium text-muted-foreground text-center border-l border-border/40">
                            {m.label}
                          </div>
                        ))}
                      </div>

                      {/* Rows */}
                      {ganttItems.length === 0 ? (
                        <div className="text-center py-10 text-sm text-muted-foreground">
                          No hay presupuestos ni solicitudes con fechas dentro del rango del proyecto.
                        </div>
                      ) : (
                        ganttItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className="grid border-b border-border/30 hover:bg-muted/20 transition-colors"
                            style={{ gridTemplateColumns: `200px repeat(${totalMonths}, minmax(64px, 1fr))` }}
                          >
                            <div className="px-3 py-2 flex flex-col justify-center border-r border-border/30">
                              <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{typeLabelMap[item.type]}</p>
                            </div>
                            {Array.from({ length: totalMonths }).map((_, col) => {
                              const isStart = col === item.startCol;
                              const inRange = col >= item.startCol && col < item.startCol + item.span;
                              const isEnd = col === item.startCol + item.span - 1;
                              return (
                                <div key={col} className="relative h-10 border-l border-border/20 flex items-center px-0.5">
                                  {inRange && (
                                    <div
                                      className={`h-5 w-full ${typeColors[item.type]} opacity-80`}
                                      style={{
                                        borderRadius: isStart && isEnd ? 6 : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : 0,
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                      💡 El cronograma muestra los presupuestos (shows) y solicitudes vinculados al proyecto ordenados en el tiempo. Actualiza las fechas en sus módulos originales y aquí se reflejarán automáticamente.
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="proyectos" className="mt-0">
              <ProjectFilesManager projectId={id || ""} projectName={project.name} />
            </TabsContent>

            <TabsContent value="presupuestos" className="mt-0">
              {budgets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No hay presupuestos</h3>
                  <p className="text-sm text-muted-foreground mb-4">Crea el primer presupuesto para este proyecto</p>
                  <Button onClick={() => setOpenBudget(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear presupuesto
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {budgets.map((budget) => (
                    <Card key={budget.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{budget.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {budget.event_date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(budget.event_date).toLocaleDateString()}
                              </span>
                            )}
                            {budget.show_status && (
                              <Badge variant="outline" className="h-5 text-xs">
                                {budget.show_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedBudget(budget)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documentos" className="mt-0">
              <div className="space-y-4">
                {/* Folder Navigation */}
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant={currentDocumentFolder === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentDocumentFolder(null)}
                    className="flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Todos
                  </Button>
                  {['Contratos', 'Riders', 'Financiero', 'Prensa', 'Legal', 'Otros'].map((folder) => (
                    <Button
                      key={folder}
                      variant={currentDocumentFolder === folder ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentDocumentFolder(folder)}
                      className="flex items-center gap-2"
                    >
                      <Folder className="w-4 h-4" />
                      {folder}
                      {documentFolders[folder]?.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 text-xs">
                          {documentFolders[folder].length}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Current folder breadcrumb */}
                {currentDocumentFolder && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Home className="w-4 h-4" />
                    <ChevronRight className="w-4 h-4" />
                    <Folder className="w-4 h-4" />
                    <span className="font-medium">{currentDocumentFolder}</span>
                  </div>
                )}

                {/* Documents List */}
                {(() => {
                  const filteredDocs = currentDocumentFolder 
                    ? documents.filter(doc => {
                        const categoryMapping = {
                          'Contratos': ['contract'],
                          'Riders': ['rider'],
                          'Financiero': ['financial'],
                          'Prensa': ['press'],
                          'Legal': ['legal'],
                          'Otros': ['other', 'setlist']
                        };
                        return categoryMapping[currentDocumentFolder]?.includes(doc.category) || false;
                      })
                    : documents;

                  if (filteredDocs.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Paperclip className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium mb-2">
                          {currentDocumentFolder ? `No hay documentos en ${currentDocumentFolder}` : 'No hay documentos'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {currentDocumentFolder 
                            ? `Sube documentos a la carpeta ${currentDocumentFolder}` 
                            : 'Sube documentos relacionados con este proyecto'
                          }
                        </p>
                        <Button variant="outline" onClick={() => setShowDocumentUpload(true)}>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir documento
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        {filteredDocs.map((doc) => (
                          <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-md">
                                  <Paperclip className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{doc.title}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="h-5 text-xs">
                                      {doc.category}
                                    </Badge>
                                    {!currentDocumentFolder && (
                                      <Badge variant="secondary" className="h-5 text-xs">
                                        {(() => {
                                          const folderMapping = {
                                            'contract': 'Contratos',
                                            'rider': 'Riders',
                                            'financial': 'Financiero',
                                            'press': 'Prensa',
                                            'legal': 'Legal',
                                            'other': 'Otros',
                                            'setlist': 'Otros'
                                          };
                                          return folderMapping[doc.category] || 'Otros';
                                        })()}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver
                                </a>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                      <div className="flex justify-center pt-4">
                        <Button variant="outline" onClick={() => setShowDocumentUpload(true)}>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir documento
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            <TabsContent value="contratos" className="mt-0">
              {contracts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No hay contratos</h3>
                  <p className="text-sm text-muted-foreground mb-4">Genera o sube contratos para este proyecto</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir contrato
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {contracts.map((contract) => (
                    <Card key={contract.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-md">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">{contract.title}</h4>
                            <Badge variant="outline" className="h-5 text-xs mt-1 capitalize">
                              {contract.status}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="solicitudes" className="mt-0">
              {solicitudes.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No hay solicitudes</h3>
                  <p className="text-sm text-muted-foreground mb-4">Crea solicitudes asociadas a este proyecto</p>
                  <Button onClick={() => setOpenSolicitud(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear solicitud
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {solicitudes.map((solicitud) => (
                    <Card key={solicitud.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{solicitud.nombre_solicitante}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <Badge variant="outline" className="h-5 text-xs">
                              {solicitud.estado}
                            </Badge>
                            {solicitud.fecha_creacion && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(solicitud.fecha_creacion).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Abrir
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="aprobaciones" className="mt-0">
              <ApprovalsModule 
                projectId={id!}
                workspace={workspace ? { id: workspace.id, name: workspace.name } : undefined}
                artist={artist ? { id: artist.id, name: artist.name } : undefined}
                project={project ? { id: project.id, name: project.name } : undefined}
              />
            </TabsContent>

            <TabsContent value="notas" className="mt-0">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Notas colaborativas</h3>
                <p className="text-sm text-muted-foreground">
                  Próximamente podrás añadir notas colaborativas para este proyecto.
                  <br />
                  Mientras tanto, usa "Documentos" para adjuntar ficheros.
                </p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <CreateBudgetDialog open={openBudget} onOpenChange={setOpenBudget} onSuccess={refreshBudgets} projectId={project.id} />
      <CreateSolicitudDialog open={openSolicitud} onOpenChange={setOpenSolicitud} onSolicitudCreated={() => {}} projectId={project.id} />
      
      <AddTeamMemberDialog 
        open={openAddMember} 
        onOpenChange={setOpenAddMember} 
        projectId={project.id} 
        onMemberAdded={() => {
          window.location.reload();
        }}
      />
      
      {selectedMember && (
        <TeamMemberProfileDialog
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          memberId={selectedMember.id}
          memberType={selectedMember.type}
          projectId={project.id}
          onMemberRemoved={() => {
            window.location.reload();
          }}
        />
      )}
      
      {selectedBudget && (
        <BudgetDetailsDialog 
          open={!!selectedBudget} 
          onOpenChange={(open) => !open && setSelectedBudget(null)} 
          budget={selectedBudget} 
          onUpdate={refreshBudgets} 
          onDelete={() => {
            setSelectedBudget(null);
            refreshBudgets();
          }} 
        />
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={openAddTask}
        onOpenChange={setOpenAddTask}
        etapa={currentStage}
        onCreateTask={handleCreateTask}
        teamMembers={team}
      />

      {/* Task Detail Panel */}
      {selectedTask && (
        <Sheet open={taskPanelOpen} onOpenChange={setTaskPanelOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Detalles de la tarea</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 py-6">
              {/* Título editable */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input 
                  value={selectedTask.nombre}
                  onChange={(e) => {
                    const updatedTask = { ...selectedTask, nombre: e.target.value };
                    setSelectedTask(updatedTask);
                    handleUpdateTask(updatedTask);
                  }}
                  className="font-medium"
                />
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select 
                  value={selectedTask.estado} 
                  onValueChange={(value) => {
                    const updatedTask = { ...selectedTask, estado: value };
                    setSelectedTask(updatedTask);
                    handleUpdateTask(updatedTask);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="bloqueada">Bloqueada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridad</label>
                <Select 
                  value={selectedTask.prioridad} 
                  onValueChange={(value) => {
                    const updatedTask = { ...selectedTask, prioridad: value };
                    setSelectedTask(updatedTask);
                    handleUpdateTask(updatedTask);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select 
                  value={selectedTask.categoria} 
                  onValueChange={(value) => {
                    const updatedTask = { ...selectedTask, categoria: value };
                    setSelectedTask(updatedTask);
                    handleUpdateTask(updatedTask);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Promoción">Promoción</SelectItem>
                    <SelectItem value="Finanzas">Finanzas</SelectItem>
                    <SelectItem value="Ventas">Ventas</SelectItem>
                    <SelectItem value="Stock">Stock</SelectItem>
                    <SelectItem value="Merch">Merch</SelectItem>
                    <SelectItem value="Logística">Logística</SelectItem>
                    <SelectItem value="Técnica">Técnica</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Producción">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Responsables */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsables</label>
                <div className="border rounded-md p-2 min-h-[40px]">
                  <div className="flex flex-wrap gap-1">
                    {selectedTask.responsables.map((responsable, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {responsable}
                        <button
                          onClick={() => {
                            const newResponsables = selectedTask.responsables.filter((_, i) => i !== index);
                            const updatedTask = { ...selectedTask, responsables: newResponsables };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          ×
                        </button>
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
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedTask.vencimiento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedTask.vencimiento ? format(new Date(selectedTask.vencimiento), "PPP") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedTask.vencimiento ? new Date(selectedTask.vencimiento) : undefined}
                      onSelect={(date) => {
                        const updatedTask = { 
                          ...selectedTask, 
                          vencimiento: date ? date.toISOString() : null 
                        };
                        setSelectedTask(updatedTask);
                        handleUpdateTask(updatedTask);
                      }}
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
                  value={selectedTask.comentarios || ""}
                  onChange={(e) => {
                    const updatedTask = { ...selectedTask, comentarios: e.target.value };
                    setSelectedTask(updatedTask);
                    handleUpdateTask(updatedTask);
                  }}
                  placeholder="Añadir comentarios o notas..."
                  rows={4}
                />
              </div>

              {/* Ejecución Section */}
              <Collapsible 
                open={!collapsedSections.ejecucion} 
                onOpenChange={() => toggleSection('ejecucion')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full pt-4 border-t">
                  <h3 className="text-sm font-medium">Ejecución</h3>
                  {collapsedSections.ejecucion ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                
                {/* Definition of Done */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Definition of Done</label>
                  <div className="space-y-2">
                    {(selectedTask.definitionOfDone || []).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => {
                            const newDod = [...(selectedTask.definitionOfDone || [])];
                            newDod[index] = { ...item, completed: e.target.checked };
                            const updatedTask = { ...selectedTask, definitionOfDone: newDod };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                          className="rounded border-gray-300"
                        />
                        <Input
                          value={item.text}
                          onChange={(e) => {
                            const newDod = [...(selectedTask.definitionOfDone || [])];
                            newDod[index] = { ...item, text: e.target.value };
                            const updatedTask = { ...selectedTask, definitionOfDone: newDod };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                          className="flex-1 text-sm"
                          placeholder="Criterio de aceptación..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newDod = (selectedTask.definitionOfDone || []).filter((_, i) => i !== index);
                            const updatedTask = { ...selectedTask, definitionOfDone: newDod };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItem = { id: Date.now().toString(), text: "", completed: false };
                        const newDod = [...(selectedTask.definitionOfDone || []), newItem];
                        const updatedTask = { ...selectedTask, definitionOfDone: newDod };
                        setSelectedTask(updatedTask);
                        handleUpdateTask(updatedTask);
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir criterio
                    </Button>
                  </div>
                </div>

                {/* Pasos */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pasos</label>
                  <div className="space-y-2">
                    {(selectedTask.pasos || []).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => {
                            const newPasos = [...(selectedTask.pasos || [])];
                            newPasos[index] = { ...item, completed: e.target.checked };
                            const updatedTask = { ...selectedTask, pasos: newPasos };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                          className="rounded border-gray-300"
                        />
                        <Input
                          value={item.text}
                          onChange={(e) => {
                            const newPasos = [...(selectedTask.pasos || [])];
                            newPasos[index] = { ...item, text: e.target.value };
                            const updatedTask = { ...selectedTask, pasos: newPasos };
                            setSelectedTask(updatedTask);
                            autosaveTask(updatedTask);
                          }}
                          onBlur={(e) => {
                            const newPasos = [...(selectedTask.pasos || [])];
                            newPasos[index] = { ...item, text: e.target.value };
                            const updatedTask = { ...selectedTask, pasos: newPasos };
                            handleUpdateTask(updatedTask);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const newItem = { id: Date.now().toString(), text: "", completed: false };
                              const newPasos = [...(selectedTask.pasos || []), newItem];
                              const updatedTask = { ...selectedTask, pasos: newPasos };
                              setSelectedTask(updatedTask);
                              handleUpdateTask(updatedTask);
                              // Focus the new input after a brief delay
                              setTimeout(() => {
                                const inputs = document.querySelectorAll('input[placeholder="Paso a seguir..."]');
                                const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                                lastInput?.focus();
                              }, 50);
                            }
                          }}
                          className="flex-1 text-sm"
                          placeholder="Paso a seguir..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newPasos = (selectedTask.pasos || []).filter((_, i) => i !== index);
                            const updatedTask = { ...selectedTask, pasos: newPasos };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItem = { id: Date.now().toString(), text: "", completed: false };
                        const newPasos = [...(selectedTask.pasos || []), newItem];
                        const updatedTask = { ...selectedTask, pasos: newPasos };
                        setSelectedTask(updatedTask);
                        handleUpdateTask(updatedTask);
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir paso
                    </Button>
                  </div>
                </div>

                {/* Recursos necesarios */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recursos necesarios</label>
                  <div className="space-y-2">
                    {(selectedTask.recursos || []).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const newRecursos = [...(selectedTask.recursos || [])];
                            newRecursos[index] = { ...item, name: e.target.value };
                            const updatedTask = { ...selectedTask, recursos: newRecursos };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                          className="flex-1 text-sm"
                          placeholder="Nombre del recurso..."
                        />
                        <Input
                          value={item.url}
                          onChange={(e) => {
                            const newRecursos = [...(selectedTask.recursos || [])];
                            newRecursos[index] = { ...item, url: e.target.value };
                            const updatedTask = { ...selectedTask, recursos: newRecursos };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                          className="flex-1 text-sm"
                          placeholder="URL..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newRecursos = (selectedTask.recursos || []).filter((_, i) => i !== index);
                            const updatedTask = { ...selectedTask, recursos: newRecursos };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItem = { id: Date.now().toString(), name: "", url: "" };
                        const newRecursos = [...(selectedTask.recursos || []), newItem];
                        const updatedTask = { ...selectedTask, recursos: newRecursos };
                        setSelectedTask(updatedTask);
                        handleUpdateTask(updatedTask);
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir recurso
                    </Button>
                  </div>
                </div>

                {/* Dependencias */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">Dependencias</label>
                  
                  {/* Bloqueada por */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Bloqueada por:</label>
                    <Select 
                      value="" 
                      onValueChange={(value) => {
                        if (value && !selectedTask.bloqueadaPor?.includes(value)) {
                          const newBlocked = [...(selectedTask.bloqueadaPor || []), value];
                          const updatedTask = { ...selectedTask, bloqueadaPor: newBlocked };
                          setSelectedTask(updatedTask);
                          handleUpdateTask(updatedTask);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarea..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.filter(t => t.id !== selectedTask.id).map(task => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.nombre} ({task.etapa})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-1">
                      {(selectedTask.bloqueadaPor || []).map(taskId => {
                        const blockingTask = tasks.find(t => t.id === taskId);
                        return blockingTask ? (
                          <Badge 
                            key={taskId} 
                            variant={blockingTask.estado === "completada" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {blockingTask.nombre}
                            <button
                              onClick={() => {
                                const newBlocked = (selectedTask.bloqueadaPor || []).filter(id => id !== taskId);
                                const updatedTask = { ...selectedTask, bloqueadaPor: newBlocked };
                                setSelectedTask(updatedTask);
                                handleUpdateTask(updatedTask);
                              }}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Bloquea a */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Bloquea a:</label>
                    <Select 
                      value="" 
                      onValueChange={(value) => {
                        if (value && !selectedTask.bloqueaA?.includes(value)) {
                          const newBlocks = [...(selectedTask.bloqueaA || []), value];
                          const updatedTask = { ...selectedTask, bloqueaA: newBlocks };
                          setSelectedTask(updatedTask);
                          handleUpdateTask(updatedTask);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarea..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.filter(t => t.id !== selectedTask.id).map(task => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.nombre} ({task.etapa})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-1">
                      {(selectedTask.bloqueaA || []).map(taskId => {
                        const blockedTask = tasks.find(t => t.id === taskId);
                        return blockedTask ? (
                          <Badge key={taskId} variant="secondary" className="text-xs">
                            {blockedTask.nombre}
                            <button
                              onClick={() => {
                                const newBlocks = (selectedTask.bloqueaA || []).filter(id => id !== taskId);
                                const updatedTask = { ...selectedTask, bloqueaA: newBlocks };
                                setSelectedTask(updatedTask);
                                handleUpdateTask(updatedTask);
                              }}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
              </Collapsible>

              {/* Contexto Section */}
              <Collapsible 
                open={!collapsedSections.contexto} 
                onOpenChange={() => toggleSection('contexto')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full pt-4 border-t">
                  <h3 className="text-sm font-medium">Contexto</h3>
                  {collapsedSections.contexto ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                
                {/* Brief / Información adicional */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brief / Información adicional</label>
                  <Textarea
                    value={selectedTask.brief || ""}
                    onChange={(e) => {
                      const updatedTask = { ...selectedTask, brief: e.target.value };
                      setSelectedTask(updatedTask);
                      autosaveTask(updatedTask);
                    }}
                    onBlur={(e) => {
                      const updatedTask = { ...selectedTask, brief: e.target.value };
                      handleUpdateTask(updatedTask);
                    }}
                    placeholder="Información adicional sobre la tarea..."
                    rows={3}
                  />
                </div>

                {/* Riesgos & mitigaciones */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Riesgos & mitigaciones</label>
                  <div className="space-y-2">
                    {(selectedTask.riesgos || []).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <Input
                          value={item.text}
                          onChange={(e) => {
                            const newRiesgos = [...(selectedTask.riesgos || [])];
                            newRiesgos[index] = { ...item, text: e.target.value };
                            const updatedTask = { ...selectedTask, riesgos: newRiesgos };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                          className="flex-1 text-sm"
                          placeholder="Describir riesgo y mitigación..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newRiesgos = (selectedTask.riesgos || []).filter((_, i) => i !== index);
                            const updatedTask = { ...selectedTask, riesgos: newRiesgos };
                            setSelectedTask(updatedTask);
                            handleUpdateTask(updatedTask);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItem = { id: Date.now().toString(), text: "" };
                        const newRiesgos = [...(selectedTask.riesgos || []), newItem];
                        const updatedTask = { ...selectedTask, riesgos: newRiesgos };
                        setSelectedTask(updatedTask);
                        handleUpdateTask(updatedTask);
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir riesgo
                    </Button>
                  </div>
                </div>

                {/* Comentarios */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentarios
                  </label>
                  
                  {/* Comments thread */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {(selectedTask.comentarios || []).map((comment) => (
                      <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                        {comment.mentions && comment.mentions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {comment.mentions.map((mention, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                @{mention}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Add comment */}
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe un comentario... (usa @nombre para mencionar)"
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Actividad */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Actividad
                  </label>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(selectedTask.actividad || []).reverse().map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 py-2 border-l-2 border-muted pl-3">
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {activity.author}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedTask.actividad || selectedTask.actividad.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay actividad registrada
                      </p>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
              </Collapsible>

              {/* Archivos Section */}
              <Collapsible 
                open={!collapsedSections.archivos} 
                onOpenChange={() => toggleSection('archivos')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full pt-4 border-t">
                  <h3 className="text-sm font-medium">Archivos</h3>
                  {collapsedSections.archivos ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                
                {/* Upload and Link buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Subir archivo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEventFolderSelector(true)}
                    className="flex-1"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Vincular desde carpeta
                  </Button>
                </div>

                {/* File input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />

                {/* Event Folder Selector */}
                {showEventFolderSelector && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Seleccionar carpeta del evento</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEventFolderSelector(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {["Assets", "Facturas", "Contrato", "Sendings"].map((folder) => (
                        <Button
                          key={folder}
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkFromEventFolder(folder)}
                          className="justify-start"
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          {folder}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached files list */}
                <div className="space-y-2">
                  {(selectedTask.archivos || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay archivos adjuntos
                    </p>
                  ) : (
                    (selectedTask.archivos || []).map((archivo) => (
                      <div key={archivo.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                        <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{archivo.nombre}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{archivo.origen}</span>
                            <span>•</span>
                            <span>{new Date(archivo.fechaSubida).toLocaleDateString()}</span>
                            {archivo.tipo === "vinculado" && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600">Vinculado</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              toast({ title: "Abrir archivo", description: "Funcionalidad en desarrollo" });
                            }}
                            title="Ver/Descargar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          {archivo.tipo === "vinculado" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toast({ title: "Ver en carpeta", description: "Abriendo ubicación del archivo..." });
                              }}
                              title="Ver en carpeta"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(archivo.id)}
                            title="Quitar vínculo"
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
              </Collapsible>

              {/* Botones de acción */}
              <div className="space-y-3 pt-4 border-t">
                <Button 
                  className="w-full" 
                  onClick={() => handleCompleteTask(selectedTask)}
                  disabled={selectedTask.estado === "completada"}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Marcar completada
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const updatedTask = { ...selectedTask, estado: "bloqueada" };
                    setSelectedTask(updatedTask);
                    handleUpdateTask(updatedTask);
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Bloquear tarea
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    handleDuplicateTask(selectedTask);
                    toast({ title: "Tarea duplicada", description: "Se ha creado una copia de la tarea" });
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </Button>

                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => {
                    if (confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
                      handleDeleteTask(selectedTask.id);
                      toast({ title: "Tarea eliminada", description: "La tarea ha sido eliminada correctamente" });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Blocked Dependencies Dialog */}
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Tarea con dependencias pendientes
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta tarea está bloqueada por las siguientes tareas que aún no están completadas:
              <ul className="mt-2 list-disc list-inside">
                {selectedTask?.bloqueadaPor?.map(taskId => {
                  const blockingTask = tasks.find(t => t.id === taskId && t.estado !== "completada");
                  return blockingTask ? (
                    <li key={taskId} className="text-sm">
                      <strong>{blockingTask.nombre}</strong> ({blockingTask.estado})
                    </li>
                  ) : null;
                })}
              </ul>
              <p className="mt-2">¿Estás seguro de que quieres marcarla como completada de todas formas?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => {
                  const updatedTask = { ...selectedTask, estado: "completada" };
                  // Add activity log
                  const newActivity = {
                    id: Date.now().toString(),
                    type: "status_change",
                    description: `Estado cambiado de '${selectedTask.estado}' a 'completada'`,
                    author: profile?.full_name || "Usuario",
                    timestamp: new Date().toISOString()
                  };
                  updatedTask.actividad = [...(selectedTask.actividad || []), newActivity];
                  setSelectedTask(updatedTask);
                  handleUpdateTask(updatedTask);
                  setShowBlockedDialog(false);
                }}
            >
              Completar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Upload Dialog */}
      <Dialog open={showDocumentUpload} onOpenChange={setShowDocumentUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Añade un documento relacionado con este proyecto.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDocumentUpload} className="space-y-4">
            <div>
              <Label htmlFor="title">Título del documento</Label>
              <Input
                id="title"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                placeholder="Ej: Contrato, Rider técnico, etc."
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select value={newDocument.category} onValueChange={(value) => setNewDocument({ ...newDocument, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contratos</SelectItem>
                  <SelectItem value="rider">Riders Técnicos</SelectItem>
                  <SelectItem value="setlist">Setlists</SelectItem>
                  <SelectItem value="press">Material de Prensa</SelectItem>
                  <SelectItem value="legal">Documentos Legales</SelectItem>
                  <SelectItem value="financial">Documentos Financieros</SelectItem>
                  <SelectItem value="other">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="file">Archivo</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.mp4,.mov"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos soportados: PDF, DOC, DOCX, TXT, JPG, PNG, MP3, WAV, MP4, MOV
              </p>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDocumentUpload(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingDocument}>
                {uploadingDocument ? 'Subiendo...' : 'Subir Documento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Project Dialog */}
      <ProjectShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        projectId={id || ""}
        projectName={project.name}
      />
    </div>
  );
}