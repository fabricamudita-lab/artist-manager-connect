import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, PlusCircle, FileText, DollarSign, LogOut, Send, TrendingUp, Music, Radio, Receipt, Headphones, Mic, Globe, Clock, MapPin, Archive, MessageCircle, Edit, Filter, Search, MoreHorizontal, CalendarPlus, AlertTriangle, CheckCircle, XCircle, Package, User, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import InviteArtistDialog from '@/components/InviteArtistDialog';
import NotificationBell from '@/components/NotificationBell';
import { EditRequestDialog } from '@/components/EditRequestDialog';
import { AddToCalendarDialog } from '@/components/AddToCalendarDialog';
import { ArtistInfoDialog } from '@/components/ArtistInfoDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ArtistProfileDialog } from '@/components/ArtistProfileDialog';
import { CreateSolicitudFromTemplateDialog } from '@/components/CreateSolicitudFromTemplateDialog';
import { SolicitudDetailsDialog } from '@/components/SolicitudDetailsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

interface Request {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  artist_id: string;
  created_at: string;
}

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  observaciones?: string;
  notas_internas?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  fecha_creacion: string;
  fecha_actualizacion: string;
  created_by: string;
  artist_id?: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  event_type: string;
  artist_id: string;
}

export default function ManagementDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [eventTimeframe, setEventTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [newRequest, setNewRequest] = useState({
    artist_id: '',
    type: '',
    title: '',
    description: '',
    due_date: '',
  });
  
  // Dialog states
  const [editRequestDialog, setEditRequestDialog] = useState<{ open: boolean; request: Request | null }>({
    open: false,
    request: null,
  });
  const [addToCalendarDialog, setAddToCalendarDialog] = useState<{ open: boolean; request: Request | null }>({
    open: false,
    request: null,
  });
  const [artistInfoDialog, setArtistInfoDialog] = useState<{ open: boolean; artistId: string | null }>({
    open: false,
    artistId: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; requestId: string; title: string }>({
    open: false,
    requestId: '',
    title: ''
  });
  const [artistProfileDialog, setArtistProfileDialog] = useState<{ open: boolean; artistId: string | null }>({
    open: false,
    artistId: null
  });
  const [solicitudDetailsDialog, setSolicitudDetailsDialog] = useState<{ open: boolean; solicitudId: string | null }>({
    open: false,
    solicitudId: null
  });

  useEffect(() => {
    if (profile) {
      fetchData();
      
      // Configurar actualizaciones en tiempo real
      const requestsChannel = supabase
        .channel('requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'requests',
            filter: `management_id=eq.${profile.id}`
          },
          (payload) => {
            console.log('Request change detected:', payload);
            
            if (payload.eventType === 'INSERT') {
              setRequests(prev => [payload.new as Request, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setRequests(prev => 
                prev.map(req => 
                  req.id === payload.new.id ? { ...req, ...payload.new } : req
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setRequests(prev => 
                prev.filter(req => req.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      const solicitudesChannel = supabase
        .channel('solicitudes-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitudes'
          },
          (payload) => {
            console.log('Solicitud change detected:', payload);
            
            if (payload.eventType === 'INSERT') {
              setSolicitudes(prev => [payload.new as Solicitud, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setSolicitudes(prev => 
                prev.map(sol => 
                  sol.id === payload.new.id ? { ...sol, ...payload.new } : sol
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setSolicitudes(prev => 
                prev.filter(sol => sol.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(requestsChannel);
        supabase.removeChannel(solicitudesChannel);
      };
    }
  }, [profile]);

  // Refrescar datos cuando se regresa de otras páginas
  useEffect(() => {
    const handleFocus = () => {
      if (profile) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [profile]);

  const fetchData = async () => {
    try {
      // Fetch artists (profiles with role 'artist')
      const { data: artistsData } = await supabase
        .from('profiles')
        .select('*')
        .contains('roles', ['artist']);

      // Fetch all requests created by this management
      const { data: requestsData } = await supabase
        .from('requests')
        .select('*')
        .eq('management_id', profile?.id)
        .order('created_at', { ascending: false });

      // Fetch all solicitudes
      const { data: solicitudesData } = await supabase
        .from('solicitudes')
        .select(`
          *,
          profiles:artist_id(full_name)
        `)
        .order('fecha_creacion', { ascending: false });

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      setArtists(artistsData || []);
      setRequests(requestsData || []);
      setSolicitudes((solicitudesData as any) || []);
      setEvents(eventsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.artist_id || !newRequest.type || !newRequest.title) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('requests')
        .insert({
          artist_id: newRequest.artist_id,
          management_id: profile?.id,
          type: newRequest.type,
          title: newRequest.title,
          description: newRequest.description,
          due_date: newRequest.due_date || null,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Solicitud creada correctamente.",
      });

      setNewRequest({
        artist_id: '',
        type: '',
        title: '',
        description: '',
        due_date: '',
      });
      
      // Refrescar solo las requests sin recargar todo
      const { data: updatedRequests } = await supabase
        .from('requests')
        .select('*')
        .eq('management_id', profile?.id)
        .order('created_at', { ascending: false });
      
      if (updatedRequests) {
        setRequests(updatedRequests);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";
    
    switch (status) {
      case 'pending':
        return {
          className: `${baseClass} bg-gray-100 text-gray-800`,
          icon: <Clock className="w-3 h-3" />,
          text: 'Pendiente'
        };
      case 'approved':
        return {
          className: `${baseClass} bg-green-100 text-green-800`,
          icon: <CheckCircle className="w-3 h-3" />,
          text: 'Aprobada'
        };
      case 'rejected':
        return {
          className: `${baseClass} bg-red-100 text-red-800`,
          icon: <XCircle className="w-3 h-3" />,
          text: 'Rechazada'
        };
      case 'urgent':
        return {
          className: `${baseClass} bg-yellow-100 text-yellow-800`,
          icon: <AlertTriangle className="w-3 h-3" />,
          text: 'Urgente'
        };
      case 'archived':
        return {
          className: `${baseClass} bg-blue-100 text-blue-800`,
          icon: <Package className="w-3 h-3" />,
          text: 'Archivada'
        };
      default:
        return {
          className: `${baseClass} bg-gray-100 text-gray-800`,
          icon: <Clock className="w-3 h-3" />,
          text: status
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return '🎤';
      case 'interview': return '🎙️';
      case 'consultation': return '💬';
      case 'information': return 'ℹ️';
      default: return '📄';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'concert': return '🎵';
      case 'festival': return '🎪';
      case 'interview': return '🎙️';
      case 'recording': return '🎧';
      case 'meeting': return '🤝';
      default: return '📅';
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      // Actualizar optimistamente el estado local
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { ...request, status: newStatus }
            : request
        )
      );

      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Solicitud ${newStatus === 'archived' ? 'archivada' : 'actualizada'} correctamente.`,
      });

    } catch (error) {
      // Revertir el cambio optimista en caso de error
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { ...request, status: request.status } // Revertir al estado anterior
            : request
        )
      );
      
      toast({
        title: "Error",
        description: "No se pudo actualizar la solicitud.",
        variant: "destructive",
      });
      
      // Recargar datos en caso de error
      fetchData();
    }
  };

  const openChat = (artistId: string, requestTitle: string) => {
    navigate(`/chat?artist=${artistId}&subject=${encodeURIComponent(requestTitle)}`);
  };

  const openArtistInfo = (artistId: string) => {
    setArtistInfoDialog({ open: true, artistId });
  };

  const openAddToCalendar = (request: Request) => {
    setAddToCalendarDialog({ open: true, request });
  };

  const handleEventCreated = () => {
    // Marcar la solicitud como que tiene evento asignado
    if (addToCalendarDialog.request) {
      const cardElement = document.querySelector(`[data-request-id="${addToCalendarDialog.request.id}"]`);
      if (cardElement) {
        cardElement.classList.add('request-card-calendar-added');
        // Remover la clase después de la animación
        setTimeout(() => {
          cardElement.classList.remove('request-card-calendar-added');
        }, 1000);
      }

      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === addToCalendarDialog.request!.id 
            ? { ...req, status: 'approved' } // O algún indicador de que tiene evento
            : req
        )
      );
    }
    
    // Refrescar solo los eventos sin recargar todo
    fetchEvents();
  };

  const fetchEvents = async () => {
    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });
      
      if (eventsData) {
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const openEditRequest = (request: Request) => {
    setEditRequestDialog({ open: true, request });
  };

  const handleRequestUpdated = () => {
    // Refrescar solo las requests sin recargar todo
    fetchRequests();
  };

  const fetchRequests = async () => {
    try {
      const { data: requestsData } = await supabase
        .from('requests')
        .select('*')
        .eq('management_id', profile?.id)
        .order('created_at', { ascending: false });
      
      if (requestsData) {
        setRequests(requestsData);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const openDeleteDialog = (requestId: string, title: string) => {
    setDeleteDialog({ open: true, requestId, title });
  };

  const deleteRequest = async () => {
    // Añadir clase de animación de eliminación inmediatamente
    const cardElement = document.querySelector(`[data-request-id="${deleteDialog.requestId}"]`);
    if (cardElement) {
      cardElement.classList.add('request-card-removing');
    }

    try {
      // Guardar referencia de la solicitud a eliminar
      const requestToDelete = requests.find(r => r.id === deleteDialog.requestId);
      
      // Esperar la animación antes de actualizar el estado
      setTimeout(() => {
        setRequests(prevRequests => 
          prevRequests.filter(request => request.id !== deleteDialog.requestId)
        );
      }, 300); // Duración de la animación

      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', deleteDialog.requestId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Solicitud eliminada correctamente.",
      });

      setDeleteDialog({ open: false, requestId: '', title: '' });
    } catch (error) {
      // Revertir el cambio optimista en caso de error
      const requestToRestore = requests.find(r => r.id === deleteDialog.requestId);
      if (requestToRestore) {
        setRequests(prevRequests => [...prevRequests, requestToRestore]);
      }

      // Remover clase de animación en caso de error
      if (cardElement) {
        cardElement.classList.remove('request-card-removing');
      }
      
      toast({
        title: "Error",
        description: "No se pudo eliminar la solicitud.",
        variant: "destructive",
      });
      
      // Recargar datos en caso de error
      fetchData();
    }
  };

  const openSolicitudDetails = (solicitudId: string) => {
    setSolicitudDetailsDialog({ open: true, solicitudId });
  };

  const openArtistProfile = (artistId: string) => {
    setArtistProfileDialog({ open: true, artistId });
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < now && (status === 'pending' || status === 'urgent');
  };

  const getFilteredRequests = () => {
    return requests.filter(request => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesSearch = searchTerm === '' || 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artists.find(a => a.id === request.artist_id)?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Si el filtro no es 'archived', no mostrar las solicitudes archivadas
      if (statusFilter !== 'archived' && request.status === 'archived') {
        return false;
      }
      
      return matchesStatus && matchesSearch;
    });
  };

  const getFilteredSolicitudes = () => {
    return solicitudes.filter(solicitud => {
      // Mapear estados de solicitudes a estados de filtro
      const solicitudStatus = solicitud.estado === 'pendiente' ? 'pending' : 
                            solicitud.estado === 'aprobada' ? 'approved' : 
                            solicitud.estado === 'denegada' ? 'rejected' : solicitud.estado;
      
      const matchesStatus = statusFilter === 'all' || solicitudStatus === statusFilter;
      const matchesSearch = searchTerm === '' || 
        solicitud.nombre_solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        solicitud.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        solicitud.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        solicitud.tipo.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  };

  const getStatusCounts = () => {
    const requestCounts = {
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      urgent: requests.filter(r => r.status === 'urgent').length,
      archived: requests.filter(r => r.status === 'archived').length,
    };

    const solicitudCounts = {
      all: solicitudes.length,
      pending: solicitudes.filter(s => s.estado === 'pendiente').length,
      approved: solicitudes.filter(s => s.estado === 'aprobada').length,
      rejected: solicitudes.filter(s => s.estado === 'denegada').length,
      urgent: 0, // No hay urgentes en solicitudes
      archived: 0, // No hay archivadas en solicitudes por ahora
    };

    return {
      all: requestCounts.all + solicitudCounts.all,
      pending: requestCounts.pending + solicitudCounts.pending,
      approved: requestCounts.approved + solicitudCounts.approved,
      rejected: requestCounts.rejected + solicitudCounts.rejected,
      urgent: requestCounts.urgent + solicitudCounts.urgent,
      archived: requestCounts.archived + solicitudCounts.archived,
    };
  };

  const getFilteredEvents = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      
      switch (eventTimeframe) {
        case 'day':
          return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case 'week':
          const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          return eventDate >= today && eventDate < weekEnd;
        case 'month':
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
          return eventDate >= today && eventDate < monthEnd;
        default:
          return false;
      }
    });
  };


  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold font-playfair bg-gradient-primary bg-clip-text text-transparent">
            MOODITA
          </h1>
          <p className="text-muted-foreground">Bienvenido, {profile?.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Solicitudes
          </TabsTrigger>
          <TabsTrigger value="artists" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Artistas
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Finanzas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestión de Solicitudes</h2>
              <Button onClick={() => setShowTemplateDialog(true)} className="btn-primary">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nueva Solicitud
              </Button>
            </div>

            {/* Filtros y búsqueda */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar por artista, título, tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ({getStatusCounts().all})</SelectItem>
                  <SelectItem value="pending">Pendientes ({getStatusCounts().pending})</SelectItem>
                  <SelectItem value="approved">Aprobadas ({getStatusCounts().approved})</SelectItem>
                  <SelectItem value="rejected">Rechazadas ({getStatusCounts().rejected})</SelectItem>
                  <SelectItem value="urgent">Urgentes ({getStatusCounts().urgent})</SelectItem>
                  <SelectItem value="archived">Archivadas ({getStatusCounts().archived})</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {getFilteredRequests().length === 0 && getFilteredSolicitudes().length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    {requests.length === 0 && solicitudes.length === 0
                      ? "No has creado solicitudes aún." 
                      : "No se encontraron solicitudes con los filtros actuales."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {/* Mostrar solicitudes de la tabla 'solicitudes' */}
                {getFilteredSolicitudes().map((solicitud) => {
                  const solicitudStatus = solicitud.estado === 'pendiente' ? 'pending' : 
                                        solicitud.estado === 'aprobada' ? 'approved' : 
                                        solicitud.estado === 'denegada' ? 'rejected' : solicitud.estado;
                  
                  return (
                     <div 
                       key={`sol-${solicitud.id}`}
                       data-request-id={`sol-${solicitud.id}`}
                       className="card-interactive hover-glow group animate-fade-in cursor-pointer"
                       onClick={() => openSolicitudDetails(solicitud.id)}
                       style={{ 
                         transition: 'all 0.3s ease-out',
                         animation: 'fade-in 0.3s ease-out'
                       }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                             <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                               <span className="text-white text-lg">
                                 {solicitud.tipo === 'entrevista' ? '📻' : 
                                  solicitud.tipo === 'booking' ? '🎤' : 
                                  solicitud.tipo === 'consulta' ? '💬' :
                                  solicitud.tipo === 'informacion' ? 'ℹ️' : '📌'}
                               </span>
                             </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                {solicitud.nombre_solicitante}
                              </h3>
                              <div className={getStatusBadge(solicitudStatus).className}>
                                {getStatusBadge(solicitudStatus).icon}
                                <span>{getStatusBadge(solicitudStatus).text}</span>
                              </div>
                            </div>
                          </div>
                          
                          {solicitud.profiles?.full_name && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm text-muted-foreground">Artista:</span>
                             <Button
                               variant="link"
                               size="sm"
                               className="p-0 h-auto text-sm font-medium hover-lift"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 openArtistProfile(solicitud.artist_id!);
                               }}
                             >
                                <User className="w-3 h-3 mr-1" />
                                {solicitud.profiles.full_name}
                              </Button>
                            </div>
                          )}
                          
                          {solicitud.observaciones && (
                            <div className="bg-muted/30 p-3 rounded-lg mb-3">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {solicitud.observaciones}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-primary rounded-full"></div>
                              <span>Tipo: {solicitud.tipo}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-secondary rounded-full"></div>
                              <span>Creado: {new Date(solicitud.fecha_creacion).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {solicitudStatus === 'approved' && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               navigate('/calendar');
                             }}
                             title="Ver en Calendario"
                             className="hover-lift"
                           >
                             <CalendarPlus className="w-4 h-4" />
                           </Button>
                         )}
                         
                         {solicitud.artist_id && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               navigate(`/chat?artist=${solicitud.artist_id}&subject=${encodeURIComponent(solicitud.nombre_solicitante)}`);
                             }}
                             title="Abrir Chat"
                             className="hover-lift"
                           >
                             <MessageCircle className="w-4 h-4" />
                           </Button>
                         )}
                          
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               navigate('/solicitudes');
                             }}
                             title="Ver Detalles"
                             className="hover-lift"
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Mostrar solicitudes de la tabla 'requests' */}
                {getFilteredRequests().map((request) => {
                  const artist = artists.find(a => a.id === request.artist_id);
                  
                  return (
                    <div 
                      key={request.id}
                      data-request-id={request.id}
                      className={`card-interactive hover-glow group animate-fade-in ${
                        isOverdue(request.due_date, request.status) 
                          ? 'border-destructive/20 bg-destructive/5' 
                          : ''
                      }`}
                      style={{ 
                        transition: 'all 0.3s ease-out',
                        animation: 'fade-in 0.3s ease-out'
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-secondary rounded-xl flex items-center justify-center">
                              <span className="text-white text-lg">{getTypeIcon(request.type)}</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                {request.title}
                              </h3>
                              <div className={getStatusBadge(request.status).className}>
                                {getStatusBadge(request.status).icon}
                                <span>{getStatusBadge(request.status).text}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm text-muted-foreground">Artista:</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-sm font-medium hover-lift"
                              onClick={() => openArtistInfo(request.artist_id)}
                            >
                              <User className="w-3 h-3 mr-1" />
                              {artist?.full_name || 'No asignado'}
                            </Button>
                          </div>
                          
                          {request.description && (
                            <div className="bg-muted/30 p-3 rounded-lg mb-3">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {request.description}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-primary rounded-full"></div>
                              <span>Creado: {new Date(request.created_at).toLocaleDateString()}</span>
                            </div>
                            {request.due_date && (
                              <div className={`flex items-center gap-1 ${isOverdue(request.due_date, request.status) ? 'text-destructive font-medium' : ''}`}>
                                <div className={`w-1 h-1 rounded-full ${isOverdue(request.due_date, request.status) ? 'bg-destructive' : 'bg-secondary'}`}></div>
                                <span>Vence: {new Date(request.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Acciones directas */}
                          {request.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAddToCalendar(request)}
                              title="Añadir al Calendario"
                              className="hover-lift"
                            >
                              <CalendarPlus className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateRequestStatus(request.id, 'archived')}
                            title="Archivar"
                            className="hover-lift"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openChat(request.artist_id, request.title)}
                            title="Abrir Chat"
                            className="hover-lift"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditRequest(request)}
                            title="Editar"
                            className="hover-lift"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(request.id, request.title)}
                            title="Eliminar"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 hover-lift"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {isOverdue(request.due_date, request.status) && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-3">
                          <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>¡Fecha vencida!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="artists">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Lista de Artistas</h2>
              <InviteArtistDialog onArtistInvited={fetchData} />
            </div>
            
            {artists.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No hay artistas registrados en el sistema.</p>
                  <p className="text-sm text-muted-foreground">
                    Invita artistas para empezar a gestionar solicitudes y eventos.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {artists.map((artist) => (
                  <Card key={artist.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {artist.full_name}
                      </CardTitle>
                      <CardDescription>{artist.email}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Resumen de Eventos</h2>
              <div className="flex gap-2">
                <Select value={eventTimeframe} onValueChange={(value: 'day' | 'week' | 'month') => setEventTimeframe(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Hoy</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {getFilteredEvents().length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">
                    No hay eventos programados para {eventTimeframe === 'day' ? 'hoy' : eventTimeframe === 'week' ? 'esta semana' : 'este mes'}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Visita la sección de <strong>Calendario</strong> para crear eventos.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getFilteredEvents().map((event) => {
                    const artist = artists.find(a => a.id === event.artist_id);
                    const startDate = new Date(event.start_date);
                    const isToday = startDate.toDateString() === new Date().toDateString();
                    const isThisWeek = startDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    
                    return (
                      <Card key={event.id} className={isToday ? 'border-primary' : ''}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getEventTypeIcon(event.event_type)}</span>
                              <div>
                                <CardTitle className="text-lg">{event.title}</CardTitle>
                                <CardDescription>
                                  {artist?.full_name || 'Artista no encontrado'}
                                </CardDescription>
                              </div>
                            </div>
                            {isToday && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                Hoy
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>
                              {startDate.toLocaleDateString()} - {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          <Badge variant="outline" className="w-fit">
                            {event.event_type}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                
                <Card>
                  <CardContent className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Ver todos los eventos en <strong>Calendario</strong> para gestión completa.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ... keep existing code (financial content) */}
        <TabsContent value="financial">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Gestión Financiera</h2>
            
            {/* Resumen de ingresos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">Este mes</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Live Performance</CardTitle>
                  <Music className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">Conciertos y shows</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Royalties</CardTitle>
                  <Headphones className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">Streaming + mechanical</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sincronización</CardTitle>
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">TV, cine, publicidad</p>
                </CardContent>
              </Card>
            </div>

            {/* Categorías financieras */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Live Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Live Performance
                  </CardTitle>
                  <CardDescription>Conciertos, giras y actuaciones en directo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Gira principal</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Festivales</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conciertos únicos</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Eventos privados</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nuevo Show
                  </Button>
                </CardContent>
              </Card>

              {/* Performance Royalties */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="w-5 h-5" />
                    Performance Royalties
                  </CardTitle>
                  <CardDescription>Streaming, radio, TV y ejecución pública</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spotify (PRO)</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Radio/TV</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Venues públicos</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Streaming internacional</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Registrar Royalty
                  </Button>
                </CardContent>
              </Card>

              {/* Mechanical Royalties */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Mechanical Royalties
                  </CardTitle>
                  <CardDescription>Downloads, streams y reproducciones físicas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Streaming mechanicals</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Digital downloads</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ventas físicas</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Covers/samples</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Registrar Mechanical
                  </Button>
                </CardContent>
              </Card>

              {/* Sync Licensing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="w-5 h-5" />
                    Sync Licensing
                  </CardTitle>
                  <CardDescription>Sincronización en medios audiovisuales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>TV/Series</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cine/Documentales</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Publicidad/Brands</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Videojuegos</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nuevo Sync
                  </Button>
                </CardContent>
              </Card>

              {/* Merchandising */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Merchandising
                  </CardTitle>
                  <CardDescription>Productos físicos y digitales del artista</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Ropa/Accesorios</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Vinilos/CDs</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Productos digitales</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ediciones limitadas</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Registrar Venta
                  </Button>
                </CardContent>
              </Card>

              {/* Brand Partnerships */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Brand Partnerships
                  </CardTitle>
                  <CardDescription>Patrocinios, endorsements y colaboraciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Endorsements</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Patrocinios</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Colaboraciones</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ambassadorships</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nuevo Partnership
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Otros ingresos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Otros Ingresos
                </CardTitle>
                <CardDescription>Masterclasses, sesiones de estudio, features y otros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Features/Collabs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Sesiones estudio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Masterclasses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Fan subscriptions</div>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Registrar Ingreso
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditRequestDialog
        request={editRequestDialog.request}
        open={editRequestDialog.open}
        onOpenChange={(open) => setEditRequestDialog({ open, request: null })}
        onRequestUpdated={handleRequestUpdated}
      />

      <AddToCalendarDialog
        request={addToCalendarDialog.request}
        open={addToCalendarDialog.open}
        onOpenChange={(open) => setAddToCalendarDialog({ open, request: null })}
        onEventCreated={handleEventCreated}
      />

      <ArtistInfoDialog
        artistId={artistInfoDialog.artistId}
        open={artistInfoDialog.open}
        onOpenChange={(open) => setArtistInfoDialog({ open, artistId: null })}
        onChatOpen={(artistId) => {
          setArtistInfoDialog({ open: false, artistId: null });
          navigate(`/chat?artist=${artistId}`);
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Eliminar Solicitud"
        description={`¿Estás seguro de que quieres eliminar la solicitud "${deleteDialog.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
        onConfirm={deleteRequest}
      />

      {/* Artist Profile Dialog */}
      <ArtistProfileDialog
        open={artistProfileDialog.open}
        onOpenChange={(open) => setArtistProfileDialog(prev => ({ ...prev, open }))}
        artistId={artistProfileDialog.artistId}
      />

      {/* Template Dialog */}
      <CreateSolicitudFromTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onSuccess={fetchData}
      />

      {/* Solicitud Details Dialog */}
      <SolicitudDetailsDialog
        open={solicitudDetailsDialog.open}
        onOpenChange={(open) => setSolicitudDetailsDialog({ open, solicitudId: null })}
        solicitudId={solicitudDetailsDialog.solicitudId}
        onUpdate={fetchData}
      />
    </div>
  );
}