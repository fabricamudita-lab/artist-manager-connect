import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Calendar, MessageCircle, Edit, Trash2, FileDown, AlertTriangle, ClipboardList, Grid, List, User, FileText, Mic, HelpCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreateSolicitudDialog } from '@/components/CreateSolicitudDialog';
import { CreateSolicitudFromTemplateDialog } from '@/components/CreateSolicitudFromTemplateDialog';
import { EditSolicitudDialog } from '@/components/EditSolicitudDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ArtistProfileDialog } from '@/components/ArtistProfileDialog';
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

const statusConfig = {
  pendiente: { label: 'Pendiente', color: 'bg-muted text-muted-foreground', icon: '⏳' },
  aprobada: { label: 'Aprobada', color: 'bg-green-500/10 text-green-600', icon: '✅' },
  denegada: { label: 'Denegada', color: 'bg-red-500/10 text-red-600', icon: '❌' },
};

const typeConfig = {
  entrevista: { label: 'Entrevista', icon: '📻' },
  booking: { label: 'Booking', icon: '🎤' },
  consulta: { label: 'Consulta', icon: '💬' },
  informacion: { label: 'Información', icon: 'ℹ️' },
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
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; solicitudId: string; nombre: string }>({
    open: false,
    solicitudId: '',
    nombre: ''
  });
  const [artistProfileDialog, setArtistProfileDialog] = useState<{ open: boolean; artistId: string | null }>({
    open: false,
    artistId: null
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

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

  // Helper functions for styling and content
  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'booking': return '🎤';
      case 'entrevista': return '🎙️';
      case 'consulta': return '💬';
      case 'informacion': return 'ℹ️';
      default: return '📄';
    }
  };

  const getTypeStyles = (tipo: string) => {
    switch (tipo) {
      case 'booking': return { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', border: 'border-blue-200' };
      case 'entrevista': return { bg: 'bg-gradient-to-br from-green-500 to-green-600', border: 'border-green-200' };
      case 'consulta': return { bg: 'bg-gradient-to-br from-purple-500 to-purple-600', border: 'border-purple-200' };
      case 'informacion': return { bg: 'bg-gradient-to-br from-orange-500 to-orange-600', border: 'border-orange-200' };
      default: return { bg: 'bg-gradient-to-br from-slate-500 to-slate-600', border: 'border-slate-200' };
    }
  };

  const getStatusDot = (estado: string) => {
    switch (estado) {
      case 'aprobada': return 'bg-green-500';
      case 'pendiente': return 'bg-yellow-500';
      case 'denegada': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getMainContent = (solicitud: any) => {
    // Extract main content based on type
    if (solicitud.tipo === 'booking') {
      return solicitud.nombre_festival || solicitud.lugar_concierto || 'Evento sin nombre';
    } else if (solicitud.tipo === 'entrevista') {
      return solicitud.nombre_programa || solicitud.medio || 'Entrevista';
    } else if (solicitud.descripcion_libre) {
      // For consulta/informacion types, try to extract meaningful content
      const lines = solicitud.descripcion_libre.split('\n');
      for (const line of lines) {
        if (line.includes(':') && !line.includes('No especificado')) {
          const content = line.split(':')[1]?.trim();
          if (content && content !== 'No especificado') {
            return content;
          }
        }
      }
    }
    return `${solicitud.tipo.charAt(0).toUpperCase() + solicitud.tipo.slice(1)} - ${solicitud.nombre_solicitante}`;
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

  const openArtistProfile = (artistId: string) => {
    setArtistProfileDialog({ open: true, artistId });
  };

  const renderSolicitudCard = (solicitud: Solicitud) => {
    const config = statusConfig[solicitud.estado];
    const typeInfo = typeConfig[solicitud.tipo as keyof typeof typeConfig];
    const isOverdue = new Date(solicitud.fecha_actualizacion) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && 
                     (solicitud.estado === 'pendiente');

    return (
      <Card key={solicitud.id} className={`card-interactive transition-all duration-300 ${isOverdue ? 'border-destructive/50 bg-destructive/5 shadow-glow' : 'hover:shadow-medium'}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-lg">
                  <span className="text-2xl">{typeInfo.icon}</span>
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-xl font-semibold text-gradient-primary">{solicitud.nombre_solicitante}</CardTitle>
                  <Badge className={`${config.color} badge-info mt-1 w-fit`}>
                    {config.icon} {config.label}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {typeInfo.label} • {format(new Date(solicitud.fecha_creacion), 'dd MMM yyyy', { locale: es })}
              </p>
              {solicitud.profiles?.full_name && (
                <button 
                  onClick={() => openArtistProfile(solicitud.artist_id!)}
                  className="text-sm font-medium text-primary hover:text-primary-glow transition-colors cursor-pointer"
                >
                  Artista: {solicitud.profiles.full_name} →
                </button>
              )}
              {isOverdue && (
                <p className="text-sm text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Fecha vencida
                </p>
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
                className="hover-lift"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteDialog(solicitud.id, solicitud.nombre_solicitante)}
                className="hover-lift text-destructive hover:text-destructive"
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
                <Calendar className="w-4 h-4" />
              </Button>
            )}

            <Button size="sm" variant="outline">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSolicitudTable = () => {
    return (
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 bg-muted/30">
              {filterType === 'all' && (
                <TableHead className="font-semibold text-foreground/90 py-4 px-6">
                  Tipo
                </TableHead>
              )}
              <TableHead className="font-semibold text-foreground/90 py-4 px-6">
                Artista
              </TableHead>
              <TableHead className="font-semibold text-foreground/90 py-4 px-6">
                Fecha
              </TableHead>
              <TableHead className="font-semibold text-foreground/90 py-4 px-6">
                Detalles
              </TableHead>
              <TableHead className="font-semibold text-foreground/90 py-4 px-6">
                Estado
              </TableHead>
              <TableHead className="font-semibold text-foreground/90 py-4 px-6 text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSolicitudes.map((solicitud, index) => {
              const config = statusConfig[solicitud.estado];
              const typeInfo = typeConfig[solicitud.tipo as keyof typeof typeConfig];
              const isOverdue = new Date(solicitud.fecha_actualizacion) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && 
                               (solicitud.estado === 'pendiente');

              return (
                <TableRow 
                  key={solicitud.id} 
                  className={`
                    border-b border-border/30 transition-all duration-200 hover:bg-muted/50
                    ${isOverdue ? 'bg-destructive/5 border-destructive/20' : ''}
                    ${index === filteredSolicitudes.length - 1 ? 'border-b-0' : ''}
                  `}
                >
                  {filterType === 'all' && (
                    <TableCell className="py-6 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${getTypeStyles(solicitud.tipo).bg}
                        `}>
                          <span className="text-white text-sm">
                            {getTypeIcon(solicitud.tipo)}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">
                          {typeInfo.label}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  
                  <TableCell className="py-6 px-6">
                    <div className="space-y-1">
                      {solicitud.profiles?.full_name ? (
                        <button 
                          onClick={() => openArtistProfile(solicitud.artist_id!)}
                          className="font-medium text-primary hover:text-primary/80 transition-colors text-left"
                        >
                          {solicitud.profiles.full_name}
                        </button>
                      ) : (
                        <span className="text-muted-foreground font-medium">Sin asignar</span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {solicitud.nombre_solicitante}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-6 px-6">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {format(new Date(solicitud.fecha_creacion), 'dd MMM', { locale: es })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(solicitud.fecha_creacion), 'yyyy', { locale: es })}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-6 px-6">
                    <div className="space-y-1 max-w-xs">
                      <div className="font-medium text-foreground truncate">
                        {getMainContent(solicitud)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {solicitud.tipo === 'entrevista' && solicitud.medio && solicitud.medio}
                        {solicitud.tipo === 'booking' && solicitud.ciudad && solicitud.ciudad}
                        {(solicitud.tipo === 'consulta' || solicitud.tipo === 'informacion') && 
                          solicitud.observaciones && 
                          solicitud.observaciones.substring(0, 30) + '...'
                        }
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-6 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium
                        ${solicitud.estado === 'aprobada' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : ''}
                        ${solicitud.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : ''}
                        ${solicitud.estado === 'denegada' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : ''}
                      `}>
                        {config.label}
                      </div>
                      {isOverdue && (
                        <div className="p-1 rounded-full bg-destructive/10">
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-6 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={solicitud.estado}
                        onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => 
                          handleStatusChange(solicitud.id, value)
                        }
                      >
                        <SelectTrigger className="w-8 h-8 p-0 border-0 hover:bg-muted">
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lg">⏱️</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="pendiente" className="text-yellow-600">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              Pendiente
                            </div>
                          </SelectItem>
                          <SelectItem value="aprobada" className="text-green-600">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Aprobada
                            </div>
                          </SelectItem>
                          <SelectItem value="denegada" className="text-red-600">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              Denegada
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
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
                        onClick={() => openDeleteDialog(solicitud.id, solicitud.nombre_solicitante)}
                        className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container-moodita section-spacing space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-primary rounded-2xl">
              <ClipboardList className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient-primary tracking-tight">
                Solicitudes
              </h1>
              <p className="text-muted-foreground text-lg">Gestiona todas las solicitudes de entrevistas, bookings y más</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowTemplateDialog(true)} className="btn-primary hover-lift">
              <Plus className="w-5 h-5 mr-2" />
              Nueva Solicitud
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="hover-lift">
              Solicitud Manual
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="card-moodita">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex-1 min-w-80">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar solicitudes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 py-3 text-base input-modern"
                  />
                </div>
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-52 py-3">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="entrevista">📻 Entrevista</SelectItem>
                  <SelectItem value="booking">🎤 Booking</SelectItem>
                  <SelectItem value="consulta">💬 Consulta</SelectItem>
                  <SelectItem value="informacion">ℹ️ Información</SelectItem>
                  <SelectItem value="otro">📌 Otro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterArtist} onValueChange={setFilterArtist}>
                <SelectTrigger className="w-52 py-3">
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

              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'cards' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setViewMode('cards')}
                  className="hover-lift"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'table' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setViewMode('table')}
                  className="hover-lift"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="outline" size="default" className="hover-lift">
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

        {/* Visual Type Filter Menu */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filtrar por tipo:</span>
              </div>
              {filterType !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilterType('all')}
                  className="text-xs"
                >
                  Mostrar todos
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Booking */}
              <button
                onClick={() => setFilterType('booking')}
                className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                  filterType === 'booking' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-border hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">Booking</div>
                    <div className="text-xs text-muted-foreground">
                      ({solicitudes.filter(s => s.tipo === 'booking').length})
                    </div>
                  </div>
                </div>
              </button>

              {/* Entrevista */}
              <button
                onClick={() => setFilterType('entrevista')}
                className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                  filterType === 'entrevista' 
                    ? 'border-green-500 bg-green-50 shadow-md' 
                    : 'border-border hover:border-green-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">Entrevista</div>
                    <div className="text-xs text-muted-foreground">
                      ({solicitudes.filter(s => s.tipo === 'entrevista').length})
                    </div>
                  </div>
                </div>
              </button>

              {/* Consulta */}
              <button
                onClick={() => setFilterType('consulta')}
                className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                  filterType === 'consulta' 
                    ? 'border-purple-500 bg-purple-50 shadow-md' 
                    : 'border-border hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">Consulta</div>
                    <div className="text-xs text-muted-foreground">
                      ({solicitudes.filter(s => s.tipo === 'consulta').length})
                    </div>
                  </div>
                </div>
              </button>

              {/* Información */}
              <button
                onClick={() => setFilterType('informacion')}
                className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                  filterType === 'informacion' 
                    ? 'border-orange-500 bg-orange-50 shadow-md' 
                    : 'border-border hover:border-orange-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">Información</div>
                    <div className="text-xs text-muted-foreground">
                      ({solicitudes.filter(s => s.tipo === 'informacion').length})
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

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
          ) : viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSolicitudes.map(renderSolicitudCard)}
            </div>
          ) : (
            <Card className="card-moodita">
              <CardContent className="p-0">
                {renderSolicitudTable()}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateSolicitudFromTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onSuccess={fetchSolicitudes}
      />
      
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Eliminar Solicitud"
        description={`¿Estás seguro de que quieres eliminar la solicitud "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
        onConfirm={handleDelete}
      />

      {/* Artist Profile Dialog */}
      <ArtistProfileDialog
        open={artistProfileDialog.open}
        onOpenChange={(open) => setArtistProfileDialog(prev => ({ ...prev, open }))}
        artistId={artistProfileDialog.artistId}
      />
      </div>
    </div>
  );
}