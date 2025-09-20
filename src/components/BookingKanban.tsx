import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BookingCard } from './BookingCard';
import { CreateBookingOfferDialog } from './CreateBookingOfferDialog';

export interface BookingOffer {
  id: string;
  phase: string;
  promotor?: string;
  ciudad?: string;
  pais?: string;
  fecha?: string;
  venue?: string;
  fee?: number;
  gastos_estimados?: number;
  comision_porcentaje?: number;
  comision_euros?: number;
  es_cityzen?: boolean;
  es_internacional?: boolean;
  estado_facturacion?: string;
  adjuntos?: any;
  notas?: string;
  sort_order?: number;
  festival_ciclo?: string;
  lugar?: string;
  capacidad?: number;
  estado?: string;
  oferta?: string;
  formato?: string;
  contacto?: string;
  tour_manager?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  hora?: string;
  folder_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

const PHASES = [
  { id: 'lead', label: 'Lead', color: 'bg-gray-100 border-gray-200' },
  { id: 'oferta_enviada', label: 'Oferta enviada', color: 'bg-blue-50 border-blue-200' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'confirmado', label: 'Confirmado', color: 'bg-green-50 border-green-200' },
  { id: 'contratado', label: 'Contratado', color: 'bg-purple-50 border-purple-200' },
  { id: 'cerrado_perdido', label: 'Cerrado (perdido)', color: 'bg-red-50 border-red-200' }
];

interface BookingKanbanProps {
  templateFields: any[];
}

export function BookingKanban({ templateFields }: BookingKanbanProps) {
  const [offers, setOffers] = useState<BookingOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<BookingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [promoterFilter, setPromoterFilter] = useState<string>('all');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [offers, searchTerm, phaseFilter, countryFilter, promoterFilter]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_offers')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ofertas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...offers];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.venue?.toLowerCase().includes(term) ||
        offer.ciudad?.toLowerCase().includes(term) ||
        offer.promotor?.toLowerCase().includes(term) ||
        offer.festival_ciclo?.toLowerCase().includes(term)
      );
    }

    // Phase filter
    if (phaseFilter !== 'all') {
      filtered = filtered.filter(offer => offer.phase === phaseFilter);
    }

    // Country filter
    if (countryFilter !== 'all') {
      filtered = filtered.filter(offer => offer.pais === countryFilter);
    }

    // Promoter filter
    if (promoterFilter !== 'all') {
      filtered = filtered.filter(offer => offer.promotor === promoterFilter);
    }

    setFilteredOffers(filtered);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    const activeOffer = offers.find(offer => offer.id === active.id);
    if (!activeOffer) return;

    // Check if dropping in a different phase
    const newPhase = over.id as string;
    if (PHASES.some(phase => phase.id === newPhase)) {
      await updateOfferPhase(activeOffer.id, newPhase);
    } else {
      // Reordering within the same phase
      const oldIndex = offers.findIndex(offer => offer.id === active.id);
      const newIndex = offers.findIndex(offer => offer.id === over.id);
      
      if (oldIndex !== newIndex) {
        const newOffers = arrayMove(offers, oldIndex, newIndex);
        setOffers(newOffers);
        await updateSortOrder(newOffers);
      }
    }
  };

  const updateOfferPhase = async (offerId: string, newPhase: string) => {
    try {
      const { error } = await supabase
        .from('booking_offers')
        .update({ phase: newPhase })
        .eq('id', offerId);

      if (error) throw error;

      // Validate CityZen rules for international shows
      const offer = offers.find(o => o.id === offerId);
      if (offer?.es_internacional && offer?.comision_porcentaje && offer?.comision_porcentaje > 10) {
        toast({
          title: "Aviso: Comisión alta",
          description: "Para shows internacionales, las comisiones totales no deberían superar el 10% del caché bruto.",
          variant: "destructive",
        });
      }

      fetchOffers();
      toast({
        title: "Fase actualizada",
        description: `La oferta se movió a ${PHASES.find(p => p.id === newPhase)?.label}`,
      });
    } catch (error) {
      console.error('Error updating phase:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fase.",
        variant: "destructive",
      });
    }
  };

  const updateSortOrder = async (newOffers: BookingOffer[]) => {
    try {
      const updates = newOffers.map((offer, index) => ({
        id: offer.id,
        sort_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('booking_offers')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating sort order:', error);
    }
  };

  const duplicateOffer = async (offerId: string) => {
    try {
      const originalOffer = offers.find(o => o.id === offerId);
      if (!originalOffer) return;

      const { id, created_at, updated_at, ...offerData } = originalOffer;
      const duplicatedOffer = {
        ...offerData,
        phase: 'lead',
        sort_order: offers.length,
        created_by: offerData.created_by || 'unknown'
      };

      const { error } = await supabase
        .from('booking_offers')
        .insert([duplicatedOffer]);

      if (error) throw error;

      fetchOffers();
      toast({
        title: "Oferta duplicada",
        description: "La oferta se ha duplicado correctamente.",
      });
    } catch (error) {
      console.error('Error duplicating offer:', error);
      toast({
        title: "Error",
        description: "No se pudo duplicar la oferta.",
        variant: "destructive",
      });
    }
  };

  const getOffersByPhase = (phase: string) => {
    return filteredOffers.filter(offer => offer.phase === phase);
  };

  const getUniqueValues = (field: keyof BookingOffer) => {
    return [...new Set(offers.map(offer => offer[field]).filter(Boolean).map(String))];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando ofertas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por venue, ciudad, promotor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fases</SelectItem>
              {PHASES.map(phase => (
                <SelectItem key={phase.id} value={phase.id}>
                  {phase.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los países</SelectItem>
              {getUniqueValues('pais').map(country => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={promoterFilter} onValueChange={setPromoterFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Promotor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los promotores</SelectItem>
              {getUniqueValues('promotor').map(promoter => (
                <SelectItem key={promoter} value={promoter}>
                  {promoter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nueva oferta
        </Button>
      </div>

      {/* Kanban Board */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[600px]">
          {PHASES.map(phase => {
            const phaseOffers = getOffersByPhase(phase.id);
            
            return (
              <Card key={phase.id} className={`${phase.color} border-2 transition-all duration-200`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    {phase.label}
                    <Badge variant="secondary" className="ml-2">
                      {phaseOffers.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SortableContext items={phaseOffers.map(offer => offer.id)}>
                    {phaseOffers.map(offer => (
                      <BookingCard
                        key={offer.id}
                        offer={offer}
                        onDuplicate={duplicateOffer}
                        isDragging={draggedItem === offer.id}
                      />
                    ))}
                  </SortableContext>
                  
                  {phaseOffers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No hay ofertas en esta fase
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DndContext>

      <CreateBookingOfferDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOfferCreated={fetchOffers}
        templateFields={templateFields}
      />
    </div>
  );
}