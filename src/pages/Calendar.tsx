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
import { CalendarIcon, Clock, MapPin, Plus, Filter, Calendar as CalendarWeekIcon, ExternalLink, CalendarDays, ZoomOut } from 'lucide-react';
import { CreateEventDialog } from '@/components/CreateEventDialog';
import { ArtistSelector } from '@/components/ArtistSelector';
import { YearlyCalendar } from '@/components/YearlyCalendar';

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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'year'>('day');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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
      if (profile?.active_role === 'management') {
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

  const getEventsForWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  };

  const selectedDateEvents = selectedDate && viewMode !== 'year' ? 
    (viewMode === 'day' ? getEventsForDate(selectedDate) : getEventsForWeek(selectedDate)) : [];

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
    <div className="container-moodita section-spacing space-y-8">
      {/* Hero Header */}
      <div className="card-moodita p-8 bg-gradient-hero text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-playfair font-bold">Calendario Profesional</h1>
                <p className="text-white/90">Organiza y visualiza todos tus eventos</p>
              </div>
            </div>
          </div>
          <CreateEventDialog onEventCreated={fetchEvents} />
        </div>
      </div>

      {/* Artist Selector */}
      <div className="card-moodita hover-lift">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Filter className="h-4 w-4 text-primary" />
            </div>
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
      </div>
      
      {viewMode === 'year' ? (
        <div className="card-moodita hover-lift">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentYear(prev => prev - 1)}
                  size="sm"
                >
                  ← {currentYear - 1}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentYear(prev => prev + 1)}
                  size="sm"
                >
                  {currentYear + 1} →
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="transition-swift hover-lift"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Día
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="transition-swift hover-lift"
                >
                  <CalendarWeekIcon className="h-4 w-4 mr-2" />
                  Semana
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setViewMode('year')}
                  className="transition-swift hover-lift"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Año
                </Button>
              </div>
            </div>
            
            <YearlyCalendar
              year={currentYear}
              events={events}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setViewMode('day');
              }}
              selectedDate={selectedDate}
            />
          </CardContent>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Card */}
          <div className="card-moodita hover-lift">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Calendario Interactivo</CardTitle>
              <CardDescription>
                Selecciona una fecha para ver los eventos programados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-xl border-0 bg-muted/30 shadow-soft"
              />
            </CardContent>
          </div>

          {/* Events Card */}
          <div className="card-moodita">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    Eventos para {selectedDate ? format(selectedDate, viewMode === 'day' ? 'PPPP' : viewMode === 'week' ? "'semana del' PPP" : 'PPPP', { locale: es }) : 'hoy'}
                  </CardTitle>
                  <CardDescription>
                    {eventsLoading ? 'Cargando eventos...' : `${selectedDateEvents.length} evento(s) programado(s)`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('day')}
                    className="transition-swift hover-lift"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Día
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('week')}
                    className="transition-swift hover-lift"
                  >
                    <CalendarWeekIcon className="h-4 w-4 mr-2" />
                    Semana
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('year')}
                    className="transition-swift hover-lift"
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Año
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Cargando eventos...</p>
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-2">No hay eventos</h3>
                    <p className="text-muted-foreground text-sm">
                      No hay eventos programados para este {viewMode === 'day' ? 'día' : viewMode === 'week' ? 'período' : 'fecha'}
                    </p>
                  </div>
                </div>
              ) : (
                selectedDateEvents.map((event) => (
                  <div key={event.id} className="card-interactive p-6 space-y-3 hover-glow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                          <CalendarIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          {viewMode === 'week' && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {format(new Date(event.start_date), 'EEE dd', { locale: es })}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge className="badge-info">{event.event_type}</Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {format(new Date(event.start_date), 'HH:mm', { locale: es })} - 
                          {format(new Date(event.end_date), 'HH:mm', { locale: es })}
                        </span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-secondary" />
                          <span className="font-medium">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
        </div>
      )}
    </div>
  );
}