import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, ChevronDown, Eye, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useRoadmap, RoadmapBlock } from '@/hooks/useRoadmaps';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { BookingSelectorDialog, BookingForSelector } from '@/components/BookingSelectorDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { HeaderBlock } from '@/components/roadmap-blocks/HeaderBlock';
import { ScheduleBlock } from '@/components/roadmap-blocks/ScheduleBlock';
import { TravelBlock } from '@/components/roadmap-blocks/TravelBlock';
import { HospitalityBlock } from '@/components/roadmap-blocks/HospitalityBlock';
import { ProductionBlock } from '@/components/roadmap-blocks/ProductionBlock';
import { ContactsBlock } from '@/components/roadmap-blocks/ContactsBlock';
import { RoadmapPreview } from '@/components/roadmap-blocks/RoadmapPreview';

const blockTypeLabels: Record<RoadmapBlock['block_type'], string> = {
  header: 'Cabecera del Tour',
  schedule: 'Cronograma (Timeline)',
  travel: 'Logística de Viaje',
  hospitality: 'Hospitalidad',
  production: 'Producción Técnica',
  contacts: 'Contactos',
};

const statusOptions = [
  { value: 'draft', label: 'Borrador' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function RoadmapDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roadmap, blocks, isLoading, updateRoadmap, addBlock, updateBlock, deleteBlock } = useRoadmap(id);
  
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showBookingSelector, setShowBookingSelector] = useState(false);

  // Fetch artist name for preview
  const { data: artist } = useQuery({
    queryKey: ['artist', roadmap?.artist_id],
    queryFn: async () => {
      if (!roadmap?.artist_id) return null;
      const { data } = await supabase
        .from('artists')
        .select('name')
        .eq('id', roadmap.artist_id)
        .single();
      return data;
    },
    enabled: !!roadmap?.artist_id,
  });

  // Check if promotor is a UUID and fetch contact name if so
  const promotorValue = roadmap?.booking?.promotor;
  const isPromoterUUID = promotorValue && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promotorValue);
  
  const { data: promoterContact } = useQuery({
    queryKey: ['contact-promoter', promotorValue],
    queryFn: async () => {
      if (!promotorValue) return null;
      const { data } = await supabase
        .from('contacts')
        .select('name, company')
        .eq('id', promotorValue)
        .single();
      return data;
    },
    enabled: !!isPromoterUUID,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Hoja de ruta no encontrada</p>
      </div>
    );
  }

  const handleSaveName = () => {
    if (tempName.trim() && tempName !== roadmap.name) {
      updateRoadmap.mutate({ name: tempName });
    }
    setEditingName(false);
  };

  const handleBookingSelect = (booking: BookingForSelector) => {
    // Auto-fill fields from booking
    const bookingName = booking.festival_ciclo || booking.lugar || roadmap.name;
    const updates: Record<string, unknown> = {
      booking_id: booking.id,
      name: bookingName,
      promoter: booking.promotor || roadmap.promoter,
    };
    
    if (booking.artist_id) {
      updates.artist_id = booking.artist_id;
    }
    
    if (booking.fecha) {
      updates.start_date = booking.fecha;
      updates.end_date = booking.fecha;
    }
    
    updateRoadmap.mutate(updates as any);
  };

  const handleUnlinkBooking = () => {
    updateRoadmap.mutate({ booking_id: null } as any);
  };

  // Build booking suggestion for HeaderBlock - resolve promoter name
  const resolvedPromoterName = isPromoterUUID 
    ? (promoterContact?.name || promoterContact?.company || undefined)
    : promotorValue || undefined;

  const bookingSuggestion = roadmap.booking ? {
    artistName: artist?.name,
    tourTitle: roadmap.booking.festival_ciclo || roadmap.booking.lugar || undefined,
    promoter: resolvedPromoterName,
    eventDate: roadmap.booking.fecha || undefined,
  } : undefined;

  // Sync tour dates from HeaderBlock to roadmap start_date/end_date
  const handleTourDatesChange = (dates: string[]) => {
    if (dates.length === 0) return;
    
    const sortedDates = [...dates].sort();
    const newStartDate = sortedDates[0];
    const newEndDate = sortedDates[sortedDates.length - 1];
    
    // Only update if different from current
    if (newStartDate !== roadmap.start_date || newEndDate !== roadmap.end_date) {
      updateRoadmap.mutate({ 
        start_date: newStartDate, 
        end_date: newEndDate 
      } as any);
    }
  };

  const renderBlock = (block: RoadmapBlock) => {
    const props = {
      data: block.data as Record<string, unknown>,
      onChange: (data: Record<string, unknown>) => updateBlock.mutate({ blockId: block.id, data }),
    };

    switch (block.block_type) {
      case 'header':
        return (
          <HeaderBlock 
            {...props} 
            bookingSuggestion={bookingSuggestion} 
            onTourDatesChange={handleTourDatesChange}
            onLinkBooking={() => setShowBookingSelector(true)}
          />
        );
      case 'schedule':
        return <ScheduleBlock {...props} tourDates={bookingSuggestion?.eventDate ? [bookingSuggestion.eventDate] : undefined} />;
      case 'travel':
        return <TravelBlock {...props} />;
      case 'hospitality':
        return <HospitalityBlock {...props} />;
      case 'production':
        return <ProductionBlock {...props} />;
      case 'contacts':
        return <ContactsBlock {...props} />;
      default:
        return null;
    }
  };

  const linkedBooking = roadmap.booking;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/roadmaps')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="max-w-md"
                autoFocus
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <Button size="icon" onClick={handleSaveName}>
                <Save className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold font-playfair cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                setTempName(roadmap.name);
                setEditingName(true);
              }}
            >
              {roadmap.name}
            </h1>
          )}
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setShowPreview(true)}>
          <Eye className="w-4 h-4" />
          Previsualizar
        </Button>
        <Select
          value={roadmap.status}
          onValueChange={(value) => updateRoadmap.mutate({ status: value as typeof roadmap.status })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Booking Link Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Evento Vinculado</span>
            </div>
            {linkedBooking ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  {linkedBooking.festival_ciclo || linkedBooking.lugar || 'Evento'}
                  {linkedBooking.fecha && (
                    <span className="text-muted-foreground ml-1">
                      · {format(new Date(linkedBooking.fecha), 'd MMM yyyy', { locale: es })}
                    </span>
                  )}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleUnlinkBooking}>
                  Desvincular
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowBookingSelector(true)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowBookingSelector(true)} className="gap-2">
                <Link2 className="w-4 h-4" />
                Vincular a Evento
              </Button>
            )}
          </div>

          {/* Editable Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Artista</Label>
              <SingleArtistSelector
                value={roadmap.artist_id}
                onValueChange={(value) => updateRoadmap.mutate({ artist_id: value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Promotor</Label>
              <Input
                value={resolvedPromoterName || roadmap.promoter || ''}
                readOnly={!!linkedBooking}
                onChange={(e) => !linkedBooking && updateRoadmap.mutate({ promoter: e.target.value })}
                placeholder="Nombre del promotor"
                className={linkedBooking ? 'bg-muted' : ''}
              />
              {linkedBooking && resolvedPromoterName && (
                <p className="text-xs text-muted-foreground">
                  Promotor del evento vinculado
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Fecha del Evento</Label>
              <Input
                type="date"
                value={linkedBooking?.fecha || ''}
                readOnly
                className="bg-muted"
              />
              {linkedBooking?.fecha && (
                <p className="text-xs text-muted-foreground">
                  Fecha del evento vinculado
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Hora Concierto</Label>
              <Input
                type="time"
                value={linkedBooking?.hora?.substring(0, 5) || ''}
                readOnly
                className="bg-muted"
              />
              {linkedBooking?.hora && (
                <p className="text-xs text-muted-foreground">
                  Hora del evento vinculado
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bloques de información</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Añadir Bloque
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {(Object.keys(blockTypeLabels) as RoadmapBlock['block_type'][]).map((type) => (
                <DropdownMenuItem key={type} onClick={() => addBlock.mutate(type)}>
                  {blockTypeLabels[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {blocks && blocks.length > 0 ? (
          <Accordion type="multiple" defaultValue={blocks.map(b => b.id)} className="space-y-4">
            {blocks.map((block) => (
              <AccordionItem key={block.id} value={block.id} className="border rounded-lg bg-card group">
                <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:hidden">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <span className="text-base font-semibold">{blockTypeLabels[block.block_type]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBlock.mutate(block.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {renderBlock(block)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No hay bloques. Haz clic en "Añadir Bloque" para empezar.
            </p>
          </Card>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          <DialogHeader className="p-4 border-b flex-row items-center justify-between">
            <DialogTitle>Previsualización de Hoja de Ruta</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 h-[calc(90vh-60px)]">
            <RoadmapPreview
              roadmapName={roadmap.name}
              artistName={artist?.name}
              promoter={roadmap.promoter}
              startDate={roadmap.start_date}
              endDate={roadmap.end_date}
              blocks={blocks || []}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Booking Selector Dialog */}
      <BookingSelectorDialog
        open={showBookingSelector}
        onOpenChange={setShowBookingSelector}
        artistId={roadmap.artist_id}
        onSelect={handleBookingSelect}
      />
    </div>
  );
}
