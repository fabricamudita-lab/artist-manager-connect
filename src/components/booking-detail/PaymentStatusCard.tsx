import { useState, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PagoDialog } from '@/components/PagoDialog';
import { Check, Clock, AlertTriangle, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentStatusCardProps {
  booking: {
    id: string;
    festival_ciclo?: string;
    venue?: string;
    ciudad?: string;
    fee?: number;
    artist_id?: string;
    project_id?: string;
    comision_porcentaje?: number;
    fecha?: string;
    anticipo_porcentaje?: number;
    anticipo_importe?: number;
    anticipo_estado?: string;
    anticipo_fecha_esperada?: string;
    anticipo_fecha_cobro?: string;
    anticipo_referencia?: string;
    liquidacion_importe?: number;
    liquidacion_estado?: string;
    liquidacion_fecha_esperada?: string;
    liquidacion_fecha_cobro?: string;
    liquidacion_referencia?: string;
    cobro_estado?: string;
    cobro_fecha?: string;
    cobro_importe?: number;
    cobro_referencia?: string;
  };
  highlighted?: boolean;
  onUpdate: () => void;
}

const fmt = (v: number) =>
  `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: es });
  } catch {
    return d;
  }
};

function StatusBadge({ estado, fechaEsperada }: { estado?: string; fechaEsperada?: string }) {
  if (estado === 'cobrado' || estado === 'no_aplica') {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
        <Check className="h-3 w-3 mr-1" /> Cobrado
      </Badge>
    );
  }
  const isOverdue = fechaEsperada && new Date(fechaEsperada) < new Date();
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" /> Vencido
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">
      <Clock className="h-3 w-3 mr-1" /> Pendiente
    </Badge>
  );
}

export const PaymentStatusCard = forwardRef<HTMLDivElement, PaymentStatusCardProps>(
  ({ booking, highlighted, onUpdate }, ref) => {
    const [showPago, setShowPago] = useState(false);
    const fee = booking.fee || 0;
    const cobroEstado = booking.cobro_estado;

    // Determine what state we're in
    const hasPayments = cobroEstado && cobroEstado !== 'pendiente';
    const isCobradoCompleto = cobroEstado === 'cobrado_completo';
    const isAnticipoCobrado = cobroEstado === 'anticipo_cobrado';
    const hasFraccionado = booking.anticipo_importe || booking.anticipo_estado === 'cobrado' || isAnticipoCobrado;

    return (
      <>
        <Card
          ref={ref}
          className={`transition-all ${highlighted ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Estado de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* NO PAYMENTS */}
            {!hasPayments && !hasFraccionado && (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
                <Button onClick={() => setShowPago(true)} size="sm">
                  <Banknote className="h-4 w-4 mr-2" />
                  Registrar cobro
                </Button>
              </div>
            )}

            {/* PAGO ÚNICO COBRADO */}
            {isCobradoCompleto && !hasFraccionado && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pago único</span>
                  <StatusBadge estado="cobrado" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Importe</p>
                    <p className="font-semibold">{fmt(booking.cobro_importe || fee)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha cobro</p>
                    <p className="font-medium">{fmtDate(booking.cobro_fecha)}</p>
                  </div>
                </div>
                {booking.cobro_referencia && (
                  <div>
                    <p className="text-xs text-muted-foreground">Referencia</p>
                    <p className="text-sm">{booking.cobro_referencia}</p>
                  </div>
                )}
              </div>
            )}

            {/* FRACCIONADO (anticipo + liquidación) */}
            {hasFraccionado && (
              <div className="space-y-4">
                {/* ANTICIPO */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Anticipo ({booking.anticipo_porcentaje || 50}%)
                    </span>
                    <StatusBadge
                      estado={booking.anticipo_estado}
                      fechaEsperada={booking.anticipo_fecha_esperada}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Importe</p>
                      <p className="font-semibold">{fmt(booking.anticipo_importe || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {booking.anticipo_estado === 'cobrado' ? 'Cobrado el' : 'Fecha esperada'}
                      </p>
                      <p className="font-medium">
                        {fmtDate(
                          booking.anticipo_estado === 'cobrado'
                            ? booking.anticipo_fecha_cobro
                            : booking.anticipo_fecha_esperada
                        )}
                      </p>
                    </div>
                  </div>
                  {booking.anticipo_estado !== 'cobrado' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs mt-1"
                      onClick={() => setShowPago(true)}
                    >
                      Registrar anticipo
                    </Button>
                  )}
                </div>

                {/* LIQUIDACIÓN */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Liquidación</span>
                    <StatusBadge
                      estado={booking.liquidacion_estado}
                      fechaEsperada={booking.liquidacion_fecha_esperada}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Importe</p>
                      <p className="font-semibold">{fmt(booking.liquidacion_importe || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {booking.liquidacion_estado === 'cobrado' ? 'Cobrado el' : 'Fecha esperada'}
                      </p>
                      <p className="font-medium">
                        {fmtDate(
                          booking.liquidacion_estado === 'cobrado'
                            ? booking.liquidacion_fecha_cobro
                            : booking.liquidacion_fecha_esperada
                        )}
                      </p>
                    </div>
                  </div>
                  {booking.liquidacion_estado !== 'cobrado' && booking.anticipo_estado === 'cobrado' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs mt-1"
                      onClick={() => setShowPago(true)}
                    >
                      Registrar liquidación
                    </Button>
                  )}
                </div>

                {/* SUMMARY BAR */}
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Fee bruto</p>
                    <p className="font-bold text-sm">{fmt(fee)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cobrado</p>
                    <p className="font-bold text-sm text-primary">
                      {fmt(
                        (booking.anticipo_estado === 'cobrado' ? (booking.anticipo_importe || 0) : 0) +
                        (booking.liquidacion_estado === 'cobrado' ? (booking.liquidacion_importe || 0) : 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendiente</p>
                    <p className="font-bold text-sm text-destructive">
                      {fmt(
                        (booking.anticipo_estado !== 'cobrado' ? (booking.anticipo_importe || 0) : 0) +
                        (booking.liquidacion_estado !== 'cobrado' ? (booking.liquidacion_importe || 0) : 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <PagoDialog
          open={showPago}
          onOpenChange={setShowPago}
          booking={booking}
          onSuccess={() => {
            setShowPago(false);
            onUpdate();
          }}
        />
      </>
    );
  }
);

PaymentStatusCard.displayName = 'PaymentStatusCard';
