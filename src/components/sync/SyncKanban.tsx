import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SyncOffer } from '@/pages/Sincronizaciones';
import { SyncOfferDetailDialog } from './SyncOfferDetailDialog';
import { 
  Film, 
  Tv, 
  Video, 
  Radio, 
  Gamepad2, 
  Music, 
  FileText, 
  MessageSquare, 
  PenLine, 
  CheckCircle, 
  DollarSign,
  GripVertical
} from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';

interface SyncKanbanProps {
  offers: SyncOffer[];
  onUpdate: () => void;
}

const PHASES = [
  { id: 'solicitud', label: 'Solicitud / Lead', icon: FileText, color: 'bg-blue-500' },
  { id: 'cotizacion', label: 'Cotización', icon: PenLine, color: 'bg-amber-500' },
  { id: 'negociacion', label: 'Negociación', icon: MessageSquare, color: 'bg-purple-500' },
  { id: 'licencia_firmada', label: 'Licencia Firmada', icon: CheckCircle, color: 'bg-green-500' },
  { id: 'facturado', label: 'Facturado / Cobrado', icon: DollarSign, color: 'bg-emerald-500' },
];

function getProductionIcon(type: string) {
  switch (type) {
    case 'cine':
      return <Film className="h-4 w-4" />;
    case 'serie':
      return <Tv className="h-4 w-4" />;
    case 'publicidad':
      return <Video className="h-4 w-4" />;
    case 'podcast':
      return <Radio className="h-4 w-4" />;
    case 'videojuego':
      return <Gamepad2 className="h-4 w-4" />;
    default:
      return <Music className="h-4 w-4" />;
  }
}

function DraggableSyncCard({ offer, onClick }: { offer: SyncOffer; onClick: () => void }) {
  const [hasDragged, setHasDragged] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: offer.id,
    data: offer,
  });

  // Track if we've actually moved during a drag
  useEffect(() => {
    if (isDragging) {
      setHasDragged(true);
    }
  }, [isDragging]);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only trigger click if we haven't been dragging
    if (!isDragging && !hasDragged) {
      onClick();
    }
    // Reset drag state after click
    setHasDragged(false);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={`hover:shadow-md transition-all border-l-4 cursor-pointer ${getPhaseColor(offer.phase)}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div 
                {...attributes} 
                {...listeners} 
                className="flex-shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={() => setHasDragged(false)}
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{offer.production_title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  🎵 {offer.song_title}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 p-1 rounded bg-muted">
              {getProductionIcon(offer.production_type)}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <Badge variant="outline" className="text-xs">
              {offer.production_type}
            </Badge>
            {offer.sync_fee && (
              <span className="font-semibold text-primary">
                €{offer.sync_fee.toLocaleString()}
              </span>
            )}
          </div>

          {offer.requester_company && (
            <p className="text-xs text-muted-foreground truncate">
              📍 {offer.requester_company}
            </p>
          )}

          {offer.territory && (
            <Badge variant="secondary" className="text-xs">
              🌍 {offer.territory}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({ 
  phase, 
  offers,
  onOfferClick 
}: { 
  phase: typeof PHASES[0]; 
  offers: SyncOffer[];
  onOfferClick: (offer: SyncOffer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: phase.id,
  });

  const PhaseIcon = phase.icon;

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px]">
      <div className={`flex items-center gap-2 p-3 rounded-t-lg ${phase.color}`}>
        <PhaseIcon className="h-4 w-4 text-white" />
        <h3 className="font-semibold text-white text-sm">{phase.label}</h3>
        <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
          {offers.length}
        </Badge>
      </div>
      
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] p-2 bg-muted/30 rounded-b-lg border-2 border-dashed transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-transparent'
        }`}
      >
        <ScrollArea className="h-full">
          <div className="space-y-2 pr-2">
            {offers.map((offer) => (
              <DraggableSyncCard 
                key={offer.id} 
                offer={offer} 
                onClick={() => onOfferClick(offer)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function SyncKanban({ offers, onUpdate }: SyncKanbanProps) {
  const [activeOffer, setActiveOffer] = useState<SyncOffer | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SyncOffer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const handleDragStart = (event: DragStartEvent) => {
    const offer = offers.find(o => o.id === event.active.id);
    if (offer) setActiveOffer(offer);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveOffer(null);
    
    const { active, over } = event;
    if (!over) return;
    
    const offerId = active.id as string;
    const newPhase = over.id as string;
    
    const offer = offers.find(o => o.id === offerId);
    if (!offer || offer.phase === newPhase) return;

    try {
      const { error } = await supabase
        .from('sync_offers')
        .update({ phase: newPhase, updated_at: new Date().toISOString() })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `La oferta se movió a "${PHASES.find(p => p.id === newPhase)?.label}"`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating sync offer phase:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la oferta.",
        variant: "destructive",
      });
    }
  };

  const handleOfferClick = (offer: SyncOffer) => {
    setSelectedOffer(offer);
    setShowDetailDialog(true);
  };

  const getOffersByPhase = (phaseId: string) => 
    offers.filter(o => o.phase === phaseId);

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PHASES.map((phase) => (
            <DroppableColumn
              key={phase.id}
              phase={phase}
              offers={getOffersByPhase(phase.id)}
              onOfferClick={handleOfferClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOffer && (
            <Card className="cursor-grabbing shadow-xl border-l-4 rotate-3 scale-105">
              <CardContent className="p-3 space-y-2">
                <p className="font-semibold text-sm">{activeOffer.production_title}</p>
                <p className="text-xs text-muted-foreground">
                  🎵 {activeOffer.song_title}
                </p>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      <SyncOfferDetailDialog
        offer={selectedOffer}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onUpdate={onUpdate}
      />
    </>
  );
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'solicitud':
      return 'border-l-blue-500';
    case 'cotizacion':
      return 'border-l-amber-500';
    case 'negociacion':
      return 'border-l-purple-500';
    case 'licencia_firmada':
      return 'border-l-green-500';
    case 'facturado':
      return 'border-l-emerald-500';
    default:
      return 'border-l-gray-500';
  }
}