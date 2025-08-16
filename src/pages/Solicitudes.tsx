import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Clock, CheckCircle, XCircle, Calendar, MessageSquare, Phone, Video, Mic, Music, HelpCircle, Info, FileText, Archive, ArchiveRestore } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { CreateSolicitudDialog } from '@/components/CreateSolicitudDialog';
import { CreateSolicitudFromTemplateDialog } from '@/components/CreateSolicitudFromTemplateDialog';
import { EditSolicitudDialog } from '@/components/EditSolicitudDialog';
import { SolicitudDetailsDialog } from '@/components/SolicitudDetailsDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatusCommentDialog } from '@/components/StatusCommentDialog';
import { ScheduleEncounterDialog } from '@/components/ScheduleEncounterDialog';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import AssociateProjectDialog from '@/components/AssociateProjectDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  observaciones?: string;
  notas_internas?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  archived?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  created_by: string;
  artist_id?: string;
  fecha_limite_respuesta?: string;
  
  // Comentario y metadatos de decisión
  comentario_estado?: string | null;
  decision_por?: string | null;
  decision_fecha?: string | null;
  
  // Campos específicos para entrevistas
  medio?: string;
  nombre_entrevistador?: string;
  nombre_programa?: string;
  hora_entrevista?: string;
  informacion_programa?: string;
  
  // Campos específicos para bookings
  hora_show?: string;
  nombre_festival?: string;
  lugar_concierto?: string;
  ciudad?: string;
  
  // Campo libre para tipo "otro"
  descripcion_libre?: string;
  
  profiles?: {
    full_name: string;
  } | null;

  // Proyecto asociado
  project_id?: string | null;
  project?: {
    id: string;
    name: string;
  } | null;

  // Indicador de nuevos comentarios de decisión
  decision_has_new_comment?: boolean;
}

const typeConfig = {
  entrevista: { label: 'Entrevista', icon: '🎙️', color: 'bg-green-500' },
  booking: { label: 'Booking', icon: '🎤', color: 'bg-blue-500' },
  consulta: { label: 'Consulta', icon: '💬', color: 'bg-purple-500' },
  informacion: { label: 'Información', icon: 'ℹ️', color: 'bg-orange-500' },
  otro: { label: 'Otro', icon: '📄', color: 'bg-gray-500' },
};

const statusConfig = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  denegada: { label: 'Denegada', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export default function Solicitudes() {
  const { fireCelebration } = useConfetti();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileSearchTerm, setProfileSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [selectedSolicitudForDetails, setSelectedSolicitudForDetails] = useState<Solicitud | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; solicitudId: string; nombre: string }>({
    open: false,
    solicitudId: '',
    nombre: ''
  });
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; solicitudId: string; newStatus: 'aprobada' | 'denegada' | 'pendiente' }>({
    open: false,
    solicitudId: '',
    newStatus: 'aprobada'
  });
  const [encuentroDialog, setEncuentroDialog] = useState<{ open: boolean; solicitud: Solicitud | null }>({
    open: false,
    solicitud: null
  });
  const [profileSuggestions, setProfileSuggestions] = useState<{ id: string; full_name: string; email?: string | null }[]>([]);
  const [showProfileSuggestions, setShowProfileSuggestions] = useState(false);
  const [associateDialog, setAssociateDialog] = useState<{ open: boolean; solicitud: Solicitud | null }>({ open: false, solicitud: null });
  const [createProjectForSolicitud, setCreateProjectForSolicitud] = useState<{ open: boolean; solicitud: Solicitud | null }>({ open: false, solicitud: null });

  useEffect(() => {
    fetchSolicitudes();
    updateExistingSolicitudesNames(); // Actualizar nombres automáticamente
  }, []);
  useEffect(() => {
    filterSolicitudes();
  }, [solicitudes, searchTerm, profileSearchTerm, filterStatus, filterType]);

  // Sugerencias de perfiles con debounce
  useEffect(() => {
    const term = profileSearchTerm.trim();
    if (!term) {
      setProfileSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(8);
        if (error) throw error;
        setProfileSuggestions((data as any) || []);
      } catch (err) {
        console.error('Error buscando perfiles:', err);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [profileSearchTerm]);

  const fetchSolicitudes = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes')
        .select(`
          *,
          profiles:artist_id(full_name),
          project:project_id(id,name)
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      const rows = (data as any) || [];
      setSolicitudes(rows);
      // Recalcular y guardar fecha límite según prioridad si falta
      await recalcMissingDueDates(rows);
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para extraer contenido clave del texto
  const extractKeyContent = (text: string): string => {
    if (!text) return '';
    
    // Remove common prefixes and clean up
    let content = text.replace(/^(Solicitud de |Tema\/proyecto:\s*|Asunto principal:\s*|Detalle\/contexto:\s*|Detalle de la solicitud:\s*|Consulta|Información)/i, '');
    
    // Split by newlines and take the first meaningful line
    const lines = content.split('\n').filter(line => line.trim().length > 3);
    if (lines.length > 0) {
      content = lines[0];
    }
    
    // Clean up extra characters and spaces
    content = content.replace(/^[:\s\-–]+/, '').trim();
    
    // Remove common words and get key terms (max 3 words)
    const words = content.split(' ')
      .filter(word => 
        word.length > 2 && 
        !['hauriem', 'hauríem', 'de', 'el', 'la', 'que', 'per', 'amb', 'una', 'un', 'les', 'els', 'del', 'al', 'com', 'quan', 'per', 'sobre', 'si', 'saber', 'decidir', 'treiem'].includes(word.toLowerCase())
      )
      .slice(0, 3);
    
    return words.join(' ');
  };

  // Función para generar automáticamente el nombre de una solicitud
  const generateSolicitudName = (solicitud: Solicitud) => {
    const { tipo } = solicitud;
    let name = '';

    switch (tipo) {
      case 'entrevista':
        if (solicitud.nombre_programa) {
          name = `Entrevista ${solicitud.nombre_programa}`;
        } else if (solicitud.medio) {
          name = `Entrevista ${solicitud.medio}`;
        } else {
          name = 'Entrevista';
        }
        break;

      case 'booking':
        if (solicitud.nombre_festival) {
          name = `Booking ${solicitud.nombre_festival}`;
        } else if (solicitud.lugar_concierto) {
          name = `Booking ${solicitud.lugar_concierto}`;
        } else if (solicitud.ciudad) {
          name = `Booking ${solicitud.ciudad}`;
        } else {
          name = 'Booking';
        }
        break;

      case 'consulta':
        if (solicitud.descripcion_libre) {
          const keyContent = extractKeyContent(solicitud.descripcion_libre);
          console.log(`Extracted key content for consulta: "${keyContent}"`);
          
          // Special handling for specific cases
          if (keyContent.toLowerCase().includes('nom') && keyContent.toLowerCase().includes('lucia')) {
            name = 'Consulta: Nom LUCIA & RITA';
          } else if (keyContent.toLowerCase().includes('nom') && keyContent.toLowerCase().includes('oficial')) {
            name = 'Consulta: Nom Oficial';
          } else if (keyContent) {
            name = `Consulta: ${keyContent}`;
          } else {
            name = 'Consulta';
          }
        } else {
          name = 'Consulta';
        }
        break;

      case 'informacion':
        if (solicitud.descripcion_libre) {
          const keyContent = extractKeyContent(solicitud.descripcion_libre);
          console.log(`Extracted key content for informacion: "${keyContent}"`);
          
          // Special handling for release/single information
          if (keyContent.toLowerCase().includes('release') && keyContent.toLowerCase().includes('primer') && keyContent.toLowerCase().includes('single')) {
            name = 'Información: RELEASE PRIMER SINGLE';
          } else if (keyContent.toLowerCase().includes('single') || keyContent.toLowerCase().includes('release')) {
            name = keyContent.toLowerCase().includes('primer') ? 'Información: Release primer single' : 'Información: Release single';
          } else if (keyContent) {
            name = `Información: ${keyContent}`;
          } else {
            name = 'Información';
          }
        } else {
          name = 'Información';
        }
        break;

      case 'otro':
        if (solicitud.descripcion_libre) {
          const keyContent = extractKeyContent(solicitud.descripcion_libre);
          name = keyContent || 'Solicitud';
        } else {
          name = 'Solicitud';
        }
        break;

      default:
        name = 'Solicitud';
    }

    return name;
  };

  // Función para actualizar nombres de solicitudes existentes
  const updateExistingSolicitudesNames = async () => {
    try {
      const { data: allSolicitudes, error } = await supabase
        .from('solicitudes')
        .select('*');

      if (error) throw error;

      const solicitudesToUpdate: any[] = [];
      
      allSolicitudes?.forEach((solicitud: any) => {
        const currentName = solicitud.nombre_solicitante?.toLowerCase() || '';
        
        // Lista de nombres genéricos que necesitan actualización
        const genericNames = [
          'sin nombre',
          'test',
          'test 01',
          'nueva solicitud',
          'solicitud general',
          'solicitud de entrevista',
          'solicitud de booking',
          'consulta',
          'solicitud de información'
        ];
        
        console.log(`Checking solicitud ${solicitud.id}: "${solicitud.nombre_solicitante}" (type: ${solicitud.tipo})`);
        
        // Si el nombre actual es genérico, tiene formato anterior, o está en nuestra lista, actualizarlo
        const needsUpdate = genericNames.includes(currentName) || 
            currentName === '' || 
            currentName === 'sin nombre' ||
            currentName.startsWith('test') ||
            currentName.match(/^[a-z0-9\s]{1,10}$/i) ||
            solicitud.nombre_solicitante === 'Información' ||
            solicitud.nombre_solicitante === 'Consulta: Consulta' ||
            solicitud.nombre_solicitante?.includes('Consulta – Solicitud de Consulta') ||
            solicitud.nombre_solicitante?.includes('Solicitud de información – Solicitud de Información') ||
            solicitud.nombre_solicitante?.startsWith('Consulta – ') ||
            solicitud.nombre_solicitante?.startsWith('Solicitud de información – ') ||
            solicitud.nombre_solicitante?.startsWith('Consulta:') ||
            solicitud.nombre_solicitante?.startsWith('Info:') ||
            solicitud.nombre_solicitante?.length < 15; // Force update for very short names
            
        console.log(`Needs update: ${needsUpdate}`);
        
        if (needsUpdate) {
          const newName = generateSolicitudName(solicitud);
          console.log(`Generated new name: "${newName}" for solicitud "${solicitud.nombre_solicitante}"`);
          
          if (newName !== solicitud.nombre_solicitante) {
            console.log(`Will update solicitud ${solicitud.id}: "${solicitud.nombre_solicitante}" -> "${newName}"`);
            solicitudesToUpdate.push({
              id: solicitud.id,
              nombre_solicitante: newName
            });
          } else {
            console.log(`No change needed for solicitud ${solicitud.id}: names match`);
          }
        }
      });

      // Actualizar en lotes
      if (solicitudesToUpdate.length > 0) {
        for (const update of solicitudesToUpdate) {
          await supabase
            .from('solicitudes')
            .update({ nombre_solicitante: update.nombre_solicitante })
            .eq('id', update.id);
        }
        
        console.log(`Actualizadas ${solicitudesToUpdate.length} solicitudes con nombres automáticos`);
        
        // Refrescar la lista
        fetchSolicitudes();
      }
    } catch (error) {
      console.error('Error updating solicitudes names:', error);
    }
  };

  // Helpers prioridad -> días y parsing desde descripcion_libre
  const priorityToDays = (p?: string | null) => {
    const key = (p || '').toLowerCase();
    if (key === 'urgente') return 1;
    if (key === 'alta') return 3;
    if (key === 'media') return 7;
    if (key === 'baja') return 14;
    return null;
  };

  const parsePriorityFromDescripcion = (text?: string | null): string | null => {
    if (!text) return null;
    const match = text.match(/prioridad:\s*(urgente|alta|media|baja)/i);
    return match ? match[1].toLowerCase() : null;
  };

  // Recalcular y guardar fechas límite faltantes según prioridad
  const recalcMissingDueDates = async (rows: any[]) => {
    const updates: { id: string; fecha: string }[] = [];
    for (const s of rows) {
      const p = parsePriorityFromDescripcion(s.descripcion_libre);
      const daysFromPriority = priorityToDays(p);

      // Determinar fecha esperada:
      // - Si hay prioridad, usarla
      // - Si NO hay prioridad y falta fecha_limite_respuesta, usar +7 días desde creación
      let expectedISO: string | null = null;
      if (daysFromPriority) {
        const expectedTs = new Date(s.fecha_creacion).getTime() + daysFromPriority * 24 * 60 * 60 * 1000;
        expectedISO = new Date(expectedTs).toISOString();
      } else if (!s.fecha_limite_respuesta) {
        const expectedTs = new Date(s.fecha_creacion).getTime() + 7 * 24 * 60 * 60 * 1000;
        expectedISO = new Date(expectedTs).toISOString();
      }

      if (!expectedISO) continue; // ya tiene fecha y no hay prioridad -> no tocar

      const currentTs = s.fecha_limite_respuesta ? new Date(s.fecha_limite_respuesta).getTime() : null;
      const expectedTs = new Date(expectedISO).getTime();
      const shouldUpdate = !currentTs || Math.abs(currentTs - expectedTs) > 12 * 60 * 60 * 1000;

      if (shouldUpdate) {
        const { error } = await supabase
          .from('solicitudes')
          .update({ fecha_limite_respuesta: expectedISO })
          .eq('id', s.id);
        if (!error) {
          updates.push({ id: s.id, fecha: expectedISO });
        } else {
          console.error('Error updating fecha_limite_respuesta:', error);
        }
      }
    }
    if (updates.length) {
      setSolicitudes(prev => prev.map(s => {
        const u = updates.find(u2 => u2.id === s.id);
        return u ? { ...s, fecha_limite_respuesta: u.fecha } : s;
      }));
    }
  };

  const filterSolicitudes = () => {
    let filtered = [...solicitudes];

    if (filterStatus !== 'all') {
      if (filterStatus === 'archivadas') {
        filtered = filtered.filter(s => s.archived);
      } else {
        filtered = filtered.filter(s => s.estado === filterStatus && !s.archived);
      }
    } else {
      // Si no hay filtro específico, excluir archivadas por defecto
      filtered = filtered.filter(s => !s.archived);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(s => s.tipo === filterType);
    }


    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.nombre_solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.observaciones?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (profileSearchTerm) {
      filtered = filtered.filter(s =>
        s.profiles?.full_name?.toLowerCase().includes(profileSearchTerm.toLowerCase())
      );
    }

    // Orden: pendientes primero; dentro de cada grupo, por prioridad (urgente→baja→sin), luego por fecha límite y finalmente por creación
    const statusOrder: Record<Solicitud['estado'], number> = { pendiente: 0, aprobada: 1, denegada: 2 };
    const priorityRank = (s: Solicitud) => {
      const p = parsePriorityFromDescripcion((s as any).descripcion_libre);
      switch (p) {
        case 'urgente': return 0;
        case 'alta': return 1;
        case 'media': return 2;
        case 'baja': return 3;
        default: return 4; // sin prioridad al final
      }
    };

    filtered.sort((a, b) => {
      const byStatus = statusOrder[a.estado] - statusOrder[b.estado];
      if (byStatus !== 0) return byStatus;

      const prA = priorityRank(a);
      const prB = priorityRank(b);
      if (prA !== prB) return prA - prB;

      const dueA = a.fecha_limite_respuesta ? new Date(a.fecha_limite_respuesta).getTime() : Number.POSITIVE_INFINITY;
      const dueB = b.fecha_limite_respuesta ? new Date(b.fecha_limite_respuesta).getTime() : Number.POSITIVE_INFINITY;
      if (dueA !== dueB) return dueA - dueB;

      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });

    setFilteredSolicitudes(filtered);
  };

const handleStatusChange = async (
  solicitudId: string,
  newStatus: 'pendiente' | 'aprobada' | 'denegada',
  currentStatus?: 'pendiente' | 'aprobada' | 'denegada'
) => {
  if (
    newStatus === 'aprobada' ||
    newStatus === 'denegada' ||
    (newStatus === 'pendiente' && currentStatus && currentStatus !== 'pendiente')
  ) {
    setStatusDialog({ open: true, solicitudId, newStatus });
    return;
  }

  try {
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: newStatus })
      .eq('id', solicitudId);

    if (error) throw error;

    toast({
      title: "Estado actualizado",
      description: "El estado de la solicitud se ha actualizado correctamente.",
    });

    fetchSolicitudes();
  } catch (error) {
    console.error('Error updating status:', error);
    toast({
      title: "Error",
      description: "No se pudo actualizar el estado de la solicitud.",
      variant: "destructive",
    });
  }
};

const confirmStatusChange = async (comment: string) => {
  const { solicitudId, newStatus } = statusDialog;
  if (!solicitudId) return;
  try {
    const { error } = await supabase
      .from('solicitudes')
      .update({
        estado: newStatus,
        comentario_estado: comment || null,
        decision_por: profile?.user_id || null,
        decision_fecha: new Date().toISOString(),
      } as any)
      .eq('id', solicitudId);

    if (error) throw error;

    toast({ title: 'Estado actualizado', description: 'El estado y comentario han sido guardados.' });
    setStatusDialog({ open: false, solicitudId: '', newStatus: 'aprobada' });
    fetchSolicitudes();
    if (newStatus === 'aprobada') {
      fireCelebration();
    }
  } catch (error) {
    console.error('Error updating status:', error);
    toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
  }
};

  const openDeleteDialog = (solicitudId: string, nombre: string) => {
    setDeleteDialog({ open: true, solicitudId, nombre });
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('solicitudes')
        .delete()
        .eq('id', deleteDialog.solicitudId);

      if (error) throw error;

      toast({
        title: "Solicitud eliminada",
        description: "La solicitud se ha eliminado correctamente.",
      });

      setDeleteDialog({ open: false, solicitudId: '', nombre: '' });
      fetchSolicitudes();
    } catch (error) {
      console.error('Error deleting solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la solicitud.",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (solicitudId: string) => {
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ archived: true })
        .eq('id', solicitudId);

      if (error) throw error;

      toast({
        title: "Solicitud archivada",
        description: "La solicitud se ha archivado correctamente.",
      });

      fetchSolicitudes();
    } catch (error) {
      console.error('Error archiving solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo archivar la solicitud.",
        variant: "destructive",
      });
    }
  };

  const handleUnarchive = async (solicitudId: string) => {
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ archived: false })
        .eq('id', solicitudId);

      if (error) throw error;

      toast({
        title: "Solicitud desarchivada",
        description: "La solicitud se ha desarchivado correctamente.",
      });

      fetchSolicitudes();
    } catch (error) {
      console.error('Error unarchiving solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo desarchivar la solicitud.",
        variant: "destructive",
      });
    }
  };

  const getMainContent = (solicitud: Solicitud) => {
    if (solicitud.tipo === 'booking') {
      return solicitud.nombre_festival || solicitud.lugar_concierto || 'Evento sin nombre';
    } else if (solicitud.tipo === 'entrevista') {
      return solicitud.nombre_programa || solicitud.medio || 'Entrevista';
    }
    return solicitud.nombre_solicitante;
  };

  const handleCreateCalendarEvent = (solicitud: Solicitud) => {
    // Preparar datos para el evento
    const eventData = {
      solicitudId: solicitud.id,
      title: getMainContent(solicitud),
      type: solicitud.tipo === 'entrevista' ? 'meeting' : solicitud.tipo === 'booking' ? 'concert' : 'other',
      location: solicitud.tipo === 'booking' 
        ? `${solicitud.lugar_concierto || ''} ${solicitud.ciudad || ''}`.trim()
        : solicitud.medio || '',
      description: `${solicitud.tipo === 'entrevista' ? 'Entrevista' : 'Booking'} para ${solicitud.profiles?.full_name || 'artista'}\n\n` +
        `Solicitante: ${solicitud.nombre_solicitante}\n` +
        (solicitud.email ? `Email: ${solicitud.email}\n` : '') +
        (solicitud.telefono ? `Teléfono: ${solicitud.telefono}\n` : '') +
        (solicitud.observaciones ? `Comentarios de la solicitante: ${solicitud.observaciones}\n` : '') +
        (solicitud.tipo === 'entrevista' && solicitud.nombre_entrevistador ? `Entrevistador: ${solicitud.nombre_entrevistador}\n` : '') +
        (solicitud.tipo === 'booking' && solicitud.nombre_festival ? `Festival: ${solicitud.nombre_festival}\n` : ''),
      startDate: solicitud.tipo === 'entrevista' ? solicitud.hora_entrevista : solicitud.hora_show,
      artistId: solicitud.artist_id
    };

    // Navegar al calendario con los datos
    navigate('/calendar', { state: { createEvent: eventData } });
  };

  // Helpers para fecha límite de respuesta
  const getDaysToDeadline = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try { return differenceInCalendarDays(new Date(dateStr), new Date()); } catch { return null; }
  };

  const DueChip = ({ date, estado }: { date?: string | null; estado: Solicitud['estado']; }) => {
    const days = getDaysToDeadline(date);
    if (days === null || estado !== 'pendiente') return null;

    let text = '';
    let cls = 'text-muted-foreground';

    if (days < 0) {
      text = `Vencida hace ${Math.abs(days)}d`;
      cls = 'text-destructive font-semibold';
    } else if (days === 0) {
      text = '0d';
      cls = 'text-muted-foreground font-bold';
    } else {
      text = `${days}d`;
      if (days <= 1) {
        cls = 'text-muted-foreground font-bold';
      } else if (days <= 3) {
        cls = 'text-muted-foreground font-semibold';
      } else if (days <= 7) {
        cls = 'text-muted-foreground font-medium';
      } else {
        cls = 'text-muted-foreground';
      }
    }

    return (
      <span className={`text-[10px] sm:text-xs ${cls} whitespace-nowrap`}>{text}</span>
    );
  };

  const renderSolicitudCard = (solicitud: Solicitud) => {
    const typeInfo = typeConfig[solicitud.tipo];
    const statusInfo = statusConfig[solicitud.estado];
    const StatusIcon = statusInfo.icon;

    return (
      <Card 
        key={solicitud.id} 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 animate-fade-in"
        style={{ borderLeftColor: typeInfo.color.replace('bg-', '') }}
        onClick={() => {
          setSelectedSolicitudForDetails(solicitud);
          setShowDetailsDialog(true);
        }}
      >
        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between">
            <div className="flex-1 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full ${typeInfo.color} flex items-center justify-center text-white text-sm`}>
                  {typeInfo.icon}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{getMainContent(solicitud)}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">{typeInfo.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${statusInfo.color} border font-medium`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(solicitud.fecha_creacion), 'dd MMM yyyy', { locale: es })}
                </span>
                {solicitud.profiles?.full_name && (
                  <span className="text-xs text-primary font-medium">
                    {solicitud.profiles.full_name}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate max-w-[140px]">{solicitud.project?.name ?? 'Proyecto'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    disabled={!solicitud.project?.id && !solicitud.project_id}
                    onClick={() => {
                      const pid = solicitud.project?.id ?? solicitud.project_id;
                      if (pid) navigate(`/projects/${pid}`);
                    }}
                  >
                    Ir al proyecto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAssociateDialog({ open: true, solicitud })}>
                    Asociar a proyecto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateProjectForSolicitud({ open: true, solicitud })}>
                    Nuevo proyecto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSolicitud(solicitud);
                  setShowEditDialog(true);
                }}
                className="w-8 h-8 p-0 hover:bg-muted"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(solicitud.id, solicitud.nombre_solicitante);
                }}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (solicitud.archived) {
                    handleUnarchive(solicitud.id);
                  } else {
                    handleArchive(solicitud.id);
                  }
                }}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                title={solicitud.archived ? "Desarchivar" : "Archivar"}
              >
                {solicitud.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <Select
              value={solicitud.estado}
              onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => {
                handleStatusChange(solicitud.id, value, solicitud.estado);
              }}
            >
              <SelectTrigger 
                className="w-32 h-8"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Pendiente
                  </div>
                </SelectItem>
                <SelectItem value="aprobada">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    Aprobada
                  </div>
                </SelectItem>
                <SelectItem value="denegada">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3 h-3" />
                    Denegada
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              {solicitud.estado === 'aprobada' && (solicitud.hora_entrevista || solicitud.hora_show) && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateCalendarEvent(solicitud);
                  }}
                >
                  <Calendar className="w-3 h-3" />
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8">
                <MessageSquare className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendientesCount = solicitudes.filter(s => s.estado === 'pendiente' && !s.archived).length;
  const aprobadasCount = solicitudes.filter(s => s.estado === 'aprobada' && !s.archived).length;
  const denegadasCount = solicitudes.filter(s => s.estado === 'denegada' && !s.archived).length;
  const archivadasCount = solicitudes.filter(s => s.archived).length;

  const getStatusBadgeColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'aprobada': return 'bg-green-50 text-green-700 border-green-200';
      case 'denegada': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (tipo: string) => {
    const iconProps = { size: 16, className: "text-white" };
    switch (tipo) {
      case 'entrevista': return <Mic {...iconProps} />;
      case 'booking': return <Music {...iconProps} />;
      case 'consulta': return <HelpCircle {...iconProps} />;
      case 'informacion': return <Info {...iconProps} />;
      case 'otro': return <FileText {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header estilo Gmail */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Solicitudes</h1>
          <Badge variant="secondary" className="text-sm px-3 py-1 cursor-pointer" onClick={() => setFilterStatus('all')}>
            ver todas
          </Badge>
          <div className="hidden sm:flex gap-2 text-sm text-muted-foreground">
            <span
              className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs cursor-pointer"
              onClick={() => setFilterStatus('pendiente')}
            >
              {pendientesCount} pendientes
            </span>
            <span
              className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs cursor-pointer"
              onClick={() => setFilterStatus('aprobada')}
            >
              {aprobadasCount} aprobadas
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs cursor-pointer ${
                filterStatus === 'denegada' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
              onClick={() => {
                // Toggle simple entre denegadas y archivadas
                if (filterStatus === 'denegada') {
                  setFilterStatus('archivadas');
                } else {
                  setFilterStatus('denegada');
                }
              }}
            >
              {filterStatus === 'denegada' 
                ? `${denegadasCount} denegadas`
                : `${archivadasCount} archivadas`
              }
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowTemplateDialog(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* Toolbar de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar solicitudes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar perfiles..."
            value={profileSearchTerm}
            onChange={(e) => { setProfileSearchTerm(e.target.value); setShowProfileSuggestions(true); }}
            onFocus={() => setShowProfileSuggestions(true)}
            onBlur={() => setTimeout(() => setShowProfileSuggestions(false), 150)}
            className="pl-9 h-9 text-sm"
          />
          {showProfileSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover text-popover-foreground shadow-md">
              <ul className="max-h-60 overflow-auto py-1">
                {profileSearchTerm.trim().length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">Escribe para buscar perfiles…</li>
                ) : (profileSuggestions.length > 0 ? (
                  profileSuggestions.map((p) => (
                    <li key={p.id}>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                        onMouseDown={(e) => { e.preventDefault(); setProfileSearchTerm(p.full_name || ''); setShowProfileSuggestions(false); }}
                      >
                        <div className="font-medium">{p.full_name}</div>
                        {p.email ? <div className="text-xs text-muted-foreground">{p.email}</div> : null}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
                ))}
                {profileSearchTerm && (
                  <li>
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(e) => { e.preventDefault(); setProfileSearchTerm(''); setShowProfileSuggestions(false); }}
                    >
                      Limpiar filtro
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="entrevista">Entrevista</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="consulta">Consulta</SelectItem>
            <SelectItem value="informacion">Información</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vista tipo inbox de Gmail */}
      {filteredSolicitudes.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'No se encontraron solicitudes que coincidan con los filtros seleccionados.'
                : 'Aún no tienes solicitudes. ¡Crea la primera!'}
            </p>
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Solicitud
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          {filteredSolicitudes.map((solicitud, index) => {
            const typeInfo = typeConfig[solicitud.tipo];
            const statusInfo = statusConfig[solicitud.estado];
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={solicitud.id}
                className={`
                  group flex items-center gap-4 p-4 cursor-pointer transition-colors border-b border-border/50 last:border-b-0
                  ${solicitud.estado === 'aprobada' ? 'bg-success/50 hover:bg-success/60' : ''}
                  ${solicitud.estado === 'pendiente' ? 'bg-warning/50 hover:bg-warning/60' : ''}
                  ${solicitud.estado === 'denegada' ? 'bg-destructive/50 hover:bg-destructive/60' : ''}
                `}
                onClick={() => {
                  setSelectedSolicitudForDetails(solicitud);
                  setShowDetailsDialog(true);
                }}
              >
                {/* Icono/Tipo */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    {getTypeIcon(solicitud.tipo)}
                  </div>
                </div>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-medium truncate ${solicitud.estado === 'pendiente' ? 'text-foreground font-semibold' : 'text-foreground'}`}>
                      {getMainContent(solicitud)}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded capitalize flex-shrink-0">
                      {typeInfo.label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate max-w-[140px]">{solicitud.project?.name ?? 'Proyecto'}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          disabled={!solicitud.project?.id && !solicitud.project_id}
                          onClick={() => {
                            const pid = solicitud.project?.id ?? solicitud.project_id;
                            if (pid) navigate(`/projects/${pid}`);
                          }}
                        >
                          Ir al proyecto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setAssociateDialog({ open: true, solicitud })}
                        >
                          Asociar a proyecto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCreateProjectForSolicitud({ open: true, solicitud })}
                        >
                          Nuevo proyecto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {solicitud.decision_has_new_comment ? (
                      <span className="ml-1 inline-flex items-center gap-1 text-xs text-primary">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        Nuevo
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {solicitud.profiles?.full_name && (
                      <span className="flex-shrink-0">👤 {solicitud.profiles.full_name}</span>
                    )}
                    {solicitud.email && (
                      <span className="flex-shrink-0">📧 {solicitud.email}</span>
                    )}
                    {(solicitud.tipo === 'booking' && solicitud.ciudad) && (
                      <span className="flex-shrink-0">📍 {solicitud.ciudad}</span>
                    )}
                    {(solicitud.tipo === 'entrevista' && solicitud.medio) && (
                      <span className="flex-shrink-0">📺 {solicitud.medio}</span>
                    )}
                    {solicitud.observaciones && (
                      <span className="truncate">💬 {solicitud.observaciones.substring(0, 40)}...</span>
                    )}
                  </div>
                </div>

                {/* Estado + Fecha/Acciones alineados a la derecha */}
                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                  {/* Slot fijo para días restantes (no mueve el estado) */}
                  <div className="flex-shrink-0 min-w-[90px] flex justify-end">
                    {solicitud.estado === 'pendiente' ? (
                      <DueChip date={solicitud.fecha_limite_respuesta} estado={solicitud.estado} />
                    ) : (
                      <span className="invisible block text-[10px] sm:text-xs px-2 py-1 rounded-full border">--</span>
                    )}
                  </div>

                  {/* Estado - chip interactivo */}
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={solicitud.estado}
                      onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => handleStatusChange(solicitud.id, value, solicitud.estado)}
                    >
                      <SelectTrigger
                        className={`${getStatusBadgeColor(solicitud.estado)} text-xs border rounded-full h-7 px-3 [&>svg:last-child]:hidden`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </div>
                        </SelectItem>
                        <SelectItem value="aprobada">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3" />
                            Aprobada
                          </div>
                        </SelectItem>
                        <SelectItem value="denegada">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-3 h-3" />
                            Denegada
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fecha / Acciones (intercambio al hover) */}
                  <div className="relative w-24 sm:w-32">
                    {/* Fecha (visible por defecto) */}
                    <div className="absolute inset-0 flex items-center justify-end text-sm text-muted-foreground transition-opacity duration-200 group-hover:opacity-0">
                      {format(new Date(solicitud.fecha_creacion), 'dd MMM', { locale: es })}
                    </div>

                    {/* Acciones (solo en hover) */}
                    <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEncuentroDialog({ open: true, solicitud });
                        }}
                        className="h-8 w-8 p-0 hover:bg-muted"
                      >
                        <Phone className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSolicitud(solicitud);
                          setShowEditDialog(true);
                        }}
                        className="h-8 w-8 p-0 hover:bg-muted"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(solicitud.id, getMainContent(solicitud));
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (solicitud.archived) {
                            handleUnarchive(solicitud.id);
                          } else {
                            handleArchive(solicitud.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                        title={solicitud.archived ? "Desarchivar" : "Archivar"}
                      >
                        {solicitud.archived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateSolicitudDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSolicitudCreated={fetchSolicitudes}
      />

      <CreateSolicitudFromTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onSuccess={fetchSolicitudes}
      />

      {selectedSolicitud && (
        <EditSolicitudDialog
          solicitud={selectedSolicitud}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSolicitudUpdated={fetchSolicitudes}
        />
      )}

<SolicitudDetailsDialog
  solicitudId={selectedSolicitudForDetails?.id || null}
  open={showDetailsDialog}
  onOpenChange={setShowDetailsDialog}
  onUpdate={fetchSolicitudes}
/>

<ConfirmationDialog
  open={deleteDialog.open}
  onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
  title="¿Eliminar solicitud?"
  description={`¿Estás seguro de que quieres eliminar la solicitud "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
  onConfirm={handleDelete}
  variant="destructive"
/>

<StatusCommentDialog
  open={statusDialog.open}
  onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}
  status={statusDialog.newStatus}
  onSubmit={confirmStatusChange}
/>

<ScheduleEncounterDialog
  open={encuentroDialog.open}
  onOpenChange={(open) => setEncuentroDialog({ open, solicitud: open ? encuentroDialog.solicitud : null })}
  solicitud={encuentroDialog.solicitud ? {
    id: encuentroDialog.solicitud.id,
    artist_id: encuentroDialog.solicitud.artist_id,
    tipo: encuentroDialog.solicitud.tipo,
    nombre_solicitante: encuentroDialog.solicitud.nombre_solicitante,
    ciudad: encuentroDialog.solicitud.ciudad,
    medio: encuentroDialog.solicitud.medio,
    lugar_concierto: encuentroDialog.solicitud.lugar_concierto,
  } : null}
  onCreated={fetchSolicitudes}
/>
      <AssociateProjectDialog
        open={associateDialog.open}
        onOpenChange={(open) => setAssociateDialog({ open, solicitud: open ? associateDialog.solicitud : null })}
        solicitudId={associateDialog.solicitud?.id || null}
        artistId={associateDialog.solicitud?.artist_id || null}
        onLinked={() => {
          fetchSolicitudes();
        }}
      />

      <CreateProjectDialog
        open={createProjectForSolicitud.open}
        onOpenChange={(open) => setCreateProjectForSolicitud({ open, solicitud: open ? createProjectForSolicitud.solicitud : null })}
        onSuccess={fetchSolicitudes}
        defaultArtistId={createProjectForSolicitud.solicitud?.artist_id}
        onCreated={async (projectId: string) => {
          const solicitudId = createProjectForSolicitud.solicitud?.id;
          if (!solicitudId) return;
          const { error } = await supabase
            .from('solicitudes')
            .update({ project_id: projectId })
            .eq('id', solicitudId);
          if (error) {
            console.error('Error linking new project to solicitud:', error);
            toast({ title: 'Error', description: 'No se pudo asociar la solicitud al nuevo proyecto', variant: 'destructive' });
          } else {
            toast({ title: 'Proyecto asociado', description: 'Proyecto creado y asociado a la solicitud.' });
            fetchSolicitudes();
          }
        }}
      />
    </div>
  );
}