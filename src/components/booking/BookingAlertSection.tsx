import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface BookingOffer {
  id: string;
  estado?: string;
  phase?: string;
  fecha?: string;
}

interface BookingAlertSectionProps {
  offers: BookingOffer[];
  contractStatus: Record<string, boolean>;
}

export function BookingAlertSection({ offers, contractStatus }: BookingAlertSectionProps) {
  const hasContractWarning = offers.some(
    offer => offer.estado === 'confirmado' && offer.id && !contractStatus[offer.id]
  );

  const realizadoEvents = offers.filter(o => o.phase === 'realizado');

  return (
    <>
      {hasContractWarning && (
        <Alert className="border-warning/20 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            <strong>Aviso:</strong> Hay eventos confirmados sin contrato subido. Revisa las ofertas marcadas.
          </AlertDescription>
        </Alert>
      )}

      {realizadoEvents.length > 0 && (() => {
        const now = new Date();
        const vencidos = realizadoEvents.filter(o => o.fecha && (now.getTime() - new Date(o.fecha).getTime()) / 86400000 >= 30).length;
        const urgentes = realizadoEvents.filter(o => {
          if (!o.fecha) return false;
          const days = (now.getTime() - new Date(o.fecha).getTime()) / 86400000;
          return days >= 7 && days < 30;
        }).length;
        const recientes = realizadoEvents.length - vencidos - urgentes;
        return (
          <Alert className="border-purple-500/20 bg-purple-500/10">
            <AlertTriangle className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800 dark:text-purple-300">
              <strong>⚠ {realizadoEvents.length} evento(s) pendientes de facturar</strong>
              {' · '}
              {vencidos > 0 && <Badge variant="destructive" className="text-xs mr-1">{vencidos} vencidos +30d</Badge>}
              {urgentes > 0 && <Badge className="bg-amber-500 text-white text-xs mr-1">{urgentes} urgentes 7-30d</Badge>}
              {recientes > 0 && <Badge variant="outline" className="text-xs">{recientes} recientes &lt;7d</Badge>}
            </AlertDescription>
          </Alert>
        );
      })()}
    </>
  );
}
