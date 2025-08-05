import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, Plus, Filter, ChevronLeft, ChevronRight, Calendar as CalendarViewIcon } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (profile) {
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
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .or(`created_by.eq.${profile.id},artist_id.in.(${selectedArtists.join(',')})`)
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching events:', error);
        } else {
          const filteredEvents = data?.filter(event => 
            selectedArtists.includes(event.artist_id) || 
            event.created_by === profile.id
          ) || [];
          setEvents(filteredEvents);
        }
      } else {
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

  const getEventsForWeek = (startDate: Date) => {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 });
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });
  };

  const getEventsForMonth = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subWeeks(currentDate, 1) 
      : addWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subMonths(currentDate, 1) 
      : addMonths(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(newDate);
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 })
    });
  };

  const getMonthWeeks = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };

  const currentEvents = viewMode === 'week' 
    ? getEventsForWeek(currentDate)
    : viewMode === 'month'
    ? getEventsForMonth(currentDate)
    : events;

  const isAllDayEvent = (event: Event) => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const startTime = startDate.getHours() * 60 + startDate.getMinutes();
    const endTime = endDate.getHours() * 60 + endDate.getMinutes();
    
    // Consider it all-day if it starts at 00:00 and ends at 23:59 or spans multiple days
    return (startTime === 0 && endTime === 1439) || 
           startDate.toDateString() !== endDate.toDateString();
  };

  const getAllDayEventsForDate = (date: Date) => {
    return getEventsForDate(date).filter(isAllDayEvent);
  };

  const getTimedEventsForDate = (date: Date) => {
    return getEventsForDate(date).filter(event => !isAllDayEvent(event));
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const timeSlots = Array.from({ length: 15 }, (_, i) => i + 9); // Start at 9:00 AM, show 15 hours

    return (
      <div className="calendar-week-view bg-background rounded-xl border shadow-soft overflow-hidden">
        {/* Header with navigation */}
        <div className="bg-muted/30 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mes
              </Button>
              <Button
                variant={viewMode === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('year')}
              >
                Año
              </Button>
            </div>
          </div>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-8 border-b bg-muted/20">
          <div className="p-3 text-xs font-medium text-muted-foreground">GMT+02</div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-3 text-center border-l">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {format(day, 'EEE', { locale: es }).toUpperCase()}
              </div>
              <div className={`text-2xl font-bold ${
                isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events section */}
        <div className="grid grid-cols-8 border-b bg-muted/5">
          <div className="p-3 text-xs font-medium text-muted-foreground bg-muted/10">Todo el día</div>
          {weekDays.map((day, dayIndex) => {
            const allDayEvents = getAllDayEventsForDate(day);
            return (
              <div key={dayIndex} className="border-l min-h-16 p-2 space-y-1">
                {allDayEvents.map((event, eventIndex) => (
                  <div
                    key={event.id}
                    className={`text-xs px-2 py-1 rounded truncate font-medium ${
                      event.event_type === 'concierto' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      event.event_type === 'entrevista' ? 'bg-green-100 text-green-800 border border-green-200' :
                      event.event_type === 'reunion' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Calendar grid */}
        <div className="h-96 overflow-y-auto">
          <div className="grid grid-cols-8">
            {/* Time column */}
            <div className="bg-muted/10">
              {timeSlots.map(hour => (
                <div key={hour} className="h-12 border-b border-r border-muted/30 p-2 text-xs text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="border-r border-muted/30">
                {timeSlots.map(hour => {
                  const dayEvents = getTimedEventsForDate(day).filter(event => {
                    const eventHour = new Date(event.start_date).getHours();
                    return eventHour === hour;
                  });

                  return (
                    <div key={hour} className="h-12 border-b border-muted/20 p-1 relative">
                      {dayEvents.map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`absolute inset-1 border rounded text-xs p-1 overflow-hidden hover:opacity-80 transition-all cursor-pointer ${
                            event.event_type === 'concierto' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                            event.event_type === 'entrevista' ? 'bg-green-100 border-green-300 text-green-800' :
                            event.event_type === 'reunion' ? 'bg-purple-100 border-purple-300 text-purple-800' :
                            'bg-gray-100 border-gray-300 text-gray-800'
                          }`}
                          style={{ 
                            zIndex: eventIndex + 1,
                            marginTop: `${eventIndex * 2}px` 
                          }}
                        >
                          <div className="font-medium truncate">
                            {event.title}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {format(new Date(event.start_date), 'HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthWeeks = getMonthWeeks();

    return (
      <div className="calendar-month-view bg-background rounded-xl border shadow-soft overflow-hidden">
        {/* Header with navigation */}
        <div className="bg-muted/30 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mes
              </Button>
              <Button
                variant={viewMode === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('year')}
              >
                Año
              </Button>
            </div>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b bg-muted/20">
          {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(day => (
            <div key={day} className="p-3 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {monthWeeks.map((week, weekIndex) => 
            week.map((day, dayIndex) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`min-h-24 border-r border-b border-muted/30 p-2 cursor-pointer hover:bg-muted/10 transition-colors ${
                    !isCurrentMonth ? 'bg-muted/5 text-muted-foreground' : ''
                  }`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded truncate"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    return (
      <div className="card-moodita hover-lift">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigateYear('prev')}
                size="sm"
              >
                ← {currentDate.getFullYear() - 1}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateYear('next')}
                size="sm"
              >
                {currentDate.getFullYear() + 1} →
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mes
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setViewMode('year')}
              >
                Año
              </Button>
            </div>
          </div>
          
          <YearlyCalendar
            year={currentDate.getFullYear()}
            events={events}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setCurrentDate(date);
              setViewMode('week');
            }}
            selectedDate={selectedDate}
          />
        </CardContent>
      </div>
    );
  };

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

      {/* Calendar Views */}
      {viewMode === 'year' ? renderYearView() : (
        <div className="space-y-6">
          {viewMode === 'week' ? renderWeekView() : renderMonthView()}
          
          {/* Event Details */}
          {selectedDate && (
            <Card className="card-moodita">
              <CardHeader>
                <CardTitle>
                  Eventos para {format(selectedDate, 'PPPP', { locale: es })}
                </CardTitle>
                <CardDescription>
                  {getEventsForDate(selectedDate).length} evento(s) programado(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay eventos programados para esta fecha
                  </div>
                ) : (
                  getEventsForDate(selectedDate).map((event) => (
                    <div key={event.id} className="card-interactive p-4 space-y-2 hover-glow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <CalendarIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{event.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.start_date), 'HH:mm')} - 
                                {format(new Date(event.end_date), 'HH:mm')}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">{event.event_type}</Badge>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}