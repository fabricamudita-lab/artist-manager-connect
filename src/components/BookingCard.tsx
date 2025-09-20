import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, Euro, Users, FileText, MoreHorizontal, Copy, Download, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingOffer } from './BookingKanban';

interface BookingCardProps {
  offer: BookingOffer;
  onDuplicate: (id: string) => void;
  isDragging?: boolean;
}

export function BookingCard({ offer, onDuplicate, isDragging }: BookingCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: offer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 150ms ease",
    opacity: isDragging || sortableIsDragging ? 0.5 : 1,
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status?: string) => {
    const variants: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      facturado: 'bg-blue-100 text-blue-800',
      pagado: 'bg-green-100 text-green-800',
      vencido: 'bg-red-100 text-red-800',
    };
    
    return variants[status || 'pendiente'] || variants.pendiente;
  };

  const handleGeneratePDF = () => {
    // TODO: Implement PDF generation
    console.log('Generate PDF for offer:', offer.id);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white border border-gray-200"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {offer.promotor?.charAt(0)?.toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="text-sm font-medium truncate">
                  {offer.promotor || 'Sin promotor'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {offer.venue || offer.lugar || 'Sin venue'}
                </p>
              </div>
            </div>
            
            {offer.es_cityzen && (
              <Badge className="bg-orange-100 text-orange-800 text-xs mb-2">
                CityZen
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            >
              <GripVertical className="h-3 w-3 text-gray-400" />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onDuplicate(offer.id)}>
                  <Copy className="h-3 w-3 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGeneratePDF}>
                  <Download className="h-3 w-3 mr-2" />
                  Generar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Location and Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {offer.ciudad && offer.pais ? `${offer.ciudad}, ${offer.pais}` : 
               offer.ciudad || offer.pais || 'Sin ubicación'}
            </span>
          </div>
          
          {offer.fecha && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(offer.fecha).toLocaleDateString('es-ES')}
              </span>
            </div>
          )}
        </div>

        {/* Financial Info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Fee:</span>
            <span className="text-sm font-medium">{formatCurrency(offer.fee)}</span>
          </div>
          
          {offer.gastos_estimados && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Gastos:</span>
              <span className="text-sm">{formatCurrency(offer.gastos_estimados)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center border-t border-gray-200 pt-2">
            <span className="text-xs text-muted-foreground">
              Comisión ({offer.comision_porcentaje || 5}%):
            </span>
            <span className="text-sm font-medium text-primary">
              {formatCurrency(offer.comision_euros)}
            </span>
          </div>
        </div>

        {/* Billing Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Facturación:</span>
          <Badge className={`text-xs ${getStatusBadge(offer.estado_facturacion)}`}>
            {offer.estado_facturacion === 'pendiente' ? 'Pendiente' :
             offer.estado_facturacion === 'facturado' ? 'Facturado' :
             offer.estado_facturacion === 'pagado' ? 'Pagado' : 'Vencido'}
          </Badge>
        </div>

        {/* Attachments */}
        {offer.adjuntos && Array.isArray(offer.adjuntos) && offer.adjuntos.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>{offer.adjuntos.length} archivo(s)</span>
          </div>
        )}

        {/* Notes preview */}
        {offer.notas && (
          <div className="bg-blue-50 rounded p-2">
            <p className="text-xs text-blue-800 line-clamp-2">
              {offer.notas}
            </p>
          </div>
        )}

        {/* International warning */}
        {offer.es_internacional && offer.comision_porcentaje && offer.comision_porcentaje > 10 && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <p className="text-xs text-red-800">
              ⚠️ Comisión alta para show internacional
            </p>
          </div>
        )}

        {/* Last updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-gray-100">
          Actualizado {formatDistanceToNow(new Date(offer.updated_at), { 
            addSuffix: true, 
            locale: es 
          })}
        </div>
      </CardContent>
    </Card>
  );
}