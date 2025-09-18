import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Users, PlusCircle, DollarSign, LogOut, TrendingUp, Music, Radio, Receipt, Headphones, Mic, Globe, Clock, MapPin, MessageCircle, Edit, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import InviteArtistDialog from '@/components/InviteArtistDialog';
import NotificationBell from '@/components/NotificationBell';
import { ArtistInfoDialog } from '@/components/ArtistInfoDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ArtistProfileDialog } from '@/components/ArtistProfileDialog';
import { useNavigate } from 'react-router-dom';

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  event_type: string;
  artist_id: string;
}

export default function ManagementDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTimeframe, setEventTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [newArtist, setNewArtist] = useState({
    email: '',
    full_name: '',
    role: 'artist'
  });

  // Dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [artistInfoDialog, setArtistInfoDialog] = useState<{ open: boolean; artistId: string | null }>({
    open: false,
    artistId: null
  });
  const [artistProfileDialog, setArtistProfileDialog] = useState<{ open: boolean; artistId: string | null }>({
    open: false,
    artistId: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch artists
      const { data: artistsData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('active_role', 'artist')
        .order('full_name');

      // Fetch events
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { data: eventsData } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_artist_id_fkey(full_name)
        `)
        .gte('start_date', startDate.toISOString())
        .lte('start_date', endDate.toISOString())
        .order('start_date');

      setArtists((artistsData as any) || []);
      setEvents((eventsData as any) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openArtistInfo = (artistId: string) => {
    setArtistInfoDialog({ open: true, artistId });
  };

  const openArtistProfile = (artistId: string) => {
    setArtistProfileDialog({ open: true, artistId });
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'concert': return '🎤';
      case 'interview': return '📻';
      case 'recording': return '🎧';
      case 'meeting': return '💼';
      case 'rehearsal': return '🎵';
      default: return '📅';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'concert': return 'bg-purple-100 text-purple-800';
      case 'interview': return 'bg-blue-100 text-blue-800';
      case 'recording': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-orange-100 text-orange-800';
      case 'rehearsal': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold font-playfair bg-gradient-primary bg-clip-text text-transparent">
            MOODITA
          </h1>
          <p className="text-muted-foreground">Bienvenido, {profile?.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </div>

      <Tabs defaultValue="artists" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="artists" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Artistas
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Finanzas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="artists">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestión de Artistas</h2>
              <Button onClick={() => setShowInviteDialog(true)} className="btn-primary">
                <PlusCircle className="w-4 h-4 mr-2" />
                Invitar Artista
              </Button>
            </div>

            {artists.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No hay artistas registrados aún.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {artists.map((artist) => (
                  <Card key={artist.id} className="card-professional hover-glow group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {artist.full_name}
                            </CardTitle>
                            <CardDescription className="text-xs">{artist.email}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openArtistInfo(artist.id)}
                          className="hover-lift flex-1"
                        >
                          <User className="w-4 h-4 mr-1" />
                          Ver Info
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/chat?artist=${artist.id}`)}
                          className="hover-lift flex-1"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Próximos Eventos</h2>
              <Button onClick={() => navigate('/calendar')} variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Ver Calendario Completo
              </Button>
            </div>

            {events.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No hay eventos programados para los próximos 30 días.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {events.map((event) => (
                  <Card key={event.id} className="card-professional hover-glow group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-lg">
                            {getEventTypeIcon(event.event_type)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {event.title}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {event.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={getEventTypeColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/calendar')}
                        className="hover-lift w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Resumen Financiero</h2>
            
            {/* Resumen de ingresos */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Ingresos este mes
                  </CardTitle>
                  <CardDescription>Total de ingresos de todos los artistas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">€0</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    0% desde el mes pasado
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Eventos facturados
                  </CardTitle>
                  <CardDescription>Eventos completados y facturados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Este mes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Distribución por tipo de evento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  Distribución de Ingresos
                </CardTitle>
                <CardDescription>Desglose por tipo de evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Conciertos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Entrevistas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Otros eventos</div>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <Receipt className="w-4 h-4 mr-2" />
                  Ver Informe Detallado
                </Button>
              </CardContent>
            </Card>

            {/* Otros ingresos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Otros Ingresos
                </CardTitle>
                <CardDescription>Masterclasses, sesiones de estudio, features y otros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Features/Collabs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Sesiones estudio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Masterclasses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Fan subscriptions</div>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Registrar Ingreso
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteArtistDialog
        onArtistInvited={fetchData}
      />

      <ArtistInfoDialog
        artistId={artistInfoDialog.artistId}
        open={artistInfoDialog.open}
        onOpenChange={(open) => setArtistInfoDialog({ open, artistId: null })}
        onChatOpen={(artistId) => {
          setArtistInfoDialog({ open: false, artistId: null });
          navigate(`/chat?artist=${artistId}`);
        }}
      />

      <ArtistProfileDialog
        open={artistProfileDialog.open}
        onOpenChange={(open) => setArtistProfileDialog(prev => ({ ...prev, open }))}
        artistId={artistProfileDialog.artistId}
      />
    </div>
  );
}