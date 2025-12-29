import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, FileText, Plane, Receipt, Edit, ExternalLink, Copy, Share2, Copy as Duplicate, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/useCommon';
import { getStatusBadgeVariant } from '@/lib/statusColors';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingOverviewTab } from '@/components/booking-detail/BookingOverviewTab';
import { BookingItineraryTab } from '@/components/booking-detail/BookingItineraryTab';
import { BookingExpensesTab } from '@/components/booking-detail/BookingExpensesTab';
import { BookingDocumentsTab } from '@/components/booking-detail/BookingDocumentsTab';
import { BookingFilesWidget } from '@/components/booking-detail/BookingFilesWidget';
import { BookingDriveTab } from '@/components/booking-detail/BookingDriveTab';
import { EditBookingDialog } from '@/components/booking-detail/EditBookingDialog';
import { ShareBookingDialog } from '@/components/booking-detail/ShareBookingDialog';
import { ViabilityChecksCard } from '@/components/booking-detail/ViabilityChecksCard';
import { AvailabilityStatusCard } from '@/components/booking-detail/AvailabilityStatusCard';
import { RequestAvailabilityDialog } from '@/components/booking-detail/RequestAvailabilityDialog';
interface Artist {
  id: string;
  name: string;
  stage_name?: string;
}

interface BookingOffer {
  id: string;
  fecha?: string;
  hora?: string;
  duracion?: string;
  festival_ciclo?: string;
  ciudad?: string;
  pais?: string;
  lugar?: string;
  venue?: string;
  capacidad?: number;
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
  tour_manager?: string;
  tour_manager_new?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  logistica?: string;
  publico?: string;
  invitaciones?: number;
  notas?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  folder_url?: string;
  created_by?: string;
  created_at: string;
  artist?: Artist;
  adjuntos?: any;
  // Viability fields
  viability_manager_approved?: boolean;
  viability_manager_at?: string;
  viability_tour_manager_approved?: boolean;
  viability_tour_manager_at?: string;
  viability_production_approved?: boolean;
  viability_production_at?: string;
  viability_notes?: string;
}
export default function BookingDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [availabilityBlocked, setAvailabilityBlocked] = useState(false);
  usePageTitle(booking?.festival_ciclo || booking?.venue || 'Detalle Evento');
  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);
  const fetchBooking = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('booking_offers').select('*, artist:artists(id, name, stage_name)').eq('id', id).single();
      if (error) throw error;
      // Normalize artist to handle array response
      const normalizedData = data ? {
        ...data,
        artist: Array.isArray(data.artist) ? data.artist[0] : data.artist
      } : null;
      setBooking(normalizedData);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el evento.",
        variant: "destructive"
      });
      navigate('/booking');
    } finally {
      setLoading(false);
    }
  };
  const handleBookingUpdate = () => {
    fetchBooking();
  };
  const handleDuplicate = async () => {
    if (!booking) return;
    setIsDuplicating(true);
    try {
      const {
        id,
        created_at,
        ...bookingData
      } = booking;
      const duplicatedBooking = {
        ...bookingData,
        phase: 'interes',
        created_by: bookingData.created_by || 'unknown'
      };
      const {
        data,
        error
      } = await supabase.from('booking_offers').insert([duplicatedBooking]).select().single();
      if (error) throw error;
      toast({
        title: "Evento duplicado",
        description: "El evento se ha duplicado correctamente. Redirigiendo..."
      });

      // Navigate to the new duplicated booking
      if (data?.id) {
        navigate(`/booking/${data.id}`);
      }
    } catch (error) {
      console.error('Error duplicating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo duplicar el evento.",
        variant: "destructive"
      });
    } finally {
      setIsDuplicating(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="container-moodita section-spacing space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>;
  }
  if (!booking) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Evento no encontrado</p>
          <Button onClick={() => navigate('/booking')} className="mt-4">
            Volver a Booking
          </Button>
        </Card>
      </div>;
  }
  const eventName = booking.festival_ciclo || booking.venue || 'Evento';
  const eventDate = booking.fecha ? format(new Date(booking.fecha), "EEEE d 'de' MMMM, yyyy", {
    locale: es
  }) : null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/booking')} className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">
                  {eventName}
                </h1>
                <Badge variant={getStatusBadgeVariant(booking.estado || 'pendiente')}>
                  {booking.estado || 'pendiente'}
                </Badge>
                {booking.artist && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {booking.artist.stage_name || booking.artist.name}
                  </Badge>
                )}
                {booking.es_internacional && <Badge variant="outline" className="border-blue-500 text-blue-600">
                    Internacional
                  </Badge>}
              </div>
              
              <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                {eventDate && <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {eventDate}
                    {booking.hora && ` - ${booking.hora}`}
                  </span>}
                {(booking.ciudad || booking.venue) && <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {[booking.venue, booking.ciudad, booking.pais].filter(Boolean).join(', ')}
                  </span>}
                {booking.capacidad && <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {booking.capacidad.toLocaleString()} cap.
                  </span>}
              </div>
              
              {/* Fechas opcionales */}
              {booking.adjuntos?.fechas_opcionales && booking.adjuntos.fechas_opcionales.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-xs text-muted-foreground">Fechas opcionales:</span>
                  {booking.adjuntos.fechas_opcionales.map((fecha: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {format(new Date(fecha), "d MMM yyyy", { locale: es })}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Info Button */}
            <Button variant="outline" size="sm" onClick={() => {
            const eventName = booking.festival_ciclo || booking.venue || 'Evento';
            const sections = [];
            
            // Header
            sections.push(`📅 ${eventName}`);
            sections.push('═'.repeat(40));
            
            // Fecha y lugar
            const fechaSection = [];
            if (booking.fecha) {
              fechaSection.push(`Fecha: ${format(new Date(booking.fecha), "d 'de' MMMM, yyyy", { locale: es })}${booking.hora ? ` - ${booking.hora}` : ''}`);
            }
            if (booking.venue) fechaSection.push(`Venue: ${booking.venue}`);
            if (booking.lugar) fechaSection.push(`Lugar: ${booking.lugar}`);
            if (booking.ciudad || booking.pais) {
              fechaSection.push(`📍 ${[booking.ciudad, booking.pais].filter(Boolean).join(', ')}`);
            }
            if (booking.capacidad) fechaSection.push(`Capacidad: ${booking.capacidad.toLocaleString()}`);
            if (fechaSection.length > 0) sections.push(fechaSection.join('\n'));
            
            // Promotor y contacto
            const contactoSection = [];
            if (booking.promotor) contactoSection.push(`Promotor: ${booking.promotor}`);
            if (booking.contacto) contactoSection.push(`Contacto: ${booking.contacto}`);
            if (booking.tour_manager) contactoSection.push(`Tour Manager: ${booking.tour_manager}`);
            if (contactoSection.length > 0) {
              sections.push('');
              sections.push('👤 CONTACTOS');
              sections.push(contactoSection.join('\n'));
            }
            
            // Financiero
            const finSection = [];
            if (booking.fee) finSection.push(`Fee: ${booking.fee.toLocaleString()}€`);
            if (booking.oferta) finSection.push(`Oferta: ${booking.oferta}`);
            if (booking.gastos_estimados) finSection.push(`Gastos Estimados: ${booking.gastos_estimados.toLocaleString()}€`);
            if (booking.comision_porcentaje) finSection.push(`Comisión: ${booking.comision_porcentaje}%`);
            if (booking.comision_euros) finSection.push(`Comisión (€): ${booking.comision_euros.toLocaleString()}€`);
            if (finSection.length > 0) {
              sections.push('');
              sections.push('💰 FINANCIERO');
              sections.push(finSection.join('\n'));
            }
            
            // Detalles del evento
            const detallesSection = [];
            if (booking.formato) detallesSection.push(`Formato: ${booking.formato}`);
            if (booking.duracion) detallesSection.push(`Duración: ${booking.duracion}`);
            if (booking.publico) detallesSection.push(`Público: ${booking.publico}`);
            if (booking.estado) detallesSection.push(`Estado: ${booking.estado}`);
            if (booking.phase) detallesSection.push(`Fase: ${booking.phase}`);
            if (booking.es_internacional !== null) detallesSection.push(`Internacional: ${booking.es_internacional ? 'Sí' : 'No'}`);
            if (booking.es_cityzen !== null) detallesSection.push(`Cityzen: ${booking.es_cityzen ? 'Sí' : 'No'}`);
            if (detallesSection.length > 0) {
              sections.push('');
              sections.push('🎭 DETALLES');
              sections.push(detallesSection.join('\n'));
            }
            
            // Venta
            const ventaSection = [];
            if (booking.pvp) ventaSection.push(`PVP: ${booking.pvp}€`);
            if (booking.inicio_venta) ventaSection.push(`Inicio Venta: ${booking.inicio_venta}`);
            if (booking.link_venta) ventaSection.push(`Link Venta: ${booking.link_venta}`);
            if (booking.invitaciones) ventaSection.push(`Invitaciones: ${booking.invitaciones}`);
            if (ventaSection.length > 0) {
              sections.push('');
              sections.push('🎟️ VENTA');
              sections.push(ventaSection.join('\n'));
            }
            
            // Condiciones y logística
            const condicionesSection = [];
            if (booking.condiciones) condicionesSection.push(`Condiciones: ${booking.condiciones}`);
            if (booking.logistica) condicionesSection.push(`Logística: ${booking.logistica}`);
            if (booking.contratos) condicionesSection.push(`Contratos: ${booking.contratos}`);
            if (condicionesSection.length > 0) {
              sections.push('');
              sections.push('📋 CONDICIONES');
              sections.push(condicionesSection.join('\n'));
            }
            
            // Notas
            if (booking.notas || booking.info_comentarios) {
              sections.push('');
              sections.push('📝 NOTAS');
              if (booking.notas) sections.push(booking.notas);
              if (booking.info_comentarios) sections.push(booking.info_comentarios);
            }
            
            // Links
            if (booking.folder_url) {
              sections.push('');
              sections.push('🔗 ENLACES');
              sections.push(`Carpeta: ${booking.folder_url}`);
            }
            
            const info = sections.join('\n');
            navigator.clipboard.writeText(info);
            toast({
              title: "Copiado",
              description: "Información completa del evento copiada al portapapeles"
            });
          }}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Info
            </Button>
            
            {booking.folder_url && <Button variant="outline" size="sm" onClick={() => window.open(booking.folder_url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Carpeta
              </Button>}
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </Button>
          </div>

          {/* Edit Dialog */}
          <EditBookingDialog open={showEditDialog} onOpenChange={setShowEditDialog} booking={booking} onSuccess={handleBookingUpdate} />

          {/* Share Dialog */}
          <ShareBookingDialog open={showShareDialog} onOpenChange={setShowShareDialog} booking={booking} />
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fee</p>
                <p className="text-lg font-bold">{booking.fee ? `${booking.fee.toLocaleString()}€` : '-'}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Receipt className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos Est.</p>
                <p className="text-lg font-bold">{booking.gastos_estimados ? `${booking.gastos_estimados.toLocaleString()}€` : '-'}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comisión</p>
                <p className="text-lg font-bold">
                  {booking.comision_euros ? `${booking.comision_euros.toLocaleString()}€` : booking.comision_porcentaje ? `${booking.comision_porcentaje}%` : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Facturación</p>
                <p className="text-lg font-bold capitalize">{booking.estado_facturacion || 'Pendiente'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Tabs - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="itinerary" className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Itinerary
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Travel Expenses
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="drive" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Archivos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <BookingOverviewTab booking={booking} onUpdate={handleBookingUpdate} />
              </TabsContent>

              <TabsContent value="itinerary">
                <BookingItineraryTab bookingId={booking.id} eventDate={booking.fecha} />
              </TabsContent>

              <TabsContent value="expenses">
                <BookingExpensesTab bookingId={booking.id} booking={booking} />
              </TabsContent>

              <TabsContent value="documents">
                <BookingDocumentsTab booking={booking} onUpdate={handleBookingUpdate} />
              </TabsContent>

              <TabsContent value="drive">
                <BookingDriveTab 
                  bookingId={booking.id} 
                  artistId={booking.artist_id} 
                  folderUrl={booking.folder_url} 
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Availability + Viability Checks + Linked Files Widget */}
          <div className="space-y-6">
            <AvailabilityStatusCard
              bookingId={booking.id}
              onRequestAvailability={() => setShowAvailabilityDialog(true)}
              canConfirm={!availabilityBlocked}
              onBlockStatusChange={setAvailabilityBlocked}
            />
            <ViabilityChecksCard
              bookingId={booking.id}
              phase={booking.phase || 'interes'}
              viabilityManagerApproved={booking.viability_manager_approved}
              viabilityManagerAt={booking.viability_manager_at}
              viabilityTourManagerApproved={booking.viability_tour_manager_approved}
              viabilityTourManagerAt={booking.viability_tour_manager_at}
              viabilityProductionApproved={booking.viability_production_approved}
              viabilityProductionAt={booking.viability_production_at}
              viabilityNotes={booking.viability_notes}
              onUpdate={handleBookingUpdate}
            />
            <BookingFilesWidget bookingId={booking.id} artistId={booking.artist_id} />
          </div>
        </div>

        {/* Availability Dialog */}
        <RequestAvailabilityDialog
          open={showAvailabilityDialog}
          onOpenChange={setShowAvailabilityDialog}
          bookingId={booking.id}
          artistId={booking.artist_id}
          eventDate={booking.fecha}
          eventName={booking.festival_ciclo || booking.venue}
          onRequestCreated={handleBookingUpdate}
        />
      </div>
    </div>
  );
}