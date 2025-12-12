import { CalendarExportDialog } from '@/components/CalendarExportDialog';
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
import { CalendarIcon, Clock, MapPin, Plus, Filter, ChevronLeft, ChevronRight, Calendar as CalendarViewIcon, X, FolderKanban, Users, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreateEventDialog } from '@/components/CreateEventDialog';
import { ArtistSelector } from '@/components/ArtistSelector';
import { YearlyCalendar } from '@/components/YearlyCalendar';
import { EditEventDialog } from '@/components/EditEventDialog';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { ReminderBadge } from '@/components/ReminderBadge';
import { EventDetailPopover } from '@/components/EventDetailPopover';
import { GoogleCalendarSettings } from '@/components/GoogleCalendarSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { seedEvents } from '@/utils/seedEvents';
import { importCsvEvents } from '@/utils/importCsvEvents';
import { importMarketingEvents } from '@/utils/importMarketingEvents';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImportConcerts2025Dialog } from '@/components/ImportConcerts2025Dialog';
interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  location: string | null;
  artist_id: string;
  project_id?: string | null;
}
export default function Calendar() {
  usePageTitle('Calendario');
  const {
    profile,
    loading
  } = useAuth();
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSeeding, setIsSeeding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingMarketing, setIsImportingMarketing] = useState(false);
  const {
    toast
  } = useToast();
  const [shouldOpenCreateDialog, setShouldOpenCreateDialog] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [bookingOffers, setBookingOffers] = useState<any[]>([]);
  const {
    getRemindersForBooking
  } = useBookingReminders(bookingOffers);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showMyCalendar, setShowMyCalendar] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Time selection states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    day: Date;
    hour: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    day: Date;
    hour: number;
  } | null>(null);
  const [hasActiveSelection, setHasActiveSelection] = useState(false);

  // Event detail popup states - ahora múltiples popups
  interface OpenEventPopup {
    id: string;
    event: Event;
    position: {
      x: number;
      y: number;
    };
    zIndex: number;
  }
  const [openEventPopups, setOpenEventPopups] = useState<OpenEventPopup[]>([]);
  const [highestZIndex, setHighestZIndex] = useState(100);
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
      fetchProjects();
    }
  }, [profile, selectedArtists, selectedProjects, selectedDepartment, showMyCalendar, showAllEvents]);

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

  // Clear selection when view mode or current date changes
  useEffect(() => {
    clearSelection();
  }, [viewMode, currentDate]);
  const fetchEvents = async () => {
    try {
      if (profile?.active_role === 'management') {
        const {
          data,
          error
        } = await supabase.from('events').select('*').or(`created_by.eq.${profile.id},artist_id.in.(${selectedArtists.join(',')})`);
        if (error) {
          console.error('Error fetching events:', error);
        } else {
          let filteredEvents = data || [];

          // Si "Ver todo" está activo, mostrar todos los eventos sin filtros
          if (showAllEvents) {
            setEvents(filteredEvents);
            return;
          }

          // Aplicar filtros solo cuando "Ver todo" está desactivado
          // Filtrar por artistas seleccionados
          filteredEvents = filteredEvents.filter(event => selectedArtists.includes(event.artist_id) || event.created_by === profile.id);

          // Filtrar por "Mi Calendario" si está activado
          if (showMyCalendar) {
            filteredEvents = filteredEvents.filter((event: any) => event.created_by === profile.id || event.artist_id === profile.id);
          }

          // Filtrar por proyectos si hay seleccionados
          if (selectedProjects.length > 0) {
            filteredEvents = filteredEvents.filter((event: any) => event.project_id && selectedProjects.includes(event.project_id));
          }
          setEvents(filteredEvents);
        }
      } else {
        const artistFilter = selectedArtists.length > 0 ? selectedArtists : [profile.id];
        const {
          data,
          error
        } = await supabase.from('events').select('*').in('artist_id', artistFilter).order('start_date', {
          ascending: true
        });
        if (error) {
          console.error('Error fetching events:', error);
        } else {
          let filteredEvents = data || [];

          // Si "Ver todo" está activo, mostrar todos los eventos sin filtros
          if (showAllEvents) {
            setEvents(filteredEvents);
            return;
          }

          // Aplicar filtros solo cuando "Ver todo" está desactivado
          // Filtrar por "Mi Calendario" si está activado
          if (showMyCalendar) {
            filteredEvents = filteredEvents.filter((event: any) => event.created_by === profile.id || event.artist_id === profile.id);
          }

          // Filtrar por proyectos si hay seleccionados
          if (selectedProjects.length > 0) {
            filteredEvents = filteredEvents.filter((event: any) => event.project_id && selectedProjects.includes(event.project_id));
          }
          setEvents(filteredEvents);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  };
  const fetchProjects = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('projects').select('id, name, artist_id').order('name', {
        ascending: true
      });
      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };
  const handleSeedEvents = async () => {
    setIsSeeding(true);
    try {
      const result = await seedEvents();
      toast({
        title: "Eventos creados",
        description: `Se crearon ${result.eventCount} eventos de prueba para ${result.artists.join(', ')}`
      });
      fetchEvents();
      fetchBookingOffers();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron crear los eventos de prueba",
        variant: "destructive"
      });
    } finally {
      setIsSeeding(false);
    }
  };
  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const csvContent = await file.text();
      const result = await importCsvEvents(csvContent);
      toast({
        title: "Eventos importados",
        description: `Se importaron ${result.eventCount} eventos desde el CSV`
      });
      fetchEvents();
      fetchBookingOffers();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron importar los eventos del CSV",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };
  const handleImportMarketingEvents = async () => {
    setIsImportingMarketing(true);
    try {
      const result = await importMarketingEvents();
      toast({
        title: "Éxito",
        description: `Se han importado ${result.count} eventos de marketing`
      });

      // Refresh events
      fetchEvents();
    } catch (error) {
      console.error('Error importing marketing events:', error);
      toast({
        variant: "destructive",
        title: "Error al importar",
        description: error instanceof Error ? error.message : "Hubo un problema al importar los eventos"
      });
    } finally {
      setIsImportingMarketing(false);
    }
  };
  const fetchBookingOffers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('booking_offers').select('id, fecha, estado, contratos, link_venta, ciudad, lugar, festival_ciclo, event_id').eq('estado', 'confirmado').not('event_id', 'is', null);
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
    return events.filter(event => isSameDay(new Date(event.start_date), date));
  };
  const getEventsForWeek = (startDate: Date) => {
    const weekStart = startOfWeek(startDate, {
      weekStartsOn: 1
    });
    const weekEnd = endOfWeek(startDate, {
      weekStartsOn: 1
    });
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
    const newDate = direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };
  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(newDate);
  };
  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, {
      weekStartsOn: 1
    });
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, {
        weekStartsOn: 1
      })
    });
  };
  const getMonthWeeks = (date: Date = currentDate) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, {
      weekStartsOn: 1
    });
    const calendarEnd = endOfWeek(monthEnd, {
      weekStartsOn: 1
    });
    const days = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };
  const currentEvents = viewMode === 'week' ? getEventsForWeek(currentDate) : viewMode === 'month' ? getEventsForMonth(currentDate) : events;
  const isAllDayEvent = (event: Event) => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const startTime = startDate.getHours() * 60 + startDate.getMinutes();
    const endTime = endDate.getHours() * 60 + endDate.getMinutes();

    // Consider it all-day if it starts at 00:00 and ends at 23:59 or spans multiple days
    return startTime === 0 && endTime === 1439 || startDate.toDateString() !== endDate.toDateString();
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
    setSelectionStart({
      day,
      hour
    });
    setSelectionEnd({
      day,
      hour
    });
  };
  const handleTimeSlotMouseEnter = (day: Date, hour: number) => {
    if (isSelecting && selectionStart && isSameDay(day, selectionStart.day)) {
      setSelectionEnd({
        day,
        hour
      });
    }
  };
  const handleTimeSlotMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd) {
      setHasActiveSelection(true);
    }
    setIsSelecting(false);
  };
  const createEventFromSelection = () => {
    if (selectionStart && selectionEnd) {
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
      clearSelection();
    }
  };
  const clearSelection = () => {
    setHasActiveSelection(false);
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
  const getSelectionTimeRange = () => {
    if (!selectionStart || !selectionEnd) return '';
    const startHour = Math.min(selectionStart.hour, selectionEnd.hour);
    const endHour = Math.max(selectionStart.hour, selectionEnd.hour) + 1;
    return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
  };
  const handleEventClick = (event: Event, mouseEvent: React.MouseEvent) => {
    console.log('Event clicked:', event);
    console.log('Event start_date:', event.start_date);
    console.log('Event end_date:', event.end_date);
    console.log('Opening popup for event');

    // Verificar si el evento ya está abierto
    const existingPopup = openEventPopups.find(popup => popup.event.id === event.id);
    if (existingPopup) {
      // Si ya está abierto, solo traerlo al frente
      bringPopupToFront(existingPopup.id);
      return;
    }

    // Capturar la posición del clic
    const rect = (mouseEvent.target as HTMLElement).getBoundingClientRect();
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    const newPopup: OpenEventPopup = {
      id: `popup-${event.id}-${Date.now()}`,
      event,
      position: {
        x: rect.right + 10,
        y: rect.top
      },
      zIndex: newZIndex
    };
    setOpenEventPopups(prev => [...prev, newPopup]);
    console.log('Popup added for event:', event.title);
  };
  const bringPopupToFront = (popupId: string) => {
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    setOpenEventPopups(prev => prev.map(popup => popup.id === popupId ? {
      ...popup,
      zIndex: newZIndex
    } : popup));
  };
  const closePopup = (popupId: string) => {
    setOpenEventPopups(prev => prev.filter(popup => popup.id !== popupId));
  };
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const timeSlots = Array.from({
      length: 24
    }, (_, i) => i); // Show all 24 hours (0-23)

    return <div className="calendar-week-view bg-background rounded-xl border shadow-soft overflow-hidden">
        {/* Header with navigation */}
        <div className="bg-muted/30 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM yyyy', {
                locale: es
              })}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Semana
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>
                Mes
              </Button>
              <Button variant={viewMode === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('year')}>
                Año
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <CalendarExportDialog events={events} />
            </div>
          </div>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-8 border-b bg-muted/20">
          <div className="p-3 text-xs font-medium text-muted-foreground">GMT+02</div>
          {weekDays.map((day, index) => <div key={index} className="p-3 text-center border-l">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {format(day, 'EEE', {
              locale: es
            }).toUpperCase()}
              </div>
              <div className={`text-2xl font-bold ${isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>)}
        </div>

        {/* All-day events section */}
        <div className="grid grid-cols-8 border-b bg-muted/5">
          <div className="p-3 text-xs font-medium text-muted-foreground bg-muted/10">Todo el día</div>
          {weekDays.map((day, dayIndex) => {
          const allDayEvents = getAllDayEventsForDate(day);
          return <div key={dayIndex} className="border-l min-h-16 p-2 space-y-1">
                {allDayEvents.map((event, eventIndex) => <div key={event.id} className={`text-xs px-2 py-1 rounded truncate font-medium relative ${event.event_type === 'concierto' ? 'bg-blue-100 text-blue-800 border border-blue-200' : event.event_type === 'entrevista' ? 'bg-green-100 text-green-800 border border-green-200' : event.event_type === 'reunion' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{event.title}</span>
                      {(() => {
                  const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                  if (bookingOffer) {
                    const reminders = getRemindersForBooking(bookingOffer.id);
                    return reminders.length > 0 ? <div className="ml-1 flex-shrink-0">
                              <ReminderBadge reminders={reminders} variant="compact" />
                            </div> : null;
                  }
                  return null;
                })()}
                    </div>
                  </div>)}
              </div>;
        })}
        </div>

        {/* Calendar grid with scroll area and initial position at 9 AM */}
        <div className="h-96 overflow-y-auto" ref={scrollAreaRef}>
          <div className="grid grid-cols-8">
            {/* Time column */}
            <div className="bg-muted/10">
              {timeSlots.map(hour => <div key={hour} className="h-12 border-b border-r border-muted/30 p-2 text-xs text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>)}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => <div key={dayIndex} className="border-r border-muted/30">
                {timeSlots.map(hour => {
              const dayEvents = getTimedEventsForDate(day).filter(event => {
                const eventHour = new Date(event.start_date).getHours();
                return eventHour === hour;
              });
              const isFirstSelectedHour = selectionStart && selectionEnd && isSameDay(day, selectionStart.day) && hour === Math.min(selectionStart.hour, selectionEnd.hour);
              const selectedHoursCount = selectionStart && selectionEnd && isSameDay(day, selectionStart.day) ? Math.abs(selectionEnd.hour - selectionStart.hour) + 1 : 0;
              return <div key={hour} className={`h-12 border-b border-muted/20 p-1 relative cursor-pointer hover:bg-muted/10 transition-colors select-none`} onMouseDown={e => {
                e.preventDefault();
                handleTimeSlotMouseDown(day, hour);
              }} onMouseEnter={() => handleTimeSlotMouseEnter(day, hour)}>
                      {/* Single continuous selection overlay - only render on first selected hour */}
                      {isFirstSelectedHour && <div className="absolute inset-x-1 bg-primary/90 border-2 border-primary rounded-lg flex items-center justify-center z-5 shadow-sm" style={{
                  top: '4px',
                  height: `${selectedHoursCount * 48 - 8}px` // 48px per hour minus padding
                }}>
                          <span className="text-primary-foreground text-sm font-medium select-none">
                            (Sin título)
                          </span>
                        </div>}
                      
                      {dayEvents.map((event, eventIndex) => <div key={event.id} className={`absolute inset-1 border rounded text-xs p-2 overflow-hidden hover:opacity-80 transition-all cursor-pointer z-10 ${event.event_type === 'concierto' ? 'bg-blue-100 border-blue-300 text-blue-800' : event.event_type === 'entrevista' ? 'bg-green-100 border-green-300 text-green-800' : event.event_type === 'reunion' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-gray-100 border-gray-300 text-gray-800'}`} style={{
                  zIndex: eventIndex + 10,
                  marginTop: `${eventIndex * 2}px`
                }} onMouseDown={e => e.stopPropagation()} onClick={e => {
                  e.stopPropagation();
                  console.log('Event card clicked, calling handleEventClick');
                  handleEventClick(event, e);
                }}>
                          <div className="flex flex-col h-full">
                            <div className="font-bold text-xs uppercase tracking-wide leading-tight mb-1">
                              {event.title}
                            </div>
                            <div className="text-xs opacity-80 leading-tight mb-1">
                              {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                            </div>
                            {event.location && <div className="text-xs opacity-70 leading-tight truncate">
                                {event.location}
                              </div>}
                            {(() => {
                      const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                      if (bookingOffer) {
                        const reminders = getRemindersForBooking(bookingOffer.id);
                        return reminders.length > 0 ? <div className="mt-auto pt-1">
                                    <ReminderBadge reminders={reminders} variant="compact" />
                                  </div> : null;
                      }
                      return null;
                    })()}
                          </div>
                        </div>)}
                    </div>;
            })}
              </div>)}
          </div>
        </div>

        {/* Floating Create Event Button - Google Calendar Style */}
        {hasActiveSelection && selectionStart && selectionEnd && <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background border border-border/50 shadow-2xl rounded-xl p-4 z-20 animate-scale-in">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <div className="font-semibold text-foreground mb-1">
                  {format(selectionStart.day, 'dd MMM yyyy', {
                locale: es
              })}
                </div>
                <div className="text-muted-foreground text-xs">
                  {getSelectionTimeRange()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80">
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={createEventFromSelection} className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Plus className="h-3 w-3 mr-1.5" />
                  Crear evento
                </Button>
              </div>
            </div>
          </div>}
      </div>;
  };
  const renderMonthView = () => {
    const currentMonthWeeks = getMonthWeeks(currentDate);
    const nextMonth = addMonths(currentDate, 1);
    const nextMonthWeeks = getMonthWeeks(nextMonth);

    const renderSingleMonth = (monthDate: Date, monthWeeks: any[]) => (
      <div className="flex-1 min-w-0">
        {/* Month header */}
        <div className="bg-muted/20 p-3 border-b text-center">
          <h3 className="text-lg font-semibold capitalize">
            {format(monthDate, 'MMMM yyyy', { locale: es })}
          </h3>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b bg-muted/10">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {monthWeeks.map((week, weekIndex) => week.map((day: Date, dayIndex: number) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, monthDate);
            const isToday = isSameDay(day, new Date());
            return (
              <div 
                key={`${weekIndex}-${dayIndex}`} 
                className={`min-h-20 border-r border-b border-muted/30 p-1.5 cursor-pointer hover:bg-muted/10 transition-colors ${!isCurrentMonth ? 'bg-muted/5 text-muted-foreground' : ''}`} 
                onClick={() => setSelectedDate(day)}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(event => (
                    <div key={event.id} className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded truncate">
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    );

    return (
      <div className="calendar-month-view bg-background rounded-xl border shadow-soft overflow-hidden">
        {/* Header with navigation */}
        <div className="bg-muted/30 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM', { locale: es })} - {format(nextMonth, 'MMMM yyyy', { locale: es })}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Semana
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>
                Mes
              </Button>
              <Button variant={viewMode === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('year')}>
                Año
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <CalendarExportDialog events={events} />
            </div>
          </div>
        </div>

        {/* Two month grid */}
        <div className="flex divide-x">
          {renderSingleMonth(currentDate, currentMonthWeeks)}
          {renderSingleMonth(nextMonth, nextMonthWeeks)}
        </div>
      </div>
    );
  };
  const renderYearView = () => {
    return <div className="card-moodita hover-lift">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigateYear('prev')} size="sm">
                ← {currentDate.getFullYear() - 1}
              </Button>
              <Button variant="outline" onClick={() => navigateYear('next')} size="sm">
                {currentDate.getFullYear() + 1} →
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Semana
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>
                Mes
              </Button>
              <Button variant="default" size="sm" onClick={() => setViewMode('year')}>
                Año
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <CalendarExportDialog events={events} />
            </div>
          </div>
          
          <YearlyCalendar year={currentDate.getFullYear()} events={events} onDateSelect={date => {
          setSelectedDate(date);
          setCurrentDate(date);
          setViewMode('week');
        }} selectedDate={selectedDate} />
        </CardContent>
      </div>;
  };
  if (loading) {
    return <div className="p-6">
        <div className="text-center">Cargando calendario...</div>
      </div>;
  }
  if (!profile) {
    return <div className="p-6">
        <div className="text-center">Error: No se pudo cargar el perfil</div>
      </div>;
  }
  return <div className="container-moodita section-spacing space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-xl">
            <CalendarIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Calendario</h1>
            <p className="text-muted-foreground">Organiza y visualiza todos tus eventos</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <CreateEventDialog onEventCreated={fetchEvents} shouldOpen={shouldOpenCreateDialog} onOpenChange={open => {
        setShouldOpenCreateDialog(open);
        if (!open) {
          setPrefilledData(null);
          clearSelection();
        }
      }} prefilledData={prefilledData} />
          <div className="flex gap-2">
            
            
            
            
            <ImportConcerts2025Dialog />
            
            <Button variant="outline" size="sm" disabled={isImporting || isSeeding || isImportingMarketing} onClick={() => document.getElementById('csv-upload')?.click()}>
              {isImporting ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </> : <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar CSV
                </>}
            </Button>
            <input id="csv-upload" type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          </div>
        </div>

      {/* Google Calendar Sync - Collapsible */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Conectar Calendario
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]]:rotate-180" />
              </div>
              <CardDescription>
                Conecta tu cuenta de Google para crear y sincronizar eventos
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <GoogleCalendarSettings />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filters - Collapsible */}
      <Collapsible>
        <Card className="card-moodita hover-lift">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Filter className="h-4 w-4 text-primary" />
                  </div>
                  Filtros
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setShowAllEvents(!showAllEvents);
                  }} className="text-xs">
                    {showAllEvents ? <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Filtrado
                      </> : <>
                        <Eye className="h-3 w-3 mr-1" />
                        Ver todo
                      </>}
                  </Button>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                </div>
              </div>
              <CardDescription>
                Selecciona cómo quieres filtrar los eventos del calendario
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Tabs defaultValue="artists" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="artists">
                    <Users className="h-4 w-4 mr-2" />
                    Artistas
                  </TabsTrigger>
                  <TabsTrigger value="projects">
                    <FolderKanban className="h-4 w-4 mr-2" />
                    Proyectos
                  </TabsTrigger>
                  <TabsTrigger value="departments">
                    <Filter className="h-4 w-4 mr-2" />
                    Departamentos
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="artists" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Mi Calendario</span>
                      </div>
                      <Switch checked={showMyCalendar} onCheckedChange={setShowMyCalendar} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Selecciona los artistas cuyos eventos quieres ver
                      </p>
                      <ArtistSelector selectedArtists={selectedArtists} onSelectionChange={setSelectedArtists} placeholder="Seleccionar artistas..." showSelfOption={true} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="projects" className="mt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Filtra eventos por proyecto específico
                    </p>
                    <Select value={selectedProjects[0] || 'all'} onValueChange={value => setSelectedProjects(value === 'all' ? [] : [value])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los proyectos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los proyectos</SelectItem>
                        {projects.map(project => <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="departments" className="mt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Filtra eventos por departamento
                    </p>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los departamentos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los departamentos</SelectItem>
                        <SelectItem value="booking">Booking</SelectItem>
                        <SelectItem value="produccion">Producción</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="administracion">Administración</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Calendar Views */}
      {viewMode === 'year' ? renderYearView() : <div className="space-y-6">
          {viewMode === 'week' ? renderWeekView() : renderMonthView()}
          
          {/* Event Details */}
          {selectedDate && <Card className="card-moodita">
              <CardHeader>
                <CardTitle>
                  Eventos para {format(selectedDate, 'PPPP', {
              locale: es
            })}
                </CardTitle>
                <CardDescription>
                  {getEventsForDate(selectedDate).length} evento(s) programado(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getEventsForDate(selectedDate).length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    No hay eventos programados para esta fecha
                  </div> : getEventsForDate(selectedDate).map(event => <div key={event.id} className="card-interactive p-4 space-y-2 hover-glow">
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
                                {event.location && <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </div>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{event.event_type}</Badge>
                            {(() => {
                  const bookingOffer = bookingOffers.find(offer => offer.event_id === event.id);
                  if (bookingOffer) {
                    const reminders = getRemindersForBooking(bookingOffer.id);
                    return reminders.length > 0 ? <ReminderBadge reminders={reminders} /> : null;
                  }
                  return null;
                })()}
                            <EditEventDialog event={event} onUpdated={fetchEvents} />
                          </div>
                        </div>
                      {event.description && <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                          {event.description}
                        </p>}
                    </div>)}
              </CardContent>
            </Card>}
        </div>}

      {/* Event Detail Popovers - Múltiples */}
      {openEventPopups.map(popup => <EventDetailPopover key={popup.id} event={popup.event} open={true} onOpenChange={() => closePopup(popup.id)} position={popup.position} zIndex={popup.zIndex} onBringToFront={() => bringPopupToFront(popup.id)} artistName="David Solans" createdBy="Fabrica Mudita" onEdit={event => {
      // TODO: Implementar edición de evento
      console.log('Edit event:', event);
    }} onDelete={eventId => {
      // TODO: Implementar eliminación de evento
      console.log('Delete event:', eventId);
      closePopup(popup.id);
    }} />)}
    </div>;
}