import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Clock, CheckCircle, XCircle, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreateSolicitudDialog } from '@/components/CreateSolicitudDialog';
import { CreateSolicitudFromTemplateDialog } from '@/components/CreateSolicitudFromTemplateDialog';
import { EditSolicitudDialog } from '@/components/EditSolicitudDialog';
import { SolicitudDetailsDialog } from '@/components/SolicitudDetailsDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    fetchSolicitudes();
    updateExistingSolicitudesNames(); // Actualizar nombres automáticamente
  }, []);

  useEffect(() => {
    filterSolicitudes();
  }, [solicitudes, searchTerm, filterStatus, filterType]);

  const fetchSolicitudes = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes')
        .select(`
          *,
          profiles:artist_id(full_name)
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setSolicitudes((data as any) || []);
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
    
    // Remove common prefixes
    let content = text.replace(/^(Solicitud de |Tema\/proyecto:\s*|Asunto principal:\s*|Detalle\/contexto:\s*|Detalle de la solicitud:\s*)/i, '');
    
    // Split by newlines and take the first meaningful line
    const lines = content.split('\n').filter(line => line.trim().length > 3);
    if (lines.length > 0) {
      content = lines[0];
    }
    
    // Remove common words and get key terms
    const words = content.split(' ')
      .filter(word => 
        word.length > 2 && 
        !['hauriem', 'hauríem', 'de', 'el', 'la', 'que', 'per', 'amb', 'una', 'un', 'les', 'els', 'del', 'al', 'com', 'quan', 'per', 'sobre', 'si', 'saber'].includes(word.toLowerCase())
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
          name = keyContent ? `Consulta: ${keyContent}` : 'Consulta';
        } else {
          name = 'Consulta';
        }
        break;

      case 'informacion':
        if (solicitud.descripcion_libre) {
          const keyContent = extractKeyContent(solicitud.descripcion_libre);
          // For information requests, be more direct
          if (keyContent.toLowerCase().includes('single') || keyContent.toLowerCase().includes('release')) {
            name = keyContent.includes('primer') ? 'Release primer single' : 'Release single';
          } else {
            name = keyContent || 'Información';
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
            solicitud.nombre_solicitante?.includes('Consulta – Solicitud de Consulta') ||
            solicitud.nombre_solicitante?.includes('Solicitud de información – Solicitud de Información') ||
            solicitud.nombre_solicitante?.startsWith('Consulta – ') ||
            solicitud.nombre_solicitante?.startsWith('Solicitud de información – ') ||
            solicitud.nombre_solicitante?.startsWith('Consulta:') ||
            solicitud.nombre_solicitante?.startsWith('Info:');
            
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

  const filterSolicitudes = () => {
    let filtered = [...solicitudes];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.estado === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(s => s.tipo === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.nombre_solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSolicitudes(filtered);
  };

  const handleStatusChange = async (solicitudId: string, newStatus: 'pendiente' | 'aprobada' | 'denegada') => {
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
        (solicitud.observaciones ? `Observaciones: ${solicitud.observaciones}\n` : '') +
        (solicitud.tipo === 'entrevista' && solicitud.nombre_entrevistador ? `Entrevistador: ${solicitud.nombre_entrevistador}\n` : '') +
        (solicitud.tipo === 'booking' && solicitud.nombre_festival ? `Festival: ${solicitud.nombre_festival}\n` : ''),
      startDate: solicitud.tipo === 'entrevista' ? solicitud.hora_entrevista : solicitud.hora_show,
      artistId: solicitud.artist_id
    };

    // Navegar al calendario con los datos
    navigate('/calendar', { state: { createEvent: eventData } });
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
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full ${typeInfo.color} flex items-center justify-center text-white text-sm`}>
                  {typeInfo.icon}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{getMainContent(solicitud)}</CardTitle>
                  <p className="text-sm text-muted-foreground">{solicitud.nombre_solicitante}</p>
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <Select
              value={solicitud.estado}
              onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => {
                handleStatusChange(solicitud.id, value);
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

  const pendientesCount = solicitudes.filter(s => s.estado === 'pendiente').length;
  const aprobadasCount = solicitudes.filter(s => s.estado === 'aprobada').length;
  const denegadasCount = solicitudes.filter(s => s.estado === 'denegada').length;

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes</h1>
          <p className="text-muted-foreground">
            Gestiona todas las solicitudes de manera eficiente
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Nueva
          </Button>
          <Button onClick={() => setShowTemplateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Desde Plantilla
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendientesCount}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{aprobadasCount}</p>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{denegadasCount}</p>
                <p className="text-sm text-muted-foreground">Denegadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar solicitudes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="aprobada">Aprobadas</SelectItem>
            <SelectItem value="denegada">Denegadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="entrevista">🎙️ Entrevista</SelectItem>
            <SelectItem value="booking">🎤 Booking</SelectItem>
            <SelectItem value="consulta">💬 Consulta</SelectItem>
            <SelectItem value="informacion">ℹ️ Información</SelectItem>
            <SelectItem value="otro">📄 Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Solicitudes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSolicitudes.map((solicitud) => renderSolicitudCard(solicitud))}
      </div>

      {filteredSolicitudes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron solicitudes</p>
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
    </div>
  );
}