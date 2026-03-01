import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface MarcarCobradoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    festival_ciclo?: string;
    venue?: string;
    ciudad?: string;
    fee?: number;
    artist_id?: string;
    project_id?: string;
    comision_porcentaje?: number;
  };
  onSuccess?: () => void;
}

export function MarcarCobradoDialog({ open, onOpenChange, booking, onSuccess }: MarcarCobradoDialogProps) {
  const { user } = useAuth();
  const eventName = booking.festival_ciclo || booking.venue || booking.ciudad || 'Evento';
  const defaultAmount = booking.fee || 0;
  const irpfPct = 15; // Default IRPF

  const [cobroFecha, setCobroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [importeRecibido, setImporteRecibido] = useState(defaultAmount);
  const [metodo, setMetodo] = useState('transferencia');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const irpfAmount = importeRecibido * irpfPct / 100;
  const netoRecibido = importeRecibido - irpfAmount;

  const fmt = (v: number) => `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // 1. Update booking to facturado + save cobro data
      const { error: bookingError } = await supabase
        .from('booking_offers')
        .update({
          phase: 'facturado',
          estado: 'facturado',
          estado_facturacion: 'facturado',
          cobro_fecha: cobroFecha,
          cobro_importe: importeRecibido,
          cobro_metodo: metodo,
          cobro_referencia: referencia || null,
          cobro_notas: notas || null,
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // 2. Create cobro record
      const { error: cobroError } = await supabase
        .from('cobros')
        .insert({
          type: 'booking',
          concept: `Cobro concierto: ${eventName}`,
          amount_gross: importeRecibido,
          irpf_pct: irpfPct,
          amount_net: netoRecibido,
          received_date: cobroFecha,
          status: 'cobrado',
          artist_id: booking.artist_id || null,
          project_id: booking.project_id || null,
          booking_id: booking.id,
          notes: notas || null,
          created_by: user.id,
        });

      if (cobroError) throw cobroError;

      toast({
        title: '✓ Cobro registrado',
        description: `${eventName} movido a Facturado`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error registering cobro:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el cobro.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar cobro — {eventName}</DialogTitle>
          <DialogDescription>Registra los detalles del pago recibido por el evento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fecha de cobro</Label>
            <Input type="date" value={cobroFecha} onChange={e => setCobroFecha(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Importe recibido (€)</Label>
            <Input
              type="number"
              value={importeRecibido}
              onChange={e => setImporteRecibido(Number(e.target.value))}
              min={0}
            />
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">IRPF retenido por promotor ({irpfPct}%): <span className="text-destructive font-medium">-{fmt(irpfAmount)}</span></p>
              <p className="text-muted-foreground">Importe neto recibido: <span className="text-emerald-600 font-bold">{fmt(netoRecibido)}</span></p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de cobro</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Referencia/concepto bancario <span className="text-muted-foreground">(opcional)</span></Label>
            <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ref. transferencia..." />
          </div>

          <div className="space-y-2">
            <Label>Notas <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar cobro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
