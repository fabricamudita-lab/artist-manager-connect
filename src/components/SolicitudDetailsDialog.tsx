import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin, 
  MessageSquare, 
  StickyNote,
  Building2,
  Radio,
  Users,
  Edit,
  Check,
  X,
  Archive,
  Mic,
  FileText,
  Download
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { useAuth } from '@/hooks/useAuth';
import { StatusCommentDialog } from '@/components/StatusCommentDialog';
import { ScheduleEncounterDialog } from '@/components/ScheduleEncounterDialog';
import { SolicitudHistory } from '@/components/SolicitudHistory';

interface SolicitudDetails {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  medio?: string;
  nombre_programa?: string;
  nombre_entrevistador?: string;
  nombre_festival?: string;
  lugar_concierto?: string;
  ciudad?: string;
  hora_entrevista?: string;
  hora_show?: string;
  informacion_programa?: string;
  observaciones?: string;
  notas_internas?: string;
  descripcion_libre?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  fecha_creacion: string;
  fecha_actualizacion: string;
  artist_id?: string;
  contact_id?: string;
  archivos_adjuntos?: any[];
  comentario_estado?: string | null;
  decision_por?: string | null;
  decision_fecha?: string | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface SolicitudDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: string | null;
  onUpdate?: () => void;
}

export function SolicitudDetailsDialog({ 
  open, 
  onOpenChange, 
  solicitudId, 
  onUpdate 
}: SolicitudDetailsDialogProps) {
const { fireCelebration } = useConfetti();
const { profile } = useAuth();
const [solicitud, setSolicitud] = useState<SolicitudDetails | null>(null);
const [loading, setLoading] = useState(true);
const [statusDialogOpen, setStatusDialogOpen] = useState(false);
const [pendingStatus, setPendingStatus] = useState<'aprobada' | 'denegada' | 'pendiente'>('aprobada');
const [encuentroOpen, setEncuentroOpen] = useState(false);
const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (open && solicitudId) {
      fetchSolicitudDetails();
    }
  }, [open, solicitudId]);

  const fetchSolicitudDetails = async () => {
    if (!solicitudId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes')
        .select(`
          *,
          profiles:artist_id(full_name, email)
        `)
        .eq('id', solicitudId)
        .single();

      if (error) throw error;
      setSolicitud(data as any);
    } catch (error) {
      console.error('Error fetching solicitud details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la solicitud",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

const updateSolicitudStatus = async (newStatus: 'aprobada' | 'denegada', comment?: string) => {
  if (!solicitud) return;

  const previousEstado = solicitud.estado;

  try {
    const { error } = await supabase
      .from('solicitudes')
      .update({
        estado: newStatus,
        fecha_actualizacion: new Date().toISOString(),
        comentario_estado: comment || null,
        decision_por: profile?.user_id || null,
        decision_fecha: new Date().toISOString(),
      } as any)
      .eq('id', solicitud.id);

    if (error) throw error;

    setSolicitud(prev => prev ? { ...prev, estado: newStatus, comentario_estado: comment || null } : null);
    onUpdate?.();
    
    toast({
      title: "¡Éxito!",
      description: newStatus === 'aprobada' ? "¡Solicitud aprobada! 🎉" : "Solicitud denegada correctamente",
    });

    if (previousEstado !== 'aprobada' && newStatus === 'aprobada') {
      setTimeout(() => {
        fireCelebration();
        onOpenChange(false);
      }, 300);
    } else if (newStatus === 'denegada') {
      setTimeout(() => onOpenChange(false), 1000);
    }
  } catch (error) {
    console.error('Error updating solicitud status:', error);
    toast({
      title: "Error",
      description: "No se pudo actualizar el estado de la solicitud",
      variant: "destructive"
    });
  }
};

const updateSolicitudToPending = async (comment?: string) => {
  if (!solicitud) return;

  try {
    const { error } = await supabase
      .from('solicitudes')
      .update({
        estado: 'pendiente',
        fecha_actualizacion: new Date().toISOString(),
        comentario_estado: comment || null,
        decision_por: profile?.user_id || null,
        decision_fecha: new Date().toISOString(),
      } as any)
      .eq('id', solicitud.id);

    if (error) throw error;

    setSolicitud(prev => prev ? { ...prev, estado: 'pendiente', comentario_estado: comment || null } : null);
    onUpdate?.();

    toast({
      title: 'Solicitud reabierta',
      description: 'Estado cambiado a pendiente',
    });
  } catch (error) {
    console.error('Error reopening solicitud:', error);
    toast({
      title: 'Error',
      description: 'No se pudo reabrir la solicitud',
      variant: 'destructive'
    });
  }
};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'aprobada':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'denegada':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <X className="w-3 h-3 mr-1" />
            Denegada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrevista':
        return <Radio className="w-5 h-5 text-blue-600" />;
      case 'booking':
        return <Mic className="w-5 h-5 text-purple-600" />;
      case 'consulta':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      case 'informacion':
        return <StickyNote className="w-5 h-5 text-orange-600" />;
      default:
        return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrevista':
        return 'from-blue-500 to-blue-600';
      case 'booking':
        return 'from-purple-500 to-purple-600';
      case 'consulta':
        return 'from-green-500 to-green-600';
      case 'informacion':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Formatea "YYYY-MM-DD" a "Lunes, 4 de Agosto de 2025" en español
  const formatFechaLargaEs = (dateStr: string) => {
    try {
      const d = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isNaN(d.getTime())) return dateStr;
      let s = format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      // Capitalizar primera letra y mes
      s = s.charAt(0).toUpperCase() + s.slice(1);
      const parts = s.split(' de ');
      if (parts.length >= 3) {
        parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        s = parts.join(' de ');
      }
      return s;
    } catch {
      return dateStr;
    }
  };

  // Acepta "YYYY-MM-DDTHH:mm" o "YYYY-MM-DD HH:mm" y devuelve formato largo
  const formatFechaHoraLargaEs = (dateTimeStr: string) => {
    try {
      const hasTime = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?/.test(dateTimeStr);
      if (!hasTime) return formatFechaLargaEs(dateTimeStr);
      const normalized = dateTimeStr.replace(' ', 'T');
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return dateTimeStr;
      let s = format(d, "EEEE, d 'de' MMMM 'de' yyyy HH:mm", { locale: es });
      s = s.charAt(0).toUpperCase() + s.slice(1);
      const parts = s.split(' de ');
      if (parts.length >= 3) {
        parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        s = parts.join(' de ');
      }
      return s;
    } catch {
      return dateTimeStr;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando detalles...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!solicitud) {
    return null;
  }

  // Descripción con fechas legibles para cualquier tipo (no altera datos guardados)
  const processedDescripcionLibre =
    solicitud.descripcion_libre
      ? solicitud.descripcion_libre
          .replace(
            /(^|\n)\s*Fecha y hora:\s*(\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?))/gi,
            (_m, p1, d) => `${p1}Fecha y hora: ${formatFechaHoraLargaEs(d)}`
          )
          .replace(
            /(^|\n)\s*Fecha:\s*(\d{4}-\d{2}-\d{2})/gi,
            (_m, p1, d) => `${p1}Fecha: ${formatFechaLargaEs(d)}`
          )
      : solicitud.descripcion_libre;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Detalles de la Solicitud
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                ID: {solicitud.id.slice(0, 8)}... • Creada el {new Date(solicitud.fecha_creacion).toLocaleDateString()}
              </p>
            </div>
            {getStatusBadge(solicitud.estado)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getTipoColor(solicitud.tipo)} flex items-center justify-center`}>
                  {getTipoIcon(solicitud.tipo)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {solicitud.nombre_solicitante}
                  </h3>
                  <p className="text-muted-foreground capitalize mb-2">
                    Solicitud de {solicitud.tipo.replace('_', ' ')}
                  </p>
                  {solicitud.profiles?.full_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-foreground font-medium">
                        Artista: {solicitud.profiles.full_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Contacto - Solo si hay datos */}
          {(solicitud.email || solicitud.telefono) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {solicitud.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{solicitud.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.telefono && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{solicitud.telefono}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalles por Tipo */}
          {solicitud.tipo === 'entrevista' && (solicitud.medio || solicitud.nombre_programa || solicitud.nombre_entrevistador || solicitud.hora_entrevista || solicitud.informacion_programa) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5" />
                  Detalles de la Entrevista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {solicitud.medio && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Medio</p>
                        <p className="font-medium">{solicitud.medio}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.nombre_programa && (
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Programa</p>
                        <p className="font-medium">{solicitud.nombre_programa}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.nombre_entrevistador && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Entrevistador</p>
                        <p className="font-medium">{solicitud.nombre_entrevistador}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.hora_entrevista && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                        <p className="font-medium">
                          {formatFechaHoraLargaEs(solicitud.hora_entrevista)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {solicitud.informacion_programa && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Información del Programa</p>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-sm">{solicitud.informacion_programa}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {solicitud.tipo === 'booking' && (solicitud.nombre_festival || solicitud.lugar_concierto || solicitud.ciudad || solicitud.hora_show) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Detalles del Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {solicitud.nombre_festival && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Festival/Evento</p>
                        <p className="font-medium">{solicitud.nombre_festival}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.lugar_concierto && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Lugar</p>
                        <p className="font-medium">{solicitud.lugar_concierto}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.ciudad && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ciudad</p>
                        <p className="font-medium">{solicitud.ciudad}</p>
                      </div>
                    </div>
                  )}
                  
                  {solicitud.hora_show && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha y Hora del Show</p>
                        <p className="font-medium">
                          {formatFechaHoraLargaEs(solicitud.hora_show)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observaciones y Notas */}
          {(solicitud.observaciones || solicitud.descripcion_libre || solicitud.notas_internas || solicitud.comentario_estado) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Observaciones y Notas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(solicitud.observaciones || solicitud.descripcion_libre) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Resumen</p>
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      {solicitud.observaciones && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-blue-900 mb-1">Observaciones:</p>
                          <p className="text-sm text-blue-800">{solicitud.observaciones}</p>
                        </div>
                      )}
                      {solicitud.descripcion_libre && (
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">Descripción:</p>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap">{processedDescripcionLibre}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {solicitud.notas_internas && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Notas Internas</p>
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <p className="text-sm text-yellow-800 whitespace-pre-wrap">{solicitud.notas_internas}</p>
                    </div>
                  </div>
                )}

                {solicitud.comentario_estado && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Comentario de decisión</p>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{solicitud.comentario_estado}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Información de Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Información de Fechas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                  <p className="font-medium">
                    {new Date(solicitud.fecha_creacion).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Actualización</p>
                  <p className="font-medium">
                    {new Date(solicitud.fecha_actualizacion).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historial de respuestas */}
          <div>
            <Button variant="outline" className="w-full" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? 'Ocultar historial' : 'Ver historial'}
            </Button>
          </div>
          {showHistory && <SolicitudHistory solicitudId={solicitud.id} />}


          {/* Acciones */}
          {solicitud.estado === 'pendiente' && (
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      Acciones de la Solicitud
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Aprueba o deniega esta solicitud para continuar con el proceso
                    </p>
                  </div>
                  <div className="flex gap-2">
<Button
  onClick={() => { setPendingStatus('denegada'); setStatusDialogOpen(true); }}
  variant="outline"
  className="border-red-200 text-red-700 hover:bg-red-50"
>
  <X className="w-4 h-4 mr-1" />
  Denegar
</Button>
<Button
  onClick={() => { setPendingStatus('aprobada'); setStatusDialogOpen(true); }}
  className="bg-green-600 hover:bg-green-700 text-white"
>
  <Check className="w-4 h-4 mr-1" />
  Aprobar
</Button>
<Button
  variant="outline"
  onClick={() => setEncuentroOpen(true)}
>
  <Calendar className="w-4 h-4 mr-1" />
  Organizar encuentro
</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {solicitud.estado !== 'pendiente' && (
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Reabrir solicitud</h4>
                    <p className="text-sm text-muted-foreground">Vuelve el estado a pendiente para solicitar una nueva respuesta</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setPendingStatus('pendiente'); setStatusDialogOpen(true); }}>
                      Volver a pendiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogos auxiliares */}
        <StatusCommentDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          status={pendingStatus}
          onSubmit={(comment) => {
            setStatusDialogOpen(false);
            if (pendingStatus === 'pendiente') {
              updateSolicitudToPending(comment);
            } else {
              updateSolicitudStatus(pendingStatus as 'aprobada' | 'denegada', comment);
            }
          }}
        />

        <ScheduleEncounterDialog
          open={encuentroOpen}
          onOpenChange={setEncuentroOpen}
          solicitud={{
            id: solicitud.id,
            artist_id: solicitud.artist_id,
            tipo: solicitud.tipo,
            nombre_solicitante: solicitud.nombre_solicitante,
            ciudad: solicitud.ciudad,
            medio: solicitud.medio,
            lugar_concierto: solicitud.lugar_concierto,
          }}
          onCreated={onUpdate}
        />
      </DialogContent>
    </Dialog>
  );
}