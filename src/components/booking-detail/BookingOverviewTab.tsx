import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { BookingNotes } from './BookingNotes';
import { LinkedSolicitudesCard } from './LinkedSolicitudesCard';

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
  };
  onUpdate: () => void;
}

export function BookingOverviewTab({ booking, onUpdate }: BookingOverviewTabProps) {
  const [artistNotes, setArtistNotes] = useState(booking.info_comentarios || '');
  const [saving, setSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [tourManagerContact, setTourManagerContact] = useState<Contact | null>(null);
  const [contactoContact, setContactoContact] = useState<Contact | null>(null);
  const [promotorContact, setPromotorContact] = useState<Contact | null>(null);

  // Fetch contacts by name or ID
  useEffect(() => {
    const fetchContacts = async () => {
      // Fetch Tour Manager contact
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

      // Fetch Contacto
      if (booking.contacto) {
        const { data } = await supabase
          .from('contacts')
          .select('id, name, stage_name')
          .or(`name.ilike.%${booking.contacto}%,stage_name.ilike.%${booking.contacto}%`)
          .limit(1)
          .single();
        if (data) setContactoContact(data);
      }

      // Fetch Promotor
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

            {/* Logistics inline if present */}
            {booking.logistica && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Logística</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.logistica}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes Section - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Artist Notes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Notas del Artista
              </CardTitle>
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
            <p className="text-xs text-muted-foreground">
              Visibles para el artista
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={artistNotes}
              onChange={(e) => {
                setArtistNotes(e.target.value);
                setHasChanged(true);
              }}
              placeholder="Horarios, requerimientos, acceso..."
              className="min-h-[120px] resize-none"
            />
          </CardContent>
        </Card>

        {/* Internal Notes */}
        <BookingNotes bookingId={booking.id} />
      </div>

      {/* Linked Solicitudes */}
      <LinkedSolicitudesCard bookingId={booking.id} />
    </div>
  );
}
