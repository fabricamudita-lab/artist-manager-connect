import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ExternalLink, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Solicitud {
  id: string;
  tipo: string;
  nombre_solicitante: string;
  nombre_festival: string | null;
  estado: string;
  fecha_creacion: string;
}

interface LinkedSolicitudesCardProps {
  bookingId: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pendiente: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  aprobada: { label: 'Aprobada', variant: 'default', icon: CheckCircle },
  denegada: { label: 'Denegada', variant: 'destructive', icon: XCircle },
};

export function LinkedSolicitudesCard({ bookingId }: LinkedSolicitudesCardProps) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSolicitudes();
  }, [bookingId]);

  const fetchSolicitudes = async () => {
    try {
      // Query the solicitudes table (legacy) where booking_id matches
      const { data, error } = await supabase
        .from('solicitudes')
        .select('id, tipo, nombre_solicitante, nombre_festival, estado, fecha_creacion')
        .eq('booking_id', bookingId)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error fetching linked solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSolicitud = (solicitudId: string) => {
    navigate(`/solicitudes?id=${solicitudId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || statusConfig.pendiente;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" />
          Solicitudes Vinculadas
          {solicitudes.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {solicitudes.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {solicitudes.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No hay solicitudes vinculadas a este booking
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/solicitudes')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ir a Action Center
            </Button>
          </div>
        ) : (
          solicitudes.map((solicitud) => {
            const statusInfo = getStatusInfo(solicitud.estado);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={solicitud.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleOpenSolicitud(solicitud.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {solicitud.nombre_festival || solicitud.nombre_solicitante}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={statusInfo.variant} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(solicitud.fecha_creacion), "d MMM yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
