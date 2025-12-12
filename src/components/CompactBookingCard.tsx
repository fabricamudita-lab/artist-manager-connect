import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Download, GripVertical, FileText, AlertTriangle } from 'lucide-react';
import { BookingOffer } from './BookingKanban';

interface CompactBookingCardProps {
  offer: BookingOffer;
  onDuplicate: (id: string) => void;
  isDragging?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function CompactBookingCard({
  offer,
  onDuplicate,
  isDragging,
  selectionMode = false,
  isSelected = false,
  onToggleSelect
}: CompactBookingCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging
  } = useSortable({
    id: offer.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 150ms ease",
    opacity: isDragging || sortableIsDragging ? 0.5 : 1
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleGeneratePDF = () => {
    console.log('Generate PDF for offer:', offer.id);
  };

  const handleNavigateToDetail = () => {
    navigate(`/booking/${offer.id}`);
  };

  const hasWarning = offer.es_internacional && offer.comision_porcentaje && offer.comision_porcentaje > 10;

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(offer.id);
    } else {
      handleNavigateToDetail();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            ref={setNodeRef} 
            style={style} 
            className={`cursor-pointer hover:shadow-md transition-all duration-150 bg-card border group relative ${
              isSelected ? 'ring-2 ring-primary border-primary' : ''
            }`}
            onClick={handleCardClick}
          >
            <CardContent className="p-3 space-y-2">
              {/* Selection checkbox or main info */}
              <div className="flex items-center justify-between gap-2">
                {selectionMode && (
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect?.(offer.id)}
                    onClick={e => e.stopPropagation()}
                    className="mr-1"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground leading-tight">
                    {offer.fecha ? new Date(offer.fecha).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit'
                    }) : '—'} {offer.festival_ciclo || offer.venue || offer.promotor || 'Sin nombre'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {offer.ciudad || ''}{offer.ciudad && offer.venue && offer.festival_ciclo ? ` · ${offer.venue}` : ''}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div 
                    {...attributes} 
                    {...listeners} 
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded" 
                    onClick={e => e.stopPropagation()}
                  >
                    <GripVertical className="h-3 w-3 text-gray-400" />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        handleNavigateToDetail();
                      }}>
                        <FileText className="h-3 w-3 mr-2" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        onDuplicate(offer.id);
                      }}>
                        <Copy className="h-3 w-3 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        handleGeneratePDF();
                      }}>
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
                {hasWarning && <AlertTriangle className="h-3 w-3 text-amber-500" />}
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
  );
}
