import { CalendarExportDialog } from '@/components/CalendarExportDialog';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, Folder, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { YearlyCalendar } from '@/components/YearlyCalendar';
import { EditEventDialog } from '@/components/EditEventDialog';
import { EditEventDialogControlled } from '@/components/EditEventDialogControlled';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { ReminderBadge } from '@/components/ReminderBadge';
import { EventDetailPopover } from '@/components/EventDetailPopover';
import { importCsvEvents } from '@/utils/importCsvEvents';
import { useToast } from '@/hooks/use-toast';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar';
import { CreateEventDialogV2 } from '@/components/calendar/CreateEventDialogV2';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import React from 'react';

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
  const { profile, loading } = useAuth();
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; type?: 'workspace' | 'contact' }[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const [shouldOpenCreateDialog, setShouldOpenCreateDialog] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [bookingOffers, setBookingOffers] = useState<any[]>([]);
  const { getRemindersForBooking } = useBookingReminders(bookingOffers);
  const [showMyCalendar, setShowMyCalendar] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Time selection states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ day: Date; hour: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ day: Date; hour: number } | null>(null);
  const [hasActiveSelection, setHasActiveSelection] = useState(false);

  // Event detail popup states
  interface OpenEventPopup {
    id: string;
    event: Event;
    position: { x: number; y: number };
    zIndex: number;
  }
  const [openEventPopups, setOpenEventPopups] = useState<OpenEventPopup[]>([]);
  const [highestZIndex, setHighestZIndex] = useState(100);
  const [savedPopupPositions, setSavedPopupPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedBookingOffer, setSelectedBookingOffer] = useState<any | null>(null);

  useEffect(() => { if (profile) setSelectedArtists([profile.id]); }, [profile]);
  
  useEffect(() => {
    if (location.state?.createEvent) {
      setPrefilledData(location.state.createEvent);
      setShouldOpenCreateDialog(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (profile && selectedArtists.length > 0) {
      fetchEvents(); fetchBookingOffers(); fetchProjects(); fetchTeamMembers();
    }
  }, [profile, selectedArtists, selectedProjects, selectedDepartment, showMyCalendar, showAllEvents]);

  // Global mouseup listener for time selection
  useEffect(() => {
    const handleGlobalMouseUp = () => { if (isSelecting) handleTimeSlotMouseUp(); };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, selectionStart, selectionEnd]);

  useEffect(() => { clearSelection(); }, [viewMode, currentDate]);

  const fetchEvents = async () => {
    try {
      if (profile?.active_role === 'management') {
        const { data, error } = await supabase.from('events').select('*').or(`created_by.eq.${profile.id},artist_id.in.(${selectedArtists.join(',')})`);
        if (error) { console.error('Error fetching events:', error); } else {
          let filteredEvents = data || [];
          if (showAllEvents) { setEvents(filteredEvents); return; }
          filteredEvents = filteredEvents.filter(event => selectedArtists.includes(event.artist_id) || event.created_by === profile.id);
          if (showMyCalendar) filteredEvents = filteredEvents.filter((event: any) => event.created_by === profile.id || event.artist_id === profile.id);
          setEvents(filteredEvents);
        }
      } else {
        const artistFilter = selectedArtists.length > 0 ? selectedArtists : [profile.id];
        const { data, error } = await supabase.from('events').select('*').in('artist_id', artistFilter).order('start_date', { ascending: true });
        if (error) { console.error('Error fetching events:', error); } else {
          let filteredEvents = data || [];
          if (showAllEvents) { setEvents(filteredEvents); return; }
          if (showMyCalendar) filteredEvents = filteredEvents.filter((event: any) => event.created_by === profile.id || event.artist_id === profile.id);
          setEvents(filteredEvents);
        }
      }
    } catch (error) { console.error('Error fetching events:', error); } finally { setEventsLoading(false); }
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name, artist_id').order('name', { ascending: true });
    setProjects(data || []);
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('profiles').select('workspace_id').eq('user_id', user.id).single();
      const allMembers: { id: string; full_name: string; type?: 'workspace' | 'contact' }[] = [];
      if (profileData?.workspace_id) {
        const { data: memberships } = await supabase.from('workspace_memberships').select('user_id').eq('workspace_id', profileData.workspace_id);
        if (memberships && memberships.length > 0) {
          const userIds = memberships.map(m => m.user_id);
          const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, stage_name').in('user_id', userIds);
          profiles?.forEach(p => allMembers.push({ id: p.user_id, full_name: p.stage_name || p.full_name || 'Sin nombre', type: 'workspace' }));
        }
      }
      const { data: contacts } = await supabase.from('contacts').select('id, name, stage_name, field_config').eq('created_by', user.id);
      contacts?.forEach(c => {
        const config = c.field_config as Record<string, any> | null;
        if (config?.is_team_member) allMembers.push({ id: c.id, full_name: c.stage_name || c.name, type: 'contact' });
      });
      setTeamMembers(allMembers);
    } catch (error) { console.error('Error fetching team members:', error); }
  };

  const handleImportCsvClick = () => { document.getElementById('csv-upload')?.click(); };
  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const csvContent = await file.text();
      const result = await importCsvEvents(csvContent);
      toast({ title: "Eventos importados", description: `Se importaron ${result.eventCount} eventos desde el CSV` });
      fetchEvents(); fetchBookingOffers();
    } catch { toast({ title: "Error", description: "No se pudieron importar los eventos del CSV", variant: "destructive" }); }
    finally { setIsImporting(false); event.target.value = ''; }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') navigateWeek(direction);
    else if (viewMode === 'month' || viewMode === 'quarter') navigateMonth(direction);
    else navigateYear(direction);
  };

  const fetchBookingOffers = async () => {
    const { data } = await supabase.from('booking_offers')
      .select(`id, fecha, estado, contratos, link_venta, ciudad, lugar, venue, festival_ciclo, event_id, formato, duracion, folder_url, artist_id, artists!booking_offers_artist_id_fkey(name, stage_name)`)
      .in('estado', ['confirmado', 'pendiente', 'negociacion', 'interes', 'oferta']);
    setBookingOffers(data || []);
  };

  const getEventsForDate = (date: Date) => events.filter(event => isSameDay(new Date(event.start_date), date));
  const getBookingOffersForDate = (date: Date) => bookingOffers.filter((offer: any) => offer.fecha && isSameDay(new Date(offer.fecha), date));
  const formatBookingTitle = (offer: any) => {
    const eventName = offer.festival_ciclo || offer.venue || offer.lugar || 'Evento';
    const city = offer.ciudad || '';
    return `🎤 ${eventName}${city ? ` - ${city}` : ''}`;
  };
  const getEventsForMonth = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    return events.filter(event => { const d = new Date(event.start_date); return d >= monthStart && d <= monthEnd; });
  };

  const navigateWeek = (d: 'prev' | 'next') => { const n = d === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1); setCurrentDate(n); setSelectedDate(n); };
  const navigateMonth = (d: 'prev' | 'next') => { const n = d === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1); setCurrentDate(n); setSelectedDate(n); };
  const navigateYear = (d: 'prev' | 'next') => { const n = new Date(currentDate); n.setFullYear(n.getFullYear() + (d === 'prev' ? -1 : 1)); setCurrentDate(n); };

  // Time selection handlers
  const handleTimeSlotMouseDown = (day: Date, hour: number) => { setIsSelecting(true); setSelectionStart({ day, hour }); setSelectionEnd({ day, hour }); };
  const handleTimeSlotMouseEnter = (day: Date, hour: number) => { if (isSelecting && selectionStart && isSameDay(day, selectionStart.day)) setSelectionEnd({ day, hour }); };
  const handleTimeSlotMouseUp = () => { if (isSelecting && selectionStart && selectionEnd) setHasActiveSelection(true); setIsSelecting(false); };
  const createEventFromSelection = () => {
    if (selectionStart && selectionEnd) {
      const startHour = Math.min(selectionStart.hour, selectionEnd.hour);
      const endHour = Math.max(selectionStart.hour, selectionEnd.hour) + 1;
      const startDate = new Date(selectionStart.day); startDate.setHours(startHour, 0, 0, 0);
      const endDate = new Date(selectionStart.day); endDate.setHours(endHour, 0, 0, 0);
      setPrefilledData({ start_date: startDate.toISOString(), end_date: endDate.toISOString(), event_type: 'reunion' });
      setShouldOpenCreateDialog(true); clearSelection();
    }
  };
  const clearSelection = () => { setHasActiveSelection(false); setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); };

  // Event popup handlers
  const handleEventClick = (event: Event, mouseEvent: React.MouseEvent) => {
    const existingPopup = openEventPopups.find(popup => popup.event.id === event.id);
    if (existingPopup) {
      setSavedPopupPositions(prev => ({ ...prev, [event.id]: existingPopup.position }));
      setOpenEventPopups(prev => prev.filter(popup => popup.id !== existingPopup.id));
      return;
    }
    const rect = (mouseEvent.target as HTMLElement).getBoundingClientRect();
    const savedPosition = savedPopupPositions[event.id];
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    setOpenEventPopups(prev => [...prev, {
      id: `popup-${event.id}-${Date.now()}`, event,
      position: savedPosition || { x: rect.right + 10, y: rect.top },
      zIndex: newZIndex,
    }]);
  };
  const bringPopupToFront = (popupId: string) => { const z = highestZIndex + 1; setHighestZIndex(z); setOpenEventPopups(prev => prev.map(p => p.id === popupId ? { ...p, zIndex: z } : p)); };
  const closePopup = (popupId: string) => {
    const popup = openEventPopups.find(p => p.id === popupId);
    if (popup) setSavedPopupPositions(prev => ({ ...prev, [popup.event.id]: popup.position }));
    setOpenEventPopups(prev => prev.filter(p => p.id !== popupId));
  };
  const updatePopupPosition = (popupId: string, newPosition: { x: number; y: number }) => {
    setOpenEventPopups(prev => prev.map(popup => popup.id === popupId ? { ...popup, position: newPosition } : popup));
  };

  const renderYearView = () => (
    <div className="card-moodita hover-lift">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigateYear('prev')} size="sm">← {currentDate.getFullYear() - 1}</Button>
            <Button variant="outline" onClick={() => navigateYear('next')} size="sm">{currentDate.getFullYear() + 1} →</Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>Semana</Button>
            <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>Mes</Button>
            <Button variant="default" size="sm" onClick={() => setViewMode('year')}>Año</Button>
            <div className="h-6 w-px bg-border mx-1" />
            <CalendarExportDialog events={events} />
          </div>
        </div>
        <YearlyCalendar year={currentDate.getFullYear()} events={events} onDateSelect={date => setSelectedDate(date)} onEventClick={handleEventClick} selectedDate={selectedDate} />
      </CardContent>
    </div>
  );

  if (loading) return <div className="p-6"><div className="text-center">Cargando calendario...</div></div>;
  if (!profile) return <div className="p-6"><div className="text-center">Error: No se pudo cargar el perfil</div></div>;

  return (
    <div className="container-moodita py-4 space-y-4 min-h-screen flex flex-col">
      <CalendarHeader onCreateEvent={() => setShouldOpenCreateDialog(true)} onImportCsv={handleImportCsvClick} onSyncGoogle={() => {}} isImporting={isImporting} />
      <input id="csv-upload" type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />

      <CalendarToolbar viewMode={viewMode} setViewMode={setViewMode} currentDate={currentDate} onNavigate={handleNavigate}
        onGoToToday={() => setCurrentDate(new Date())} showMyCalendar={showMyCalendar} setShowMyCalendar={setShowMyCalendar}
        selectedArtists={selectedArtists} setSelectedArtists={setSelectedArtists} selectedProjects={selectedProjects}
        setSelectedProjects={setSelectedProjects} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam}
        selectedDepartment={selectedDepartment} setSelectedDepartment={setSelectedDepartment} projects={projects} teamMembers={teamMembers} />

      <CreateEventDialogV2 open={shouldOpenCreateDialog} onOpenChange={open => { setShouldOpenCreateDialog(open); if (!open) { setPrefilledData(null); clearSelection(); } }}
        onEventCreated={fetchEvents} prefilledData={prefilledData} />

      <div className="flex-1">
        {viewMode === 'year' ? renderYearView() :
         viewMode === 'week' ? (
          <WeekView currentDate={currentDate} selectedDate={selectedDate} events={events} bookingOffers={bookingOffers}
            viewMode={viewMode} setViewMode={setViewMode} onNavigateWeek={navigateWeek} onSelectDate={d => setSelectedDate(d)}
            onEventClick={handleEventClick} getRemindersForBooking={getRemindersForBooking}
            isSelecting={isSelecting} selectionStart={selectionStart} selectionEnd={selectionEnd}
            hasActiveSelection={hasActiveSelection} onTimeSlotMouseDown={handleTimeSlotMouseDown}
            onTimeSlotMouseEnter={handleTimeSlotMouseEnter} onCreateEventFromSelection={createEventFromSelection}
            onClearSelection={clearSelection} />
         ) : (
          <MonthView currentDate={currentDate} selectedDate={selectedDate} events={events} bookingOffers={bookingOffers}
            viewMode={viewMode} setViewMode={setViewMode} onSelectDate={d => setSelectedDate(d)}
            onEventClick={handleEventClick} onBookingOfferClick={setSelectedBookingOffer}
            formatBookingTitle={formatBookingTitle} />
         )}
      </div>

      {/* Event Details for selected date */}
      {selectedDate && (
        <Card className="card-moodita">
          <CardHeader>
            <CardTitle>Eventos para {format(selectedDate, 'PPPP', { locale: es })}</CardTitle>
            <CardDescription>{getEventsForDate(selectedDate).length + getBookingOffersForDate(selectedDate).length} evento(s) programado(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getBookingOffersForDate(selectedDate).map(booking => (
              <div key={booking.id} className="card-interactive p-4 space-y-2 hover-glow border-l-4 border-l-amber-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center"><span className="text-white text-sm">🎤</span></div>
                    <div>
                      <h3 className="font-semibold">{formatBookingTitle(booking)}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {(booking.lugar || booking.venue) && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{booking.lugar || booking.venue}</div>}
                        {booking.duracion && <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.duracion}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={booking.estado === 'confirmado' ? 'default' : 'secondary'}>{booking.estado}</Badge>
                    {booking.formato && <Badge variant="outline">{booking.formato}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  {booking.folder_url && <Link to={booking.folder_url} className="text-sm text-primary hover:underline flex items-center gap-1"><Folder className="h-3 w-3" />Ver carpeta</Link>}
                  <Link to={`/booking/${booking.id}`} className="text-sm text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />Ver booking</Link>
                </div>
              </div>
            ))}
            {getEventsForDate(selectedDate).map(event => (
              <div key={event.id} className="card-interactive p-4 space-y-2 hover-glow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center"><CalendarIcon className="h-4 w-4 text-white" /></div>
                    <div>
                      <h3 className="font-semibold">{event.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}</div>
                        {event.location && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{event.event_type}</Badge>
                    {(() => { const bo = bookingOffers.find((o: any) => o.event_id === event.id); if (bo) { const r = getRemindersForBooking(bo.id); return r.length > 0 ? <ReminderBadge reminders={r} /> : null; } return null; })()}
                    <EditEventDialog event={event} onUpdated={fetchEvents} />
                  </div>
                </div>
                {event.description && <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{event.description}</p>}
              </div>
            ))}
            {getEventsForDate(selectedDate).length === 0 && getBookingOffersForDate(selectedDate).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No hay eventos programados para esta fecha</div>
            )}
          </CardContent>
        </Card>
      )}

      {openEventPopups.map(popup => (
        <EventDetailPopover key={popup.id} event={popup.event} open={true} onOpenChange={() => closePopup(popup.id)}
          position={popup.position} zIndex={popup.zIndex} onBringToFront={() => bringPopupToFront(popup.id)}
          onPositionChange={(newPos) => updatePopupPosition(popup.id, newPos)} artistName="David Solans" createdBy="Fabrica Mudita"
          onEdit={event => setEditingEvent(event)} onDelete={async (eventId) => {
            await supabase.from('events').delete().eq('id', eventId);
            fetchEvents();
          }} />
      ))}
      {editingEvent && (
        <EditEventDialog event={editingEvent} onUpdated={() => { setEditingEvent(null); fetchEvents(); }} />
      )}
    </div>
  );
}
