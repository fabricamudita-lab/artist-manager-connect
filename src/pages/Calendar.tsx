import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { useState, useEffect } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, Plus, Filter } from 'lucide-react';
import { CreateEventDialog } from '@/components/CreateEventDialog';
import { ArtistSelector } from '@/components/ArtistSelector';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  location: string | null;
  artist_id: string;
}

export default function Calendar() {
  usePageTitle('Calendario');
  const { profile, loading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      // Initialize with current user selected
      setSelectedArtists([profile.id]);
    }
  }, [profile]);

  useEffect(() => {
    if (profile && selectedArtists.length > 0) {
      fetchEvents();
    }
  }, [profile, selectedArtists]);

  const fetchEvents = async () => {
    try {
      if (profile?.role === 'management') {
        // Management users see events for selected artists (created by them or associated with selected artists)
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .or(`created_by.eq.${profile.id},artist_id.in.(${selectedArtists.join(',')})`)
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching events:', error);
        } else {
          // Filter events to only show those related to selected artists
          const filteredEvents = data?.filter(event => 
            selectedArtists.includes(event.artist_id) || 
            event.created_by === profile.id
          ) || [];
          setEvents(filteredEvents);
        }
      } else {
        // Artists see events they are associated with (filtered by selection if they can see others)
        const artistFilter = selectedArtists.length > 0 ? selectedArtists : [profile.id];
        
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            event_artists!inner(artist_id)
          `)
          .in('event_artists.artist_id', artistFilter)
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching events:', error);
        } else {
          setEvents(data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), date)
    );
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const eventDates = events.map(event => new Date(event.start_date));

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Cargando calendario...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center">Error: No se pudo cargar el perfil</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Calendario Profesional</h1>
        </div>
        <CreateEventDialog onEventCreated={fetchEvents} />
      </div>

      {/* Artist Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrar por Artistas
          </CardTitle>
          <CardDescription>
            Selecciona los artistas cuyos eventos quieres ver
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArtistSelector
            selectedArtists={selectedArtists}
            onSelectionChange={setSelectedArtists}
            placeholder="Seleccionar artistas para mostrar sus eventos..."
            showSelfOption={true}
          />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>
              Selecciona una fecha para ver los eventos programados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Eventos para {selectedDate ? format(selectedDate, 'PPPP', { locale: es }) : 'hoy'}
            </CardTitle>
            <CardDescription>
              {eventsLoading ? 'Cargando eventos...' : `${selectedDateEvents.length} evento(s) programado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {eventsLoading ? (
              <div className="text-center py-4">Cargando eventos...</div>
            ) : selectedDateEvents.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay eventos programados para esta fecha
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant="outline">{event.event_type}</Badge>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(event.start_date), 'HH:mm', { locale: es })} - 
                      {format(new Date(event.end_date), 'HH:mm', { locale: es })}
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}