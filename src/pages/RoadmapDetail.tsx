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
import { useRoadmap, RoadmapBlock, LinkedBooking } from '@/hooks/useRoadmaps';
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

// Define the canonical order of block types
const blockTypeOrder: RoadmapBlock['block_type'][] = [
  'header',
  'schedule',
  'travel',
  'hospitality',
  'production',
  'contacts',
];

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

interface LinkedBookingWithLinkId extends LinkedBooking {
  linkId: string;
}

export default function RoadmapDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    roadmap, 
    blocks, 
    linkedBookings,
    isLoading, 
    updateRoadmap, 
    addBookingLink,
    removeBookingLink,
    addBlock, 
    updateBlock, 
    deleteBlock 
  } = useRoadmap(id);
  
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

  // Get unique promoter IDs that are UUIDs
  const promoterIds = linkedBookings
    .map((b: LinkedBookingWithLinkId) => b.promotor)
    .filter((p): p is string => !!p && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p));
  
  const { data: promoterContacts } = useQuery({
    queryKey: ['contact-promoters', promoterIds],
    queryFn: async () => {
      if (promoterIds.length === 0) return {};
      const { data } = await supabase
        .from('contacts')
        .select('id, name, company')
        .in('id', promoterIds);
      
      const map: Record<string, { name: string | null; company: string | null }> = {};
      data?.forEach(c => {
        map[c.id] = { name: c.name, company: c.company };
      });
      return map;
    },
    enabled: promoterIds.length > 0,
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
    // Check if booking is already linked
    const alreadyLinked = linkedBookings.some((b: LinkedBookingWithLinkId) => b.id === booking.id);
    if (alreadyLinked) {
      setShowBookingSelector(false);
      return;
    }
    
    // Add to junction table
    addBookingLink.mutate(booking.id);
    
    // If this is the first booking, also set artist
    if (linkedBookings.length === 0 && booking.artist_id && !roadmap.artist_id) {
      updateRoadmap.mutate({ artist_id: booking.artist_id });
    }
    
    setShowBookingSelector(false);
  };

  const handleUnlinkBooking = (linkId: string) => {
    removeBookingLink.mutate(linkId);
  };

  const getPromoterName = (booking: LinkedBookingWithLinkId): string => {
    if (!booking.promotor) return '';
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.promotor);
    if (isUUID && promoterContacts?.[booking.promotor]) {
      return promoterContacts[booking.promotor].name || promoterContacts[booking.promotor].company || '';
    }
    return booking.promotor;
  };

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

  // Get tour dates from header block (priority), or fall back to booking event dates
  const getScheduleTourDates = (): string[] | undefined => {
    // First, look for tourDates in the header block
    const headerBlock = blocks?.find(b => b.block_type === 'header');
    if (headerBlock) {
      const headerData = headerBlock.data as { tourDates?: string[] };
      if (headerData.tourDates && headerData.tourDates.length > 0) {
        return headerData.tourDates;
      }
    }
    // Fallback to all linked booking event dates
    const bookingDates = linkedBookings
      .map((b: LinkedBookingWithLinkId) => b.fecha)
      .filter((d): d is string => !!d);
    if (bookingDates.length > 0) {
      return bookingDates;
    }
    return undefined;
  };

  // Build booking suggestion for HeaderBlock using ALL linked bookings
  const firstBooking = linkedBookings[0] as LinkedBookingWithLinkId | undefined;
  
  // Aggregate data from all linked bookings for header auto-fill
  const aggregatedBookingSuggestion = linkedBookings.length > 0 ? (() => {
    const allPromoters = linkedBookings
      .map((b: LinkedBookingWithLinkId) => getPromoterName(b))
      .filter((p): p is string => !!p);
    const uniquePromoters = [...new Set(allPromoters)];
    
    const allVenues = linkedBookings
      .map((b: LinkedBookingWithLinkId) => b.festival_ciclo || b.lugar)
      .filter((v): v is string => !!v);
    const uniqueVenues = [...new Set(allVenues)];
    
    const allDates = linkedBookings
      .map((b: LinkedBookingWithLinkId) => b.fecha)
      .filter((d): d is string => !!d)
      .sort();
    
    return {
      artistName: artist?.name,
      // Combine unique venues/festivals
      tourTitle: uniqueVenues.length > 0 ? uniqueVenues.join(' + ') : undefined,
      // Combine unique promoters
      promoter: uniquePromoters.length > 0 ? uniquePromoters.join(' / ') : undefined,
      // All event dates
      eventDates: allDates,
      // Keep first date for backwards compatibility
      eventDate: allDates[0],
    };
  })() : undefined;

  // Build booking info for schedule auto-fill (use first booking)
  const bookingInfo = firstBooking ? {
    eventDate: firstBooking.fecha || undefined,
    eventTime: firstBooking.hora?.substring(0, 5) || undefined,
    venue: firstBooking.lugar || undefined,
    city: firstBooking.ciudad || undefined,
    tourTitle: firstBooking.festival_ciclo || undefined,
  } : undefined;

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
            bookingSuggestion={aggregatedBookingSuggestion} 
            onTourDatesChange={handleTourDatesChange}
            onLinkBooking={() => setShowBookingSelector(true)}
          />
        );
      case 'schedule':
        return <ScheduleBlock {...props} tourDates={getScheduleTourDates()} bookingInfo={bookingInfo} artistId={roadmap.artist_id} bookingId={firstBooking?.id} />;
      case 'travel':
        return <TravelBlock {...props} tourDates={getScheduleTourDates()} bookingInfo={bookingInfo} artistId={roadmap.artist_id} bookingId={firstBooking?.id} />;
      case 'hospitality':
        return <HospitalityBlock {...props} artistId={roadmap.artist_id} bookingId={firstBooking?.id} />;
      case 'production':
        return <ProductionBlock {...props} />;
      case 'contacts':
        return <ContactsBlock {...props} />;
      default:
        return null;
    }
  };

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

      {/* Linked Bookings Section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Eventos Vinculados</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowBookingSelector(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Añadir Evento
            </Button>
          </div>

          {linkedBookings.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No hay eventos vinculados. Haz clic en "Añadir Evento" para vincular uno.
            </div>
          ) : (
            <div className="space-y-4">
              {linkedBookings.map((booking: LinkedBookingWithLinkId) => (
                <div key={booking.linkId} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="gap-1">
                      {booking.festival_ciclo || booking.lugar || 'Evento'}
                      {booking.fecha && (
                        <span className="text-muted-foreground ml-1">
                          · {format(new Date(booking.fecha), 'd MMM yyyy', { locale: es })}
                        </span>
                      )}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleUnlinkBooking(booking.linkId)}
                      className="text-destructive hover:text-destructive"
                    >
                      Desvincular
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Artista</Label>
                      {linkedBookings.indexOf(booking) === 0 ? (
                        <SingleArtistSelector
                          value={roadmap.artist_id}
                          onValueChange={(value) => updateRoadmap.mutate({ artist_id: value })}
                        />
                      ) : (
                        <Input
                          value={booking.artist?.name || ''}
                          readOnly
                          className="bg-muted"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Promotor</Label>
                      <Input
                        value={getPromoterName(booking)}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Promotor del evento vinculado
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha del Evento</Label>
                      <Input
                        type="date"
                        value={booking.fecha || ''}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Fecha del evento vinculado
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Hora Concierto</Label>
                      <Input
                        type="time"
                        value={booking.hora?.substring(0, 5) || ''}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Hora del evento vinculado
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bloques de información</h2>
          {(() => {
            const existingBlockTypes = blocks?.map(b => b.block_type) || [];
            const availableBlockTypes = (Object.keys(blockTypeLabels) as RoadmapBlock['block_type'][])
              .filter(type => !existingBlockTypes.includes(type));
            
            if (availableBlockTypes.length === 0) {
              return (
                <Badge variant="secondary" className="text-muted-foreground">
                  Todos los bloques añadidos
                </Badge>
              );
            }
            
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Añadir Bloque
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {availableBlockTypes.map((type) => (
                    <DropdownMenuItem key={type} onClick={() => addBlock.mutate(type)}>
                      {blockTypeLabels[type]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>

        {blocks && blocks.length > 0 ? (
          <Accordion type="multiple" defaultValue={blocks.map(b => b.id)} className="space-y-4">
            {[...blocks].sort((a, b) => 
              blockTypeOrder.indexOf(a.block_type) - blockTypeOrder.indexOf(b.block_type)
            ).map((block) => (
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
              artistId={roadmap.artist_id}
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
