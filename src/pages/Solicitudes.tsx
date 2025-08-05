import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Calendar, MessageCircle, Edit, Trash2, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreateSolicitudDialog } from '@/components/CreateSolicitudDialog';
import { EditSolicitudDialog } from '@/components/EditSolicitudDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'otro';
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

const statusConfig = {
  pendiente: { label: 'Pendiente', color: 'bg-muted text-muted-foreground', icon: '⏳' },
  aprobada: { label: 'Aprobada', color: 'bg-green-500/10 text-green-600', icon: '✅' },
  denegada: { label: 'Denegada', color: 'bg-red-500/10 text-red-600', icon: '❌' },
};

const typeConfig = {
  entrevista: { label: 'Entrevista', icon: '📻' },
  booking: { label: 'Booking', icon: '🎤' },
  otro: { label: 'Otro', icon: '📌' },
};

export default function Solicitudes() {
  const { profile } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterArtist, setFilterArtist] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [artists, setArtists] = useState<any[]>([]);

  useEffect(() => {
    fetchSolicitudes();
    fetchArtists();
  }, []);

  useEffect(() => {
    filterSolicitudes();
  }, [solicitudes, activeTab, searchTerm, filterType, filterArtist]);

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

  const fetchArtists = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .contains('roles', ['artist']);
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const filterSolicitudes = () => {
    let filtered = [...solicitudes];

    // Filter by tab
    if (activeTab !== 'todas') {
      filtered = filtered.filter(s => s.estado === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.nombre_solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(s => s.tipo === filterType);
    }

    // Filter by artist
    if (filterArtist !== 'all') {
      filtered = filtered.filter(s => s.artist_id === filterArtist);
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

  const handleDelete = async (solicitudId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta solicitud?')) return;

    try {
      const { error } = await supabase
        .from('solicitudes')
        .delete()
        .eq('id', solicitudId);

      if (error) throw error;

      toast({
        title: "Solicitud eliminada",
        description: "La solicitud se ha eliminado correctamente.",
      });

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

  const renderSolicitudCard = (solicitud: Solicitud) => {
    const config = statusConfig[solicitud.estado];
    const typeInfo = typeConfig[solicitud.tipo];
    const isOverdue = new Date(solicitud.fecha_actualizacion) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && 
                     (solicitud.estado === 'pendiente');

    return (
      <Card key={solicitud.id} className={`transition-all hover:shadow-md ${isOverdue ? 'border-red-200 bg-red-50/30' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{typeInfo.icon}</span>
                <CardTitle className="text-base">{solicitud.nombre_solicitante}</CardTitle>
                <Badge className={config.color}>
                  {config.icon} {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {typeInfo.label} • {format(new Date(solicitud.fecha_creacion), 'dd MMM yyyy', { locale: es })}
              </p>
              {solicitud.profiles?.full_name && (
                <p className="text-sm font-medium text-primary">
                  Artista: {solicitud.profiles.full_name}
                </p>
              )}
              {isOverdue && (
                <p className="text-sm text-red-600 font-medium">⚠️ Fecha vencida</p>
              )}
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSolicitud(solicitud);
                  setShowEditDialog(true);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(solicitud.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {solicitud.observaciones && (
            <p className="text-sm text-muted-foreground">{solicitud.observaciones}</p>
          )}

          {/* Información específica por tipo */}
          {solicitud.tipo === 'entrevista' && (solicitud.medio || solicitud.nombre_programa) && (
            <div className="text-sm space-y-1">
              {solicitud.medio && <p><strong>Medio:</strong> {solicitud.medio}</p>}
              {solicitud.nombre_programa && <p><strong>Programa:</strong> {solicitud.nombre_programa}</p>}
              {solicitud.hora_entrevista && (
                <p><strong>Fecha:</strong> {format(new Date(solicitud.hora_entrevista), 'dd/MM/yyyy HH:mm')}</p>
              )}
            </div>
          )}

          {solicitud.tipo === 'booking' && (solicitud.nombre_festival || solicitud.lugar_concierto) && (
            <div className="text-sm space-y-1">
              {solicitud.nombre_festival && <p><strong>Festival:</strong> {solicitud.nombre_festival}</p>}
              {solicitud.lugar_concierto && <p><strong>Lugar:</strong> {solicitud.lugar_concierto}</p>}
              {solicitud.ciudad && <p><strong>Ciudad:</strong> {solicitud.ciudad}</p>}
              {solicitud.hora_show && (
                <p><strong>Fecha:</strong> {format(new Date(solicitud.hora_show), 'dd/MM/yyyy HH:mm')}</p>
              )}
            </div>
          )}

          {solicitud.tipo === 'otro' && solicitud.descripcion_libre && (
            <p className="text-sm"><strong>Descripción:</strong> {solicitud.descripcion_libre}</p>
          )}

          {/* Acciones rápidas */}
          <div className="flex gap-2 pt-2">
            <Select
              value={solicitud.estado}
              onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => 
                handleStatusChange(solicitud.id, value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                <SelectItem value="aprobada">✅ Aprobada</SelectItem>
                <SelectItem value="denegada">❌ Denegada</SelectItem>
              </SelectContent>
            </Select>

            {solicitud.estado === 'aprobada' && (
              <Button size="sm" variant="outline">
                <Calendar className="w-4 h-4 mr-1" />
                Calendario
              </Button>
            )}

            <Button size="sm" variant="outline">
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Solicitudes</h1>
          <p className="text-muted-foreground">Gestiona todas las solicitudes de entrevistas, bookings y más</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar solicitudes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="entrevista">📻 Entrevista</SelectItem>
                <SelectItem value="booking">🎤 Booking</SelectItem>
                <SelectItem value="otro">📌 Otro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterArtist} onValueChange={setFilterArtist}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por artista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los artistas</SelectItem>
                {artists.map((artist) => (
                  <SelectItem key={artist.id} value={artist.id}>
                    {artist.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todas">Todas ({solicitudes.length})</TabsTrigger>
          <TabsTrigger value="pendiente">
            ⏳ Pendientes ({solicitudes.filter(s => s.estado === 'pendiente').length})
          </TabsTrigger>
          <TabsTrigger value="aprobada">
            ✅ Aprobadas ({solicitudes.filter(s => s.estado === 'aprobada').length})
          </TabsTrigger>
          <TabsTrigger value="denegada">
            ❌ Denegadas ({solicitudes.filter(s => s.estado === 'denegada').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredSolicitudes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-medium mb-2">No hay solicitudes</h3>
                  <p>No se encontraron solicitudes que coincidan con los filtros aplicados.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSolicitudes.map(renderSolicitudCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateSolicitudDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSolicitudCreated={fetchSolicitudes}
      />

      <EditSolicitudDialog
        solicitud={selectedSolicitud}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSolicitudUpdated={fetchSolicitudes}
      />
    </div>
  );
}