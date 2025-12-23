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
  TrendingUp,
  AlertCircle
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
    totalContacts: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [pendingSolicitudes, setPendingSolicitudes] = useState<PendingSolicitud[]>([]);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      
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
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: eventsData, count: eventsCount } = await supabase
        .from('events')
        .select('id, title, start_date, location, event_type', { count: 'exact' })
        .gte('start_date', new Date().toISOString())
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

      setStats({
        totalArtists: artistsCount || 0,
        totalBudgets: budgetsCount || 0,
        totalEPKs: epksCount || 0,
        totalRevenue,
        upcomingEvents: eventsCount || 0,
        pendingSolicitudes: solicitudesCount || 0,
        totalContacts: contactsCount || 0
      });

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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/mi-management')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Artistas</p>
                <p className="text-2xl font-bold">{stats.totalArtists}</p>
                <p className="text-xs text-muted-foreground">En management</p>
              </div>
              <div className="h-12 w-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Music className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/finanzas')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                <p className="text-2xl font-bold">€{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Bookings confirmados</p>
              </div>
              <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/calendar')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eventos</p>
                <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
                <p className="text-xs text-muted-foreground">Próximos 30 días</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/solicitudes')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Solicitudes</p>
                <p className="text-2xl font-bold">{stats.pendingSolicitudes}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
              <div className="h-12 w-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Presupuestos</p>
                <p className="text-2xl font-bold">{stats.totalBudgets}</p>
              </div>
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">EPKs</p>
                <p className="text-2xl font-bold">{stats.totalEPKs}</p>
              </div>
              <Globe className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contactos</p>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
              </div>
              <Users className="h-6 w-6 text-primary" />
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
