import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  Plus, 
  ArrowRight,
  Globe,
  Clock,
  Music,
  Users,
  AlertCircle,
  Film,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  FileWarning
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GlobalStats {
  totalArtists: number;
  totalBudgets: number;
  totalEPKs: number;
  totalRevenue: number;
  upcomingEvents: number;
  pendingSolicitudes: number;
  totalContacts: number;
  totalSyncOffers: number;
}

interface Trends {
  artists: number | null;
  revenue: number | null;
  events: number | null;
  solicitudes: number | null;
}

interface AttentionItem {
  id: string;
  type: 'solicitud_antigua' | 'booking_sin_contrato' | 'evento_sin_roadmap';
  label: string;
  sublabel?: string;
  route: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location?: string;
  event_type: string;
}

interface PendingSolicitud {
  id: string;
  nombre_solicitante: string;
  tipo: string;
  estado: string;
  fecha_creacion: string;
}

function TrendIndicator({ value }: { value: number | null }) {
  if (value === null) return null;
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(Math.round(value))}%
    </span>
  );
}

export function OwnerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats>({
    totalArtists: 0,
    totalBudgets: 0,
    totalEPKs: 0,
    totalRevenue: 0,
    upcomingEvents: 0,
    pendingSolicitudes: 0,
    totalContacts: 0,
    totalSyncOffers: 0
  });
  const [trends, setTrends] = useState<Trends>({
    artists: null,
    revenue: null,
    events: null,
    solicitudes: null
  });
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [pendingSolicitudes, setPendingSolicitudes] = useState<PendingSolicitud[]>([]);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const calcTrend = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

  const fetchGlobalData = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // ---- Existing queries ----

      // Fetch artists count
      const { count: artistsCount } = await supabase
        .from('artists')
        .select('*', { count: 'exact', head: true });

      // Fetch budgets count
      const { count: budgetsCount } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true });

      // Fetch EPKs count
      const { count: epksCount } = await supabase
        .from('epks')
        .select('*', { count: 'exact', head: true });

      // Fetch upcoming events
      const { data: eventsData, count: eventsCount } = await supabase
        .from('events')
        .select('id, title, start_date, location, event_type', { count: 'exact' })
        .gte('start_date', now.toISOString())
        .lte('start_date', thirtyDaysFromNow.toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      // Fetch pending solicitudes
      const { data: solicitudesData, count: solicitudesCount } = await supabase
        .from('solicitudes')
        .select('id, nombre_solicitante, tipo, estado, fecha_creacion', { count: 'exact' })
        .eq('estado', 'pendiente')
        .order('fecha_creacion', { ascending: false })
        .limit(5);

      // Fetch contacts count
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Calculate total revenue from all bookings
      const { data: bookingsData } = await supabase
        .from('booking_offers')
        .select('fee')
        .eq('estado', 'confirmado');

      const totalRevenue = bookingsData?.reduce((sum, b) => sum + (b.fee || 0), 0) || 0;

      // Fetch sync offers count (active ones, not yet invoiced)
      const { count: syncCount } = await supabase
        .from('sync_offers')
        .select('*', { count: 'exact', head: true })
        .not('phase', 'eq', 'facturado');

      // ---- Trend queries (previous 30 days) ----

      // Artists created before 30 days ago
      const { count: prevArtistsCount } = await supabase
        .from('artists')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Revenue from bookings confirmed before 30 days ago
      const { data: prevBookingsData } = await supabase
        .from('booking_offers')
        .select('fee')
        .eq('estado', 'confirmado')
        .lt('created_at', thirtyDaysAgo.toISOString());
      const prevRevenue = prevBookingsData?.reduce((sum, b) => sum + (b.fee || 0), 0) || 0;

      // New artists in last 30 days vs previous 30 days
      const newArtistsNow = (artistsCount || 0) - (prevArtistsCount || 0);
      const { count: artistsBefore60 } = await supabase
        .from('artists')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', sixtyDaysAgo.toISOString());
      const newArtistsPrev = (prevArtistsCount || 0) - (artistsBefore60 || 0);

      // Revenue this period vs last
      const revenueNow = totalRevenue - prevRevenue;
      const { data: oldBookingsData } = await supabase
        .from('booking_offers')
        .select('fee')
        .eq('estado', 'confirmado')
        .lt('created_at', sixtyDaysAgo.toISOString());
      const oldRevenue = oldBookingsData?.reduce((sum, b) => sum + (b.fee || 0), 0) || 0;
      const revenuePrev = prevRevenue - oldRevenue;

      // Events previous period
      const prevPeriodStart = new Date(thirtyDaysAgo);
      const prevPeriodEnd = new Date(now);
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 30);
      const { count: prevEventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', prevPeriodStart.toISOString())
        .lte('start_date', thirtyDaysAgo.toISOString());

      // Solicitudes pending previous period
      const { count: prevSolicitudesCount } = await supabase
        .from('solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
        .lt('fecha_creacion', thirtyDaysAgo.toISOString());

      // ---- Attention items ----
      const items: AttentionItem[] = [];

      // 1. Solicitudes pendientes > 48h
      const { data: oldSolicitudes } = await supabase
        .from('solicitudes')
        .select('id, nombre_solicitante')
        .eq('estado', 'pendiente')
        .lt('fecha_creacion', fortyEightHoursAgo.toISOString())
        .limit(5);

      oldSolicitudes?.forEach(s => {
        items.push({
          id: `sol-${s.id}`,
          type: 'solicitud_antigua',
          label: `Solicitud pendiente: ${s.nombre_solicitante}`,
          sublabel: 'Más de 48h sin respuesta',
          route: `/solicitudes?id=${s.id}`
        });
      });

      // 2. Bookings confirmados sin contrato
      const { data: confirmedBookings } = await supabase
        .from('booking_offers')
        .select('id, festival_ciclo, ciudad, venue')
        .eq('estado', 'confirmado')
        .limit(50);

      if (confirmedBookings && confirmedBookings.length > 0) {
        const bookingIds = confirmedBookings.map(b => b.id);
        const { data: docsData } = await supabase
          .from('booking_documents')
          .select('booking_id')
          .in('booking_id', bookingIds)
          .eq('document_type', 'contrato');

        const bookingsWithContract = new Set(docsData?.map(d => d.booking_id) || []);
        confirmedBookings
          .filter(b => !bookingsWithContract.has(b.id))
          .slice(0, 3)
          .forEach(b => {
            items.push({
              id: `bk-${b.id}`,
              type: 'booking_sin_contrato',
              label: `Booking sin contrato: ${b.festival_ciclo || b.ciudad || 'Sin nombre'}`,
              sublabel: b.venue || undefined,
              route: `/booking/${b.id}`
            });
          });
      }

      // 3. Eventos próximos 7 días sin roadmap
      const { data: nearEvents } = await supabase
        .from('events')
        .select('id, title')
        .gte('start_date', now.toISOString())
        .lte('start_date', sevenDaysFromNow.toISOString())
        .limit(20);

      if (nearEvents && nearEvents.length > 0) {
        // Check which have roadmaps via booking_offers -> tour_roadmap_bookings
        const { data: eventsWithBookings } = await supabase
          .from('booking_offers')
          .select('event_id')
          .in('event_id', nearEvents.map(e => e.id));

        const eventIdsWithBooking = new Set(eventsWithBookings?.map(b => b.event_id).filter(Boolean) || []);
        
        nearEvents
          .filter(e => !eventIdsWithBooking.has(e.id))
          .slice(0, 3)
          .forEach(e => {
            items.push({
              id: `ev-${e.id}`,
              type: 'evento_sin_roadmap',
              label: `Evento sin booking: ${e.title}`,
              sublabel: 'Próximos 7 días',
              route: `/calendar`
            });
          });
      }

      // ---- Set all state ----
      setStats({
        totalArtists: artistsCount || 0,
        totalBudgets: budgetsCount || 0,
        totalEPKs: epksCount || 0,
        totalRevenue,
        upcomingEvents: eventsCount || 0,
        pendingSolicitudes: solicitudesCount || 0,
        totalContacts: contactsCount || 0,
        totalSyncOffers: syncCount || 0
      });

      setTrends({
        artists: calcTrend(newArtistsNow, newArtistsPrev),
        revenue: calcTrend(revenueNow, revenuePrev),
        events: calcTrend(eventsCount || 0, prevEventsCount || 0),
        solicitudes: calcTrend(solicitudesCount || 0, prevSolicitudesCount || 0)
      });

      setAttentionItems(items);
      setUpcomingEvents(eventsData || []);
      setPendingSolicitudes(solicitudesData || []);

    } catch (error) {
      console.error('Error fetching global data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos globales.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const attentionIcon = {
    solicitud_antigua: <Clock className="h-4 w-4 text-amber-500" />,
    booking_sin_contrato: <FileWarning className="h-4 w-4 text-red-500" />,
    evento_sin_roadmap: <AlertTriangle className="h-4 w-4 text-orange-500" />
  };

  return (
    <div className="space-y-6">
      {/* Global Business Summary Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Resumen Global del Negocio</h2>
        </div>
        <p className="text-muted-foreground">Vista agregada de todos los artistas y proyectos</p>
      </div>

      {/* Attention Section */}
      <Card className={attentionItems.length > 0 ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20' : 'border-green-300 dark:border-green-700 bg-green-50/40 dark:bg-green-950/20'}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {attentionItems.length > 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Requiere Atención ({attentionItems.length})
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Todo al día
                </>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {attentionItems.length === 0 ? (
            <p className="text-sm text-green-700 dark:text-green-400">No hay items que requieran atención inmediata. ¡Buen trabajo!</p>
          ) : (
            <div className="space-y-2">
              {attentionItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 hover:bg-background cursor-pointer transition-colors"
                  onClick={() => navigate(item.route)}
                >
                  {attentionIcon[item.type]}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.sublabel && <p className="text-xs text-muted-foreground">{item.sublabel}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/budgets')} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
        <Button onClick={() => navigate('/mi-management')} variant="outline">
          <Users className="h-4 w-4 mr-2" />
          Ver Artistas
        </Button>
        <Button onClick={() => navigate('/calendar')} variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Calendario Global
        </Button>
      </div>

      {/* Primary Stats Cards (large) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-purple-500/5 to-background" onClick={() => navigate('/mi-management')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Artistas</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{stats.totalArtists}</p>
                  <TrendIndicator value={trends.artists} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">En management</p>
              </div>
              <div className="h-14 w-14 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Music className="h-7 w-7 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-green-500/5 to-background" onClick={() => navigate('/finanzas')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">€{stats.totalRevenue.toLocaleString()}</p>
                  <TrendIndicator value={trends.revenue} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Bookings confirmados</p>
              </div>
              <div className="h-14 w-14 bg-green-500/10 rounded-xl flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Cards (compact) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/calendar')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.upcomingEvents}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Eventos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/solicitudes')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.pendingSolicitudes}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Solicitudes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/sincronizaciones')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Film className="h-5 w-5 text-pink-500 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.totalSyncOffers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sync</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.totalBudgets}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Presupuestos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.totalEPKs}</p>
              <p className="text-xs text-muted-foreground mt-0.5">EPKs</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stats.totalContacts}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Contactos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Solicitudes Alert */}
      {pendingSolicitudes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Solicitudes Pendientes</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/solicitudes')}>
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingSolicitudes.map((sol) => (
                <div
                  key={sol.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background cursor-pointer transition-colors"
                  onClick={() => navigate(`/solicitudes?id=${sol.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{sol.nombre_solicitante}</p>
                    <p className="text-xs text-muted-foreground">{sol.tipo}</p>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                    Pendiente
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Próximos Eventos (Todos los artistas)
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
              Ver calendario
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex-shrink-0 w-48 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <p className="font-medium text-sm truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.start_date), "d MMM, HH:mm", { locale: es })}
                  </p>
                  {event.location && (
                    <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                  )}
                  <Badge variant="outline" className="mt-2 text-xs">
                    {event.event_type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
