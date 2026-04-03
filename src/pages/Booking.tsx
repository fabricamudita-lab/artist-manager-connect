import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Kanban, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreateBookingDialog } from '@/components/CreateBookingDialog';
import { CreateBookingWizard } from '@/components/CreateBookingWizard';
import { EditBookingTemplateDialog } from '@/components/EditBookingTemplateDialog';
import { EditBookingOfferDialog } from '@/components/EditBookingOfferDialog';
import { usePageTitle } from '@/hooks/useCommon';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { EventFolderDialog } from '@/components/EventFolderDialog';
import { BookingKanban } from '@/components/BookingKanban';
import { BookingFiltersState } from '@/components/BookingFiltersToolbar';
import { exportToCSV } from '@/utils/exportUtils';
import { validateBookingOffer, ValidationResult } from '@/lib/bookingValidations';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { useBookingFolders } from '@/hooks/useBookingFolders';
import { useBookingColumns } from '@/components/BookingTableColumns';
import { useAutoRealizado } from '@/hooks/useAutoRealizado';
import { BookingHeaderSection } from '@/components/booking/BookingHeaderSection';
import { BookingAlertSection } from '@/components/booking/BookingAlertSection';
import { BookingTableView } from '@/components/booking/BookingTableView';

interface BookingOffer {
  id: string;
  fecha?: string;
  festival_ciclo?: string;
  ciudad?: string;
  pais?: string;
  lugar?: string;
  venue?: string;
  capacidad?: number;
  duracion?: string;
  estado?: string;
  phase?: string;
  promotor?: string;
  fee?: number;
  pvp?: number;
  gastos_estimados?: number;
  comision_porcentaje?: number;
  comision_euros?: number;
  es_cityzen?: boolean;
  es_internacional?: boolean;
  estado_facturacion?: string;
  oferta?: string;
  formato?: string;
  contacto?: string;
  invitaciones?: number;
  tour_manager?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  publico?: string;
  logistica?: string;
  notas?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  hora?: string;
  folder_url?: string;
  created_at: string;
  availability_status?: 'all_available' | 'has_conflicts' | 'pending' | null;
}

interface TemplateField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_order: number;
  is_required: boolean;
  is_active: boolean;
}

export default function Booking() {
  usePageTitle('Booking');
  useAutoRealizado();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const artistIdFromUrl = searchParams.get('artistId');
  const { profile } = useAuth();
  const [offers, setOffers] = useState<BookingOffer[]>([]);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<BookingOffer | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const { getRemindersForBooking } = useBookingReminders(offers);
  const { openFolder, checkFolderExists, checkContractExists, backfillEventFolders, createEventFolder, loading: foldersLoading } = useBookingFolders();
  const [folderExists, setFolderExists] = useState<Record<string, boolean>>({});
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolderOffer, setSelectedFolderOffer] = useState<BookingOffer | null>(null);
  const [contractStatus, setContractStatus] = useState<Record<string, boolean>>({});
  const [folderErrors, setFolderErrors] = useState<Record<string, string>>({});
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const { columns, setColumns, visibleColumns, getColumnVisibility } = useBookingColumns();
  const [artists, setArtists] = useState<{ id: string; name: string; stage_name?: string }[]>([]);
  const [filters, setFilters] = useState<BookingFiltersState>({
    searchTerm: '', artistFilter: artistIdFromUrl || 'all', phaseFilter: 'all', countryFilter: 'all',
    promoterFilter: 'all', dateFrom: undefined, dateTo: undefined, showInternational: 'all', showCityzen: 'all',
  });
  const [filteredOffers, setFilteredOffers] = useState<BookingOffer[]>([]);
  const [syncing, setSyncing] = useState(false);

  const handleSyncEstados = async () => {
    try {
      setSyncing(true);
      const today = new Date().toISOString().split('T')[0];
      const { data: pastEvents, error: fetchError } = await supabase
        .from('booking_offers').select('id').eq('phase', 'confirmado').lt('fecha', today);
      if (fetchError) throw fetchError;
      if (!pastEvents || pastEvents.length === 0) {
        toast({ title: 'Todo al día', description: 'Sin cambios pendientes' });
        return;
      }
      const ids = pastEvents.map(e => e.id);
      const { error: updateError } = await supabase
        .from('booking_offers').update({ phase: 'realizado', estado: 'realizado' }).in('id', ids);
      if (updateError) throw updateError;
      toast({ title: 'Eventos actualizados', description: `${ids.length} evento(s) movido(s) a Realizado` });
      fetchOffers();
    } catch (error) {
      console.error('Sync error:', error);
      toast({ title: 'Error', description: 'No se pudieron sincronizar los estados', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (artistIdFromUrl) setFilters(prev => ({ ...prev, artistFilter: artistIdFromUrl }));
  }, [artistIdFromUrl]);

  useEffect(() => {
    fetchOffers();
    fetchTemplateFields();
    fetchArtists();
    const channel = supabase.channel('booking-table-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_offers' }, () => fetchOffers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { applyTableFilters(); }, [offers, filters]);

  const fetchArtists = async () => {
    const { data } = await supabase.from('artists').select('id, name, stage_name').order('name');
    setArtists(data || []);
  };

  const applyTableFilters = () => {
    let filtered = [...offers];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(o => o.venue?.toLowerCase().includes(term) || o.ciudad?.toLowerCase().includes(term) || o.festival_ciclo?.toLowerCase().includes(term));
    }
    if (filters.artistFilter !== 'all') filtered = filtered.filter(o => o.artist_id === filters.artistFilter);
    if (filters.phaseFilter !== 'all') filtered = filtered.filter(o => o.phase === filters.phaseFilter);
    if (filters.countryFilter !== 'all') filtered = filtered.filter(o => o.pais === filters.countryFilter);
    if (filters.promoterFilter !== 'all') filtered = filtered.filter(o => o.promotor === filters.promoterFilter);
    if (filters.dateFrom) filtered = filtered.filter(o => o.fecha && new Date(o.fecha) >= filters.dateFrom!);
    if (filters.dateTo) filtered = filtered.filter(o => o.fecha && new Date(o.fecha) <= filters.dateTo!);
    if (filters.showInternational !== 'all') filtered = filtered.filter(o => o.es_internacional === filters.showInternational);
    if (filters.showCityzen !== 'all') filtered = filtered.filter(o => o.es_cityzen === filters.showCityzen);
    setFilteredOffers(filtered);
  };

  const getUniqueValues = (field: keyof BookingOffer) => {
    return [...new Set(offers.map(o => o[field]).filter((v): v is string => typeof v === 'string' && v.length > 0))].sort();
  };

  const clearAllFilters = () => setFilters({
    searchTerm: '', artistFilter: 'all', phaseFilter: 'all', countryFilter: 'all',
    promoterFilter: 'all', dateFrom: undefined, dateTo: undefined, showInternational: 'all', showCityzen: 'all',
  });

  useEffect(() => {
    if (offers.length > 0) { validateAllOffers(); checkAllFolders(); checkAllContracts(); }
  }, [offers]);

  const checkAllFolders = async () => {
    const statuses: Record<string, boolean> = {};
    for (const offer of offers) { if (offer.id) statuses[offer.id] = await checkFolderExists(offer); }
    setFolderExists(statuses);
  };

  const checkAllContracts = async () => {
    const statuses: Record<string, boolean> = {};
    for (const offer of offers) {
      if (offer.id && offer.estado === 'confirmado') statuses[offer.id] = await checkContractExists(offer);
    }
    setContractStatus(statuses);
  };

  const validateAllOffers = async () => {
    const results: Record<string, ValidationResult> = {};
    try {
      const offerIds = offers.map(o => o.id).filter(Boolean) as string[];
      const { data: docsData } = await supabase.from('booking_documents').select('booking_id').in('booking_id', offerIds).eq('document_type', 'contract');
      const bookingsWithContract = new Set(docsData?.map(d => d.booking_id) || []);
      for (const offer of offers) {
        if (offer.id) results[offer.id] = await validateBookingOffer(offer, false, bookingsWithContract.has(offer.id));
      }
      setValidationResults(results);
    } catch (error) { console.error('Error validating offers:', error); }
  };

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase.from('booking_offers').select('*').order('fecha', { ascending: false });
      if (error) throw error;
      const allBookingIds = (data || []).map(o => o.id);
      let availabilityMap: Record<string, 'all_available' | 'has_conflicts' | 'pending' | null> = {};
      if (allBookingIds.length > 0) {
        const { data: requests } = await supabase.from('booking_availability_requests').select('booking_id, id').in('booking_id', allBookingIds);
        if (requests && requests.length > 0) {
          const requestIds = requests.map(r => r.id);
          const { data: responses } = await supabase.from('booking_availability_responses').select('request_id, status').in('request_id', requestIds);
          for (const req of requests) {
            const bookingResponses = (responses || []).filter(r => r.request_id === req.id);
            if (bookingResponses.length === 0) { availabilityMap[req.booking_id] = null; }
            else {
              const hasConflicts = bookingResponses.some(r => r.status === 'unavailable');
              const allResponded = bookingResponses.every(r => r.status !== 'pending');
              availabilityMap[req.booking_id] = allResponded && !hasConflicts ? 'all_available' : hasConflicts ? 'has_conflicts' : 'pending';
            }
          }
        }
      }
      setOffers((data || []).map(offer => ({ ...offer, availability_status: availabilityMap[offer.id] || null })));
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({ title: "Error", description: "No se pudieron cargar las ofertas.", variant: "destructive" });
    }
  };

  const fetchTemplateFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('booking_template_config').select('*').eq('is_active', true).order('field_order');
      if (error) throw error;
      setTemplateFields(data || []);
    } catch (error) {
      console.error('Error fetching template fields:', error);
      toast({ title: "Error", description: "No se pudieron cargar los campos de la plantilla.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      const { data: snapshot } = await supabase.from('booking_offers').select('*').eq('id', id).single();
      const { error } = await supabase.from('booking_offers').delete().eq('id', id);
      if (error) throw error;
      fetchOffers();
      if (snapshot) {
        const { toast: sonnerToast } = await import('sonner');
        sonnerToast.success('Oferta eliminada', {
          duration: 5000,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              const { error: insertError } = await (supabase as any).from('booking_offers').insert(snapshot);
              if (insertError) sonnerToast.error('Error al deshacer');
              else { sonnerToast.success('Acción revertida'); fetchOffers(); }
            },
          },
        });
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({ title: "Error", description: "No se pudo eliminar la oferta.", variant: "destructive" });
    }
  };

  const handleOpenFolder = (offer: BookingOffer) => { setSelectedFolderOffer(offer); setShowFolderDialog(true); };

  const handleBackfillFolders = async () => {
    try {
      const result = await backfillEventFolders();
      toast({ title: "Backfill completado", description: `${result.created} carpetas creadas, ${result.updated} actualizadas.` });
      fetchOffers(); checkAllFolders();
    } catch (error) {
      console.error('Error in backfill:', error);
      toast({ title: "Error", description: "Error durante el backfill de carpetas.", variant: "destructive" });
    }
  };

  const handleCreateMissingFolder = async (offer: BookingOffer) => {
    setFolderErrors(prev => { const n = { ...prev }; delete n[offer.id]; return n; });
    try {
      const result = await createEventFolder(offer);
      if (result.success && result.folderPath) {
        const publicUrl = `https://hptjzbaiclmgbvxlmllo.supabase.co/storage/v1/object/public/documents/${result.folderPath}`;
        await supabase.from('booking_offers').update({ folder_url: publicUrl }).eq('id', offer.id);
        toast({ title: "Carpeta creada", description: "La carpeta del evento se ha creado exitosamente." });
        fetchOffers(); checkAllFolders();
      } else {
        setFolderErrors(prev => ({ ...prev, [offer.id]: result.error || "Error desconocido" }));
        toast({ title: "Error al crear carpeta", description: result.error || "No se pudo crear la carpeta del evento.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setFolderErrors(prev => ({ ...prev, [offer.id]: "Error inesperado al crear la carpeta" }));
      toast({ title: "Error", description: "Error inesperado al crear la carpeta.", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    try {
      const csvHeaders = {
        fecha: 'Fecha', festival_ciclo: 'Festival/Ciclo', ciudad: 'Ciudad', pais: 'País', lugar: 'Lugar',
        venue: 'Venue', capacidad: 'Capacidad', estado: 'Estado', phase: 'Fase', promotor: 'Promotor',
        fee: 'Fee (€)', gastos_estimados: 'Gastos Estimados (€)', comision_porcentaje: 'Comisión (%)',
        comision_euros: 'Comisión (€)', es_cityzen: 'CityZen', es_internacional: 'Internacional',
        estado_facturacion: 'Estado Facturación', oferta: 'Oferta', formato: 'Formato',
        contacto: 'Contacto', tour_manager: 'Tour Manager', created_at: 'Fecha Creación',
      };
      const exportData = offers.map(offer => ({
        fecha: offer.fecha ? new Date(offer.fecha).toLocaleDateString() : '',
        festival_ciclo: offer.festival_ciclo || '', ciudad: offer.ciudad || '', pais: offer.pais || '',
        lugar: offer.lugar || '', venue: offer.venue || '', capacidad: offer.capacidad || '',
        estado: offer.estado || '', phase: offer.phase || '', promotor: offer.promotor || '',
        fee: offer.fee || 0, gastos_estimados: offer.gastos_estimados || 0,
        comision_porcentaje: offer.comision_porcentaje || 0, comision_euros: offer.comision_euros || 0,
        es_cityzen: offer.es_cityzen ? 'Sí' : 'No', es_internacional: offer.es_internacional ? 'Sí' : 'No',
        estado_facturacion: offer.estado_facturacion || '', oferta: offer.oferta || '', formato: offer.formato || '',
        contacto: offer.contacto || '', tour_manager: offer.tour_manager || '',
        created_at: new Date(offer.created_at).toLocaleDateString(),
      }));
      exportToCSV(exportData, 'ofertas_booking', csvHeaders);
      toast({ title: "Exportación exitosa", description: "Las ofertas se han exportado correctamente" });
    } catch (error) {
      console.error('Error exporting offers:', error);
      toast({ title: "Error de exportación", description: "No se pudieron exportar las ofertas", variant: "destructive" });
    }
  };

  const refreshAll = () => { fetchOffers(); checkAllFolders(); checkAllContracts(); };

  if (loading) return <div className="container mx-auto p-4 space-y-6"><div className="text-lg">Cargando...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-8">
        <BookingHeaderSection
          onSyncEstados={handleSyncEstados}
          syncing={syncing}
          onExportCSV={handleExportCSV}
          onBackfillFolders={handleBackfillFolders}
          foldersLoading={foldersLoading}
          onEditTemplate={() => setShowTemplateDialog(true)}
        />

        <BookingAlertSection offers={offers} contractStatus={contractStatus} />

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="kanban" className="flex items-center gap-2"><Kanban className="h-4 w-4" />Vista Kanban</TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2"><List className="h-4 w-4" />Vista Tabla</TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="space-y-6">
            <BookingKanban templateFields={templateFields} />
          </TabsContent>
          <TabsContent value="table">
            <BookingTableView
              offers={offers}
              filteredOffers={filteredOffers}
              filters={filters}
              onFiltersChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
              artists={artists}
              countries={getUniqueValues('pais')}
              promoters={getUniqueValues('promotor')}
              onClearFilters={clearAllFilters}
              onExportCSV={handleExportCSV}
              onNewOffer={() => setShowCreateDialog(true)}
              onDeleteOffer={handleDeleteOffer}
              onEditOffer={(offer) => { setSelectedOffer(offer); setShowEditDialog(true); }}
              onOpenFolder={handleOpenFolder}
              onCreateMissingFolder={handleCreateMissingFolder}
              foldersLoading={foldersLoading}
              folderErrors={folderErrors}
              columns={columns}
              setColumns={setColumns}
              getColumnVisibility={getColumnVisibility}
            />
          </TabsContent>
        </Tabs>

        <CreateBookingWizard open={showCreateWizard} onOpenChange={setShowCreateWizard} onOfferCreated={refreshAll} />
        <CreateBookingDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onBookingCreated={refreshAll} />
        <EditBookingTemplateDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog} onTemplateUpdated={() => { fetchTemplateFields(); checkAllFolders(); checkAllContracts(); }} />
        {selectedOffer && (
          <EditBookingOfferDialog open={showEditDialog} onOpenChange={setShowEditDialog} offer={selectedOffer} onOfferUpdated={refreshAll} templateFields={templateFields} />
        )}
        <GlobalSearchDialog open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />
        <EventFolderDialog open={showFolderDialog} onOpenChange={setShowFolderDialog} offer={selectedFolderOffer} />
      </div>
    </div>
  );
}
