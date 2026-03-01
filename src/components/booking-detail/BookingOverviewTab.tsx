import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Phone, 
  FileText, 
  Link as LinkIcon,
  Save,
  Music,
  Clock,
  ExternalLink,
  Lock,
  Eye,
  Receipt
} from 'lucide-react';
import { BookingNotes } from './BookingNotes';
import { PaymentStatusCard } from './PaymentStatusCard';

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
}

interface BookingOverviewTabProps {
  booking: {
    id: string;
    promotor?: string;
    contacto?: string;
    tour_manager?: string;
    tour_manager_new?: string;
    formato?: string;
    condiciones?: string;
    info_comentarios?: string;
    oferta?: string;
    link_venta?: string;
    inicio_venta?: string;
    es_cityzen?: boolean;
    fee?: number;
    pvp?: number;
    duracion?: string;
    invitaciones?: number;
    logistica?: string;
    contratos?: string;
    publico?: string;
    capacidad?: number;
    estado_facturacion?: string;
    // Payment fields
    festival_ciclo?: string;
    venue?: string;
    ciudad?: string;
    artist_id?: string;
    project_id?: string;
    comision_porcentaje?: number;
    fecha?: string;
    anticipo_porcentaje?: number;
    anticipo_importe?: number;
    anticipo_estado?: string;
    anticipo_fecha_esperada?: string;
    anticipo_fecha_cobro?: string;
    anticipo_referencia?: string;
    liquidacion_importe?: number;
    liquidacion_estado?: string;
    liquidacion_fecha_esperada?: string;
    liquidacion_fecha_cobro?: string;
    liquidacion_referencia?: string;
    cobro_estado?: string;
    cobro_fecha?: string;
    cobro_importe?: number;
    cobro_referencia?: string;
  };
  paymentRef?: React.Ref<HTMLDivElement>;
  paymentHighlighted?: boolean;
  onUpdate: () => void;
}

export function BookingOverviewTab({ booking, onUpdate, paymentRef, paymentHighlighted }: BookingOverviewTabProps) {
  const [artistNotes, setArtistNotes] = useState(booking.info_comentarios || '');
  const [saving, setSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [tourManagerContact, setTourManagerContact] = useState<Contact | null>(null);
  const [contactoContact, setContactoContact] = useState<Contact | null>(null);
  const [promotorContact, setPromotorContact] = useState<Contact | null>(null);

  // Fetch contacts by name or ID
  useEffect(() => {
    const fetchContacts = async () => {
      if (booking.tour_manager_new) {
        const { data } = await supabase
          .from('contacts')
          .select('id, name, stage_name')
          .eq('id', booking.tour_manager_new)
          .single();
        if (data) setTourManagerContact(data);
      } else if (booking.tour_manager) {
        const { data } = await supabase
          .from('contacts')
          .select('id, name, stage_name')
          .or(`name.ilike.%${booking.tour_manager}%,stage_name.ilike.%${booking.tour_manager}%`)
          .limit(1)
          .single();
        if (data) setTourManagerContact(data);
      }

      if (booking.contacto) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(booking.contacto);
        if (isUUID) {
          const { data } = await supabase
            .from('contacts')
            .select('id, name, stage_name')
            .eq('id', booking.contacto)
            .maybeSingle();
          if (data) setContactoContact(data);
        } else {
          const { data } = await supabase
            .from('contacts')
            .select('id, name, stage_name')
            .or(`name.ilike.%${booking.contacto}%,stage_name.ilike.%${booking.contacto}%`)
            .limit(1)
            .maybeSingle();
          if (data) setContactoContact(data);
        }
      }

      if (booking.promotor) {
        const { data } = await supabase
          .from('contacts')
          .select('id, name, stage_name')
          .or(`name.ilike.%${booking.promotor}%,stage_name.ilike.%${booking.promotor}%`)
          .limit(1)
          .single();
        if (data) setPromotorContact(data);
      }
    };

    fetchContacts();
  }, [booking.tour_manager, booking.tour_manager_new, booking.contacto, booking.promotor]);

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('booking_offers')
        .update({ info_comentarios: artistNotes })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Notas guardadas",
        description: "Las notas del artista se han actualizado.",
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const facturacionLabel = booking.estado_facturacion
    ? booking.estado_facturacion === 'pendiente' ? 'Pendiente'
      : booking.estado_facturacion === 'facturado' ? 'Facturado'
      : booking.estado_facturacion === 'cobrado' ? 'Cobrado'
      : booking.estado_facturacion.charAt(0).toUpperCase() + booking.estado_facturacion.slice(1)
    : 'Pendiente';

  return (
    <div className="space-y-6">
      {/* Top Row - Deal Summary + Promotor Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deal Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Resumen del Deal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Oferta / Fee</p>
                <p className="text-2xl font-bold text-primary">
                  {booking.fee ? `${booking.fee.toLocaleString()}€` : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">PVP Entradas</p>
                <p className="font-medium">{booking.pvp ? `${booking.pvp.toLocaleString()}€` : '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              {booking.formato && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    Formato
                  </p>
                  <p className="font-medium">{booking.formato}</p>
                </div>
              )}
              {booking.duracion && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duración
                  </p>
                  <p className="font-medium">{booking.duracion}</p>
                </div>
              )}
              {booking.publico && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Público</p>
                  <p className="font-medium capitalize">{booking.publico.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              {booking.capacidad && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Capacidad</p>
                  <p className="font-medium">{booking.capacidad.toLocaleString()}</p>
                </div>
              )}
              {booking.invitaciones !== undefined && booking.invitaciones !== null && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Invitaciones</p>
                  <p className="font-medium">{booking.invitaciones}</p>
                </div>
              )}
              {booking.contratos && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Contrato</p>
                  <Badge variant={booking.contratos === 'firmado' ? 'default' : 'secondary'} className="text-xs">
                    {booking.contratos === 'por_hacer' ? 'Por Hacer' : booking.contratos === 'enviado' ? 'Enviado' : 'Firmado'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Estado Facturación - moved from Quick Stats */}
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                Estado Facturación
              </p>
              <Badge 
                variant={booking.estado_facturacion === 'cobrado' ? 'default' : 'secondary'} 
                className="text-xs"
              >
                {facturacionLabel}
              </Badge>
            </div>

            {booking.condiciones && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Condiciones</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.condiciones}</p>
              </div>
            )}

            {booking.es_cityzen && (
              <div className="pt-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                  CityZen
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buyer / Promoter Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Promotor / Buyer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.promotor && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Empresa</p>
                {promotorContact ? (
                  <Link 
                    to={`/contacts?selected=${promotorContact.id}`} 
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    {booking.promotor}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="font-medium">{booking.promotor}</p>
                )}
              </div>
            )}

            {booking.contacto && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Contacto
                </p>
                {contactoContact ? (
                  <Link 
                    to={`/contacts?selected=${contactoContact.id}`} 
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    {contactoContact.stage_name || contactoContact.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="font-medium">{booking.contacto}</p>
                )}
              </div>
            )}

            {(booking.tour_manager || booking.tour_manager_new) && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Tour Manager
                </p>
                {tourManagerContact ? (
                  <Link 
                    to={`/contacts?selected=${tourManagerContact.id}`} 
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    {tourManagerContact.stage_name || tourManagerContact.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="font-medium">{booking.tour_manager}</p>
                )}
              </div>
            )}

            {booking.link_venta && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Link de Venta
                </p>
                <a 
                  href={booking.link_venta} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm break-all"
                >
                  {booking.link_venta}
                </a>
              </div>
            )}

            {booking.inicio_venta && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Inicio de Venta
                </p>
                <p className="font-medium">{booking.inicio_venta}</p>
              </div>
            )}

            {booking.logistica && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Logística</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.logistica}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Status */}
      <PaymentStatusCard
        ref={paymentRef}
        booking={booking}
        highlighted={paymentHighlighted}
        onUpdate={onUpdate}
      />

      {/* Unified Notes Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Notas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="team" className="flex items-center gap-2 text-sm">
                <Lock className="h-3.5 w-3.5" />
                Equipo
              </TabsTrigger>
              <TabsTrigger value="artist" className="flex items-center gap-2 text-sm">
                <Eye className="h-3.5 w-3.5" />
                Artista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="team">
              <p className="text-xs text-muted-foreground mb-3">Solo visible para el equipo</p>
              <BookingNotes bookingId={booking.id} />
            </TabsContent>

            <TabsContent value="artist">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Visible para el artista</p>
                  <Button 
                    size="sm" 
                    variant={hasChanged ? "default" : "outline"}
                    onClick={() => {
                      handleSaveNotes();
                      setHasChanged(false);
                    }}
                    disabled={saving || !hasChanged}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                <Textarea
                  value={artistNotes}
                  onChange={(e) => {
                    setArtistNotes(e.target.value);
                    setHasChanged(true);
                  }}
                  placeholder="Horarios, requerimientos, acceso..."
                  className="min-h-[120px] resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
