import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Bell, MessageCircle, FileText, DollarSign, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Request {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
}

interface FinancialReport {
  id: string;
  title: string;
  type: string;
  amount: number;
  period_start: string;
  period_end: string;
  description: string;
}

export default function ArtistDashboard() {
  const { profile, signOut } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [financialReports, setFinancialReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch requests
      const { data: requestsData } = await supabase
        .from('requests')
        .select('*')
        .eq('artist_id', profile?.id)
        .order('created_at', { ascending: false });

      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('artist_id', profile?.id)
        .order('start_date', { ascending: true });

      // Fetch financial reports
      const { data: financialData } = await supabase
        .from('financial_reports')
        .select('*')
        .eq('artist_id', profile?.id)
        .order('created_at', { ascending: false });

      setRequests(requestsData || []);
      setEvents(eventsData || []);
      setFinancialReports(financialData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return '🎤';
      case 'interview': return '🎙️';
      case 'consultation': return '💬';
      default: return '📄';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard - Artista</h1>
              <p className="text-muted-foreground">Bienvenido, {profile?.full_name}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Solicitudes
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Finanzas
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Solicitudes Pendientes</h2>
              {requests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No tienes solicitudes pendientes.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {requests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getTypeIcon(request.type)}</span>
                            <div>
                              <CardTitle className="text-lg">{request.title}</CardTitle>
                              <CardDescription>Tipo: {request.type}</CardDescription>
                            </div>
                          </div>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                        {request.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Fecha límite: {new Date(request.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Próximos Eventos</h2>
              {events.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No tienes eventos programados.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {events.map((event) => (
                    <Card key={event.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          {event.title}
                        </CardTitle>
                        <CardDescription>
                          {new Date(event.start_date).toLocaleDateString()} - {event.event_type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground">Ubicación: {event.location}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="financial">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Reportes Financieros</h2>
              {financialReports.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No hay reportes financieros disponibles.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {financialReports.map((report) => (
                    <Card key={report.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{report.title}</span>
                          <span className="text-2xl font-bold text-green-600">
                            ${report.amount.toLocaleString()}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          {report.type} - {new Date(report.period_start).toLocaleDateString()} al {' '}
                          {new Date(report.period_end).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      {report.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Documentos</h2>
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    La gestión de documentos estará disponible próximamente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}