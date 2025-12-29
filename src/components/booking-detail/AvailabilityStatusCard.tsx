import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Link as LinkIcon,
  Copy,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilityRequest {
  id: string;
  status: string;
  block_confirmation: boolean;
  deadline: string | null;
  notes: string | null;
  share_token: string | null;
  created_at: string;
}

interface AvailabilityResponse {
  id: string;
  contact_id: string | null;
  responder_name: string | null;
  status: string;
  response_notes: string | null;
  responded_at: string | null;
}

interface AvailabilityStatusCardProps {
  bookingId: string;
  onRequestAvailability: () => void;
  canConfirm: boolean;
  onBlockStatusChange: (blocked: boolean) => void;
}

export function AvailabilityStatusCard({
  bookingId,
  onRequestAvailability,
  canConfirm,
  onBlockStatusChange
}: AvailabilityStatusCardProps) {
  const [request, setRequest] = useState<AvailabilityRequest | null>(null);
  const [responses, setResponses] = useState<AvailabilityResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, [bookingId]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      // Get the latest open request for this booking
      const { data: requests } = await supabase
        .from('booking_availability_requests')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (requests && requests.length > 0) {
        const req = requests[0] as unknown as AvailabilityRequest;
        setRequest(req);

        // Get all responses for this request
        const { data: resps } = await supabase
          .from('booking_availability_responses')
          .select('*')
          .eq('request_id', req.id);

        setResponses((resps || []) as unknown as AvailabilityResponse[]);

        // Check if there are any unavailable responses with blocking enabled
        const hasConflicts = (resps || []).some((r: any) => r.status === 'unavailable');
        onBlockStatusChange(req.block_confirmation && hasConflicts);
      } else {
        setRequest(null);
        setResponses([]);
        onBlockStatusChange(false);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'unavailable':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'tentative':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'unavailable':
        return 'No disponible';
      case 'tentative':
        return 'Tentativo';
      default:
        return 'Pendiente';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'available':
        return 'default';
      case 'unavailable':
        return 'destructive';
      case 'tentative':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const copyShareLink = () => {
    if (!request?.share_token) return;
    const link = `${window.location.origin}/availability/${request.share_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Enlace copiado');
  };

  const handleUpdateResponse = async (responseId: string, newStatus: 'pending' | 'available' | 'unavailable' | 'tentative') => {
    try {
      await supabase
        .from('booking_availability_responses')
        .update({ 
          status: newStatus,
          responded_at: new Date().toISOString()
        })
        .eq('id', responseId);

      toast.success('Estado actualizado');
      fetchAvailability();
    } catch (error) {
      console.error('Error updating response:', error);
      toast.error('Error al actualizar');
    }
  };

  const stats = {
    total: responses.length,
    available: responses.filter(r => r.status === 'available').length,
    unavailable: responses.filter(r => r.status === 'unavailable').length,
    pending: responses.filter(r => r.status === 'pending').length,
    tentative: responses.filter(r => r.status === 'tentative').length
  };

  const allAvailable = stats.pending === 0 && stats.unavailable === 0 && stats.total > 0;
  const hasConflicts = stats.unavailable > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Cargando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Disponibilidad del Equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No se ha solicitado disponibilidad al equipo para este evento.
          </p>
          <Button onClick={onRequestAvailability} className="w-full" variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Solicitar Disponibilidad
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      hasConflicts && request.block_confirmation && 'border-destructive/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Disponibilidad del Equipo
          </CardTitle>
          <div className="flex items-center gap-1">
            {allAvailable && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Todos OK
              </Badge>
            )}
            {hasConflicts && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                {stats.unavailable} conflicto(s)
              </Badge>
            )}
            {stats.pending > 0 && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {stats.pending} pendiente(s)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress summary */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Respuestas</span>
          <span className="font-medium">
            {stats.available + stats.unavailable + stats.tentative} / {stats.total}
          </span>
        </div>

        {/* Deadline */}
        {request.deadline && (
          <div className="text-xs text-muted-foreground">
            Fecha límite: {format(new Date(request.deadline), 'PPP', { locale: es })}
          </div>
        )}

        <Separator />

        {/* Response list */}
        <ScrollArea className="h-40">
          <div className="space-y-2">
            {responses.map(response => (
              <div
                key={response.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(response.status)}
                  <span className="text-sm font-medium">
                    {response.responder_name || 'Sin nombre'}
                  </span>
                </div>
                <Badge variant={getStatusBadgeVariant(response.status)}>
                  {getStatusLabel(response.status)}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={copyShareLink}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copiar enlace
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAvailability}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Warning if blocking confirmation */}
        {hasConflicts && request.block_confirmation && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-destructive">Confirmación bloqueada</p>
                <p className="text-muted-foreground">
                  Hay {stats.unavailable} miembro(s) no disponible(s). Resuelve los conflictos para poder confirmar.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Proceed anyway option */}
        {hasConflicts && request.block_confirmation && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={async () => {
              await supabase
                .from('booking_availability_requests')
                .update({ block_confirmation: false })
                .eq('id', request.id);
              toast.success('Bloqueo desactivado - puedes confirmar con aviso');
              fetchAvailability();
            }}
          >
            Continuar con aviso (desactivar bloqueo)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}