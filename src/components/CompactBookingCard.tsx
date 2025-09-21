import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Calendar, MapPin, Euro, MoreHorizontal, Copy, Download, GripVertical, Building, User, FileText, AlertTriangle } from 'lucide-react';
import { BookingOffer } from './BookingKanban';
import { generateOfferNumber } from '@/utils/exportUtils';
import { CopyButton } from '@/components/ui/copy-button';

interface CompactBookingCardProps {
  offer: BookingOffer;
  onDuplicate: (id: string) => void;
  isDragging?: boolean;
}

export function CompactBookingCard({ offer, onDuplicate, isDragging }: CompactBookingCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      facturado: 'bg-blue-100 text-blue-700 border-blue-200',
      pagado: 'bg-green-100 text-green-700 border-green-200',
      vencido: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status || 'pendiente'] || colors.pendiente;
  };

  const handleGeneratePDF = () => {
    console.log('Generate PDF for offer:', offer.id);
  };

  const offerNumber = generateOfferNumber(offer);
  const hasWarning = offer.es_internacional && offer.comision_porcentaje && offer.comision_porcentaje > 10;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              ref={setNodeRef}
              style={style}
              className="cursor-pointer hover:shadow-md transition-all duration-150 bg-card border group relative"
              onClick={() => setShowDetails(true)}
            >
              <CardContent className="p-3 space-y-2">
                {/* Main info line */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {formatDate(offer.fecha)} · {offer.ciudad?.toUpperCase() || 'SIN CIUDAD'} · {offer.promotor || 'SIN PROMOTOR'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                      {...attributes}
                      {...listeners}
                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-3 w-3 text-gray-400" />
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}>
                          <FileText className="h-3 w-3 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(offer.id); }}>
                          <Copy className="h-3 w-3 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleGeneratePDF(); }}>
                          <Download className="h-3 w-3 mr-2" />
                          Generar PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Badges and indicators */}
                <div className="flex items-center gap-1 flex-wrap">
                  {offer.es_cityzen && (
                    <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0.5">
                      CityZen
                    </Badge>
                  )}
                  {offer.es_internacional && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-blue-300 text-blue-700">
                      Internacional
                    </Badge>
                  )}
                  {hasWarning && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                  <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5 ml-auto">
                    {offerNumber}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <div className="font-semibold">{offer.venue || offer.lugar || 'Sin venue'}</div>
              
              {offer.fee && (
                <div className="flex justify-between">
                  <span>Fee:</span>
                  <span className="font-medium">{formatCurrency(offer.fee)}</span>
                </div>
              )}
              
              {offer.comision_euros && (
                <div className="flex justify-between">
                  <span>Comisión:</span>
                  <span className="font-medium">{formatCurrency(offer.comision_euros)}</span>
                </div>
              )}
              
              {offer.notas && (
                <div>
                  <span className="font-medium">Notas:</span>
                  <p className="text-muted-foreground mt-1">{offer.notas}</p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{offer.venue || offer.lugar || 'Sin venue'}</span>
              <Badge variant="outline" className="font-mono">
                {offerNumber}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Details */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Evento
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span className="font-medium">{formatDate(offer.fecha)}</span>
                  </div>
                  {offer.hora && (
                    <div className="flex justify-between">
                      <span>Hora:</span>
                      <span className="font-medium">{offer.hora}</span>
                    </div>
                  )}
                  {offer.capacidad && (
                    <div className="flex justify-between">
                      <span>Capacidad:</span>
                      <span className="font-medium">{offer.capacidad.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ubicación
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Venue:</span>
                    <span className="font-medium">{offer.venue || offer.lugar || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ciudad:</span>
                    <span className="font-medium">{offer.ciudad || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>País:</span>
                    <span className="font-medium">{offer.pais || '—'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contacto
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Promotor:</span>
                    <span className="font-medium">{offer.promotor || '—'}</span>
                  </div>
                  {offer.contacto && (
                    <div className="flex justify-between">
                      <span>Contacto:</span>
                      <span className="font-medium">{offer.contacto}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Información Financiera
                </h4>
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Fee:</span>
                      <span className="font-bold">{formatCurrency(offer.fee)}</span>
                    </div>
                    {offer.gastos_estimados && (
                      <div className="flex justify-between">
                        <span className="text-sm">Gastos estimados:</span>
                        <span className="font-medium">{formatCurrency(offer.gastos_estimados)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm">Comisión ({offer.comision_porcentaje || 5}%):</span>
                      <span className="font-bold text-primary">{formatCurrency(offer.comision_euros)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Estado facturación:</span>
                    <Badge className={`${getStatusColor(offer.estado_facturacion)} text-xs`}>
                      {offer.estado_facturacion === 'pendiente' ? 'Pendiente' :
                       offer.estado_facturacion === 'facturado' ? 'Facturado' :
                       offer.estado_facturacion === 'pagado' ? 'Pagado' : 'Vencido'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              <div>
                <h4 className="font-semibold mb-2">Estado</h4>
                <div className="space-y-2">
                  {offer.es_cityzen && (
                    <Badge className="bg-orange-500 text-white">
                      CityZen
                    </Badge>
                  )}
                  {offer.es_internacional && (
                    <Badge variant="outline" className="border-blue-300 text-blue-700">
                      Internacional
                    </Badge>
                  )}
                  {hasWarning && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                      ⚠️ Comisión alta para show internacional
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {offer.notas && (
                <div>
                  <h4 className="font-semibold mb-2">Notas</h4>
                  <div className="bg-blue-50 rounded p-3 text-sm text-blue-800">
                    {offer.notas}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <CopyButton
                text={offerNumber}
                successMessage="Número de oferta copiado"
                variant="outline"
                size="sm"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const totalFee = `€${offer.fee?.toLocaleString() || '0'}`;
                  navigator.clipboard?.writeText(totalFee);
                }}
              >
                <Euro className="h-3 w-3 mr-2" />
                Copiar fee
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDuplicate(offer.id)}
              >
                <Copy className="h-3 w-3 mr-2" />
                Duplicar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGeneratePDF}
              >
                <Download className="h-3 w-3 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}