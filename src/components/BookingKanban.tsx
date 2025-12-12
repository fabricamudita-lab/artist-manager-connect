import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, Download, FileText, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CompactBookingCard } from './CompactBookingCard';
import { CreateBookingWizard } from './CreateBookingWizard';
import { exportToCSV, generateOfferNumber } from '@/utils/exportUtils';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';

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
  { id: 'interes', label: 'Interés', color: 'bg-slate-50 border-slate-200' },
  { id: 'oferta', label: 'Oferta', color: 'bg-blue-50 border-blue-200' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-amber-50 border-amber-200' },
  { id: 'confirmado', label: 'Confirmado', color: 'bg-green-50 border-green-200' },
  { id: 'facturado', label: 'Facturado', color: 'bg-emerald-50 border-emerald-200' },
  { id: 'cerrado', label: 'Cerrado', color: 'bg-purple-50 border-purple-200' },
  { id: 'cancelado', label: 'Cancelado (perdido)', color: 'bg-red-50 border-red-200' }
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
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  
  const { showGlobalSearch, setShowGlobalSearch } = useGlobalSearch();

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
        phase: 'interes',
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

  const handleExportFiltered = () => {
    try {
      const csvHeaders = {
        phase: 'Fase',
        fecha: 'Fecha',
        promotor: 'Promotor',
        ciudad: 'Ciudad',
        pais: 'País',
        venue: 'Venue',
        fee: 'Fee (€)',
        gastos_estimados: 'Gastos Estimados (€)',
        comision_porcentaje: 'Comisión (%)',
        es_cityzen: 'CityZen',
        es_internacional: 'Internacional',
        estado_facturacion: 'Estado Facturación',
        offer_number: 'Número Oferta'
      };

      const exportData = filteredOffers.map(offer => ({
        phase: PHASES.find(p => p.id === offer.phase)?.label || offer.phase,
        fecha: offer.fecha ? new Date(offer.fecha).toLocaleDateString() : '',
        promotor: offer.promotor || '',
        ciudad: offer.ciudad || '',
        pais: offer.pais || '',
        venue: offer.venue || '',
        fee: offer.fee || 0,
        gastos_estimados: offer.gastos_estimados || 0,
        comision_porcentaje: offer.comision_porcentaje || 0,
        es_cityzen: offer.es_cityzen ? 'Sí' : 'No',
        es_internacional: offer.es_internacional ? 'Sí' : 'No',
        estado_facturacion: offer.estado_facturacion || '',
        offer_number: generateOfferNumber(offer)
      }));

      const filterSuffix = phaseFilter !== 'all' || countryFilter !== 'all' || promoterFilter !== 'all' || searchTerm 
        ? '_filtrado' 
        : '';
      
      exportToCSV(exportData, `kanban_booking${filterSuffix}`, csvHeaders);
      
      toast({
        title: "Exportación exitosa",
        description: `${exportData.length} ofertas exportadas correctamente`,
      });
    } catch (error) {
      console.error('Error exporting offers:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudieron exportar las ofertas",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-40 h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="w-32 h-10 bg-muted rounded animate-pulse" />
            <div className="w-32 h-10 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {PHASES.map(phase => (
            <Card key={phase.id} className={`${phase.color} border-2`}>
              <CardSkeleton contentLines={3} />
            </Card>
          ))}
        </div>
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

        <div className="flex gap-2">
          <Button 
            onClick={handleExportFiltered}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV ({filteredOffers.length})
          </Button>
          <Button onClick={() => setShowCreateWizard(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Booking
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-7 gap-3 min-h-[600px]">
          {PHASES.map(phase => {
            const phaseOffers = getOffersByPhase(phase.id);
            
            return (
              <Card key={phase.id} className={`${phase.color} border-2 transition-all duration-200 hover:shadow-sm`}>
                <CardHeader className="pb-2 px-3 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-foreground">
                      {phase.label}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-medium">
                        {phaseOffers.length}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-primary/10"
                        onClick={() => setShowCreateWizard(true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  <SortableContext items={phaseOffers.map(offer => offer.id)}>
                    {phaseOffers.map(offer => (
                      <CompactBookingCard
                        key={offer.id}
                        offer={offer}
                        onDuplicate={duplicateOffer}
                        isDragging={draggedItem === offer.id}
                      />
                    ))}
                  </SortableContext>
                  
                  {phaseOffers.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      <div className="w-6 h-6 bg-muted/50 rounded flex items-center justify-center mx-auto mb-1.5">
                        <Plus className="w-3 h-3" />
                      </div>
                      <p className="font-medium">Sin ofertas</p>
                      <p className="text-xs opacity-70 mt-0.5">Arrastra aquí</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DndContext>

      <CreateBookingWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        onOfferCreated={fetchOffers}
      />
      
      <GlobalSearchDialog 
        open={showGlobalSearch} 
        onOpenChange={setShowGlobalSearch} 
      />
    </div>
  );
}