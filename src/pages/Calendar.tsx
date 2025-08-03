import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Music, Mic, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
  artist_id: string;
  created_by: string;
}

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

export default function Calendar() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: '',
    start_date: '',
    end_date: '',
    location: '',
    artist_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      // Fetch artists if user is management
      if (profile?.role === 'management') {
        const { data: artistsData } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'artist');
        setArtists(artistsData || []);
      }

      setEvents(eventsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEvent.title || !newEvent.start_date || !newEvent.event_type) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .insert({
          title: newEvent.title,
          description: newEvent.description,
          event_type: newEvent.event_type,
          start_date: newEvent.start_date,
          end_date: newEvent.end_date || newEvent.start_date,
          location: newEvent.location,
          artist_id: profile?.role === 'management' ? newEvent.artist_id : profile?.id,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evento creado correctamente.",
      });

      setNewEvent({
        title: '',
        description: '',
        event_type: '',
        start_date: '',
        end_date: '',
        location: '',
        artist_id: '',
      });
      setShowNewEventForm(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el evento.",
        variant: "destructive",
      });
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'concert': return <Music className="w-4 h-4" />;
      case 'interview': return <Mic className="w-4 h-4" />;
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'recording': return <Mic className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'concert': return 'bg-purple-500';
      case 'interview': return 'bg-blue-500';
      case 'meeting': return 'bg-green-500';
      case 'recording': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-6">Cargando calendario...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Calendario de Eventos</h1>
            <p className="text-muted-foreground">Gestiona conciertos, entrevistas y eventos importantes</p>
          </div>
          
          <Dialog open={showNewEventForm} onOpenChange={setShowNewEventForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Evento</DialogTitle>
                <DialogDescription>
                  Añade un nuevo evento al calendario
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Nombre del evento"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_type">Tipo de Evento *</Label>
                  <Select
                    value={newEvent.event_type}
                    onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concert">Concierto</SelectItem>
                      <SelectItem value="interview">Entrevista</SelectItem>
                      <SelectItem value="meeting">Reunión</SelectItem>
                      <SelectItem value="recording">Grabación</SelectItem>
                      <SelectItem value="rehearsal">Ensayo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {profile?.role === 'management' && (
                  <div className="space-y-2">
                    <Label htmlFor="artist">Artista</Label>
                    <Select
                      value={newEvent.artist_id}
                      onValueChange={(value) => setNewEvent({ ...newEvent, artist_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un artista" />
                      </SelectTrigger>
                      <SelectContent>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Fecha Inicio *</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={newEvent.start_date}
                      onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Fecha Fin</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={newEvent.end_date}
                      onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Lugar del evento"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Detalles adicionales del evento"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Crear Evento</Button>
                  <Button type="button" variant="outline" onClick={() => setShowNewEventForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No hay eventos programados</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer evento para empezar a organizar tu agenda
              </p>
              <Button onClick={() => setShowNewEventForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Evento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getEventTypeIcon(event.event_type)}
                      <div>
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <CardDescription>
                          {artists.find(a => a.id === event.artist_id)?.full_name || 'Artista'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getEventTypeColor(event.event_type)}>
                      {event.event_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(event.start_date)}</span>
                    {event.end_date && event.end_date !== event.start_date && (
                      <span>- {formatDate(event.end_date)}</span>
                    )}
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.description && (
                    <p className="text-sm">{event.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}