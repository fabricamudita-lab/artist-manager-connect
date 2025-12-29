import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  Circle, 
  Users, 
  Truck, 
  Wrench,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ViabilityChecksCardProps {
  bookingId: string;
  phase: string;
  viabilityManagerApproved?: boolean;
  viabilityManagerAt?: string;
  viabilityTourManagerApproved?: boolean;
  viabilityTourManagerAt?: string;
  viabilityProductionApproved?: boolean;
  viabilityProductionAt?: string;
  viabilityNotes?: string;
  onUpdate: () => void;
}

export function ViabilityChecksCard({
  bookingId,
  phase,
  viabilityManagerApproved = false,
  viabilityManagerAt,
  viabilityTourManagerApproved = false,
  viabilityTourManagerAt,
  viabilityProductionApproved = false,
  viabilityProductionAt,
  viabilityNotes = '',
  onUpdate
}: ViabilityChecksCardProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState(viabilityNotes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  const allApproved = viabilityManagerApproved && viabilityTourManagerApproved && viabilityProductionApproved;
  const approvalCount = [viabilityManagerApproved, viabilityTourManagerApproved, viabilityProductionApproved].filter(Boolean).length;
  
  // Only show for negociación phase or later
  const isNegociacion = phase === 'negociacion';
  const canEdit = isNegociacion;

  const handleToggleApproval = async (field: 'manager' | 'tour_manager' | 'production', currentValue: boolean) => {
    if (!canEdit) {
      toast({
        title: "No se puede modificar",
        description: "Las aprobaciones solo se pueden modificar en fase de negociación.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(field);
    try {
      const updateData: Record<string, any> = {};
      const fieldName = `viability_${field}_approved`;
      const timestampField = `viability_${field}_at`;
      
      updateData[fieldName] = !currentValue;
      updateData[timestampField] = !currentValue ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('booking_offers')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: !currentValue ? "Aprobación registrada" : "Aprobación retirada",
        description: `Viabilidad ${field === 'manager' ? 'Manager' : field === 'tour_manager' ? 'Tour Manager' : 'Producción'} ${!currentValue ? 'aprobada' : 'pendiente'}.`
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating viability:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la aprobación.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('booking_offers')
        .update({ viability_notes: notes })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Notas guardadas",
        description: "Las notas de viabilidad se han guardado correctamente."
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas.",
        variant: "destructive"
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!allApproved) {
      toast({
        title: "No se puede confirmar",
        description: "Faltan aprobaciones de viabilidad.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('booking_offers')
        .update({ 
          phase: 'confirmado',
          estado: 'confirmado'
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "¡Booking confirmado!",
        description: "El concierto ha sido confirmado exitosamente."
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error confirming booking:', error);

      let errorMessage = error?.message || "No se pudo confirmar el booking.";
      // Default to viability section for viability errors, availability for availability conflicts
      let bookingLink = `/booking/${bookingId}?scrollTo=viability`;

      try {
        if (error?.message?.includes('AVAILABILITY_CONFLICT|')) {
          const parts = error.message.split('AVAILABILITY_CONFLICT|')[1]?.split('|');
          if (parts && parts.length >= 4) {
            const [, bookingName, artistName] = parts;
            const displayName = artistName ? `${bookingName} (${artistName})` : bookingName;
            errorMessage = `Solicitud de disponibilidad pendiente: ${displayName}`;
            bookingLink = `/booking/${bookingId}?scrollTo=availability`;
          }
        } else if (error?.message?.includes('No se puede confirmar:')) {
          const reason = error.message.match(/No se puede confirmar:\s*(.+)/)?.[1] || '';
          const { data } = await supabase
            .from('booking_offers')
            .select('festival_ciclo, venue, lugar, artist:artists(stage_name,name)')
            .eq('id', bookingId)
            .maybeSingle();

          const bookingName = (data as any)?.festival_ciclo || (data as any)?.venue || (data as any)?.lugar || 'Booking';
          const artistLabel = (data as any)?.artist?.stage_name || (data as any)?.artist?.name || '';
          const displayName = artistLabel ? `${bookingName} (${artistLabel})` : bookingName;
          errorMessage = `Solicitud de booking: ${displayName} — ${reason || 'Faltan aprobaciones o hay bloqueos activos.'}`;
        }
      } catch {
        // ignore secondary fetch errors; keep base message
      }

      toast({
        title: "Error al confirmar",
        description: (
          <span>
            {errorMessage}.{' '}
            <a
              href={bookingLink}
              className="underline font-medium hover:text-primary"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = bookingLink;
              }}
            >
              Ver solicitud →
            </a>
          </span>
        ),
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    return format(new Date(timestamp), "d MMM, HH:mm", { locale: es });
  };

  const CheckItem = ({ 
    label, 
    icon: Icon, 
    approved, 
    timestamp,
    field,
    color
  }: { 
    label: string; 
    icon: any; 
    approved: boolean; 
    timestamp?: string;
    field: 'manager' | 'tour_manager' | 'production';
    color: string;
  }) => (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        approved 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-muted/30 border-border hover:bg-muted/50'
      } ${canEdit ? 'cursor-pointer' : 'opacity-75'}`}
      onClick={() => canEdit && handleToggleApproval(field, approved)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${approved ? 'bg-green-500/20' : `bg-${color}/20`}`}>
          <Icon className={`h-4 w-4 ${approved ? 'text-green-600' : `text-${color}`}`} />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          {timestamp && approved && (
            <p className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isUpdating === field ? (
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : approved ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  // Don't show if not in negociación or later phases
  if (!['negociacion', 'confirmado', 'facturado'].includes(phase)) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Las verificaciones de viabilidad estarán disponibles cuando el booking pase a fase de <strong>Negociación</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {allApproved ? <Unlock className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5" />}
            Viabilidad
          </CardTitle>
          <Badge variant={allApproved ? "default" : "secondary"} className={allApproved ? "bg-green-600" : ""}>
            {approvalCount}/3
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CheckItem 
          label="Manager" 
          icon={Users} 
          approved={viabilityManagerApproved} 
          timestamp={viabilityManagerAt}
          field="manager"
          color="primary"
        />
        <CheckItem 
          label="Tour Manager" 
          icon={Truck} 
          approved={viabilityTourManagerApproved} 
          timestamp={viabilityTourManagerAt}
          field="tour_manager"
          color="blue-600"
        />
        <CheckItem 
          label="Producción" 
          icon={Wrench} 
          approved={viabilityProductionApproved} 
          timestamp={viabilityProductionAt}
          field="production"
          color="orange-600"
        />

        {/* Notes section */}
        <div className="pt-3 border-t space-y-2">
          <label className="text-sm font-medium">Notas de viabilidad</label>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setHasChanged(true);
            }}
            placeholder="Añade notas sobre la viabilidad logística, técnica o económica..."
            className="min-h-[80px] text-sm"
            disabled={!canEdit}
          />
          {hasChanged && (
            <Button 
              size="sm" 
              onClick={() => {
                handleSaveNotes();
                setHasChanged(false);
              }} 
              disabled={isSavingNotes}
              className="w-full"
            >
              {isSavingNotes ? 'Guardando...' : 'Guardar notas'}
            </Button>
          )}
        </div>

        {/* Confirm button */}
        {isNegociacion && (
          <div className="pt-3 border-t">
            {allApproved ? (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleConfirmBooking}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Booking
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Faltan {3 - approvalCount} aprobación(es) para confirmar</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
