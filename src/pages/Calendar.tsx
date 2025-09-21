import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
import { EditEventDialog } from '@/components/EditEventDialog';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { ReminderBadge } from '@/components/ReminderBadge';

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
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shouldOpenCreateDialog, setShouldOpenCreateDialog] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [bookingOffers, setBookingOffers] = useState<any[]>([]);
  const { getRemindersForBooking } = useBookingReminders(bookingOffers);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Time selection states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ day: Date; hour: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ day: Date; hour: number } | null>(null);

  useEffect(() => {
    if (profile) {
      setSelectedArtists([profile.id]);
    }
  }, [profile]);

  useEffect(() => {
    // Check if we should create an event from solicitud
    if (location.state?.createEvent) {
      setPrefilledData(location.state.createEvent);
      setShouldOpenCreateDialog(true);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (profile && selectedArtists.length > 0) {
      fetchEvents();
      fetchBookingOffers();
    }
  }, [profile, selectedArtists]);

  // Scroll to 9 AM when week view is rendered
  useEffect(() => {
    if (viewMode === 'week' && scrollAreaRef.current) {
      // Scroll to 9 AM (hour 9 = index 9, each hour is 48px tall)
      scrollAreaRef.current.scrollTop = 9 * 48;
    }
  }, [viewMode, currentDate]);

  // Add global mouseup listener for time selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleTimeSlotMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, selectionStart, selectionEnd]);

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
          .select('*')
          .in('artist_id', artistFilter)
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

  const fetchBookingOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_offers')
        .select('id, fecha, estado, contratos, link_venta, ciudad, lugar, festival_ciclo, event_id')
        .eq('estado', 'confirmado')
        .not('event_id', 'is', null);

      if (error) {
        console.error('Error fetching booking offers:', error);
      } else {
        setBookingOffers(data || []);
      }
    } catch (error) {
      console.error('Error fetching booking offers:', error);
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

  // Time selection handlers
  const handleTimeSlotMouseDown = (day: Date, hour: number) => {
    setIsSelecting(true);
    setSelectionStart({ day, hour });
    setSelectionEnd({ day, hour });
  };

  const handleTimeSlotMouseEnter = (day: Date, hour: number) => {
    if (isSelecting && selectionStart && isSameDay(day, selectionStart.day)) {
      setSelectionEnd({ day, hour });
    }
  };

  const handleTimeSlotMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd) {
      const startHour = Math.min(selectionStart.hour, selectionEnd.hour);
      const endHour = Math.max(selectionStart.hour, selectionEnd.hour) + 1; // Add 1 to include the end hour
      
      const startDate = new Date(selectionStart.day);
      startDate.setHours(startHour, 0, 0, 0);
      
      const endDate = new Date(selectionStart.day);
      endDate.setHours(endHour, 0, 0, 0);
      
      setPrefilledData({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        event_type: 'reunion'
      });
      setShouldOpenCreateDialog(true);
    }
    
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const isTimeSlotSelected = (day: Date, hour: number) => {
    if (!selectionStart || !selectionEnd) return false;
    if (!isSameDay(day, selectionStart.day)) return false;
    
    const minHour = Math.min(selectionStart.hour, selectionEnd.hour);
    const maxHour = Math.max(selectionStart.hour, selectionEnd.hour);
    
    return hour >= minHour && hour <= maxHour;
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const timeSlots = Array.from({ length: 24 }, (_, i) => i); // Show all 24 hours (0-23)

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
                    className={`text-xs px-2 py-1 rounded truncate font-medium relative ${
                      event.event_type === 'concierto' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      event.event_type === 'entrevista' ? 'bg-green-100 text-green-800 border border-green-200' :
                      event.event_type === 'reunion' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{event.title}</span>
                      {(() => {
                        const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                        if (bookingOffer) {
                          const reminders = getRemindersForBooking(bookingOffer.id);
                          return reminders.length > 0 ? (
                            <div className="ml-1 flex-shrink-0">
                              <ReminderBadge reminders={reminders} variant="compact" />
                            </div>
                          ) : null;
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Calendar grid with scroll area and initial position at 9 AM */}
        <div className="h-96 overflow-y-auto" ref={scrollAreaRef}>
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
                    <div 
                      key={hour} 
                      className={`h-12 border-b border-muted/20 p-1 relative cursor-pointer hover:bg-muted/10 transition-colors select-none ${
                        isTimeSlotSelected(day, hour) ? 'bg-primary/20 border-primary/40' : ''
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleTimeSlotMouseDown(day, hour);
                      }}
                      onMouseEnter={() => handleTimeSlotMouseEnter(day, hour)}
                    >
                      {dayEvents.map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`absolute inset-1 border rounded text-xs p-1 overflow-hidden hover:opacity-80 transition-all cursor-pointer z-10 ${
                            event.event_type === 'concierto' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                            event.event_type === 'entrevista' ? 'bg-green-100 border-green-300 text-green-800' :
                            event.event_type === 'reunion' ? 'bg-purple-100 border-purple-300 text-purple-800' :
                            'bg-gray-100 border-gray-300 text-gray-800'
                          }`}
                          style={{ 
                            zIndex: eventIndex + 10,
                            marginTop: `${eventIndex * 2}px` 
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {event.title}
                              </div>
                              <div className="text-muted-foreground truncate">
                                {format(new Date(event.start_date), 'HH:mm')}
                              </div>
                            </div>
                            {(() => {
                              const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                              if (bookingOffer) {
                                const reminders = getRemindersForBooking(bookingOffer.id);
                                return reminders.length > 0 ? (
                                  <div className="ml-1 flex-shrink-0">
                                    <ReminderBadge reminders={reminders} variant="compact" />
                                  </div>
                                ) : null;
                              }
                              return null;
                            })()}
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
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded flex items-center justify-between"
                      >
                        <span className="truncate">{event.title}</span>
                        {(() => {
                          const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                          if (bookingOffer) {
                            const reminders = getRemindersForBooking(bookingOffer.id);
                            return reminders.length > 0 ? (
                              <div className="ml-1 flex-shrink-0">
                                <ReminderBadge reminders={reminders} variant="compact" />
                              </div>
                            ) : null;
                          }
                          return null;
                        })()}
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-xl">
            <CalendarIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Calendario Profesional</h1>
            <p className="text-muted-foreground">Organiza y visualiza todos tus eventos</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <CreateEventDialog 
            onEventCreated={fetchEvents}
            shouldOpen={shouldOpenCreateDialog}
            onOpenChange={(open) => {
              setShouldOpenCreateDialog(open);
              if (!open) {
                setPrefilledData(null);
                // Clear selection state when dialog closes
                setIsSelecting(false);
                setSelectionStart(null);
                setSelectionEnd(null);
              }
            }}
            prefilledData={prefilledData}
          />
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{event.event_type}</Badge>
                            {(() => {
                              const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                              if (bookingOffer) {
                                const reminders = getRemindersForBooking(bookingOffer.id);
                                return reminders.length > 0 ? (
                                  <ReminderBadge reminders={reminders} />
                                ) : null;
                              }
                              return null;
                            })()}
                            <EditEventDialog event={event} onUpdated={fetchEvents} />
                          </div>
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