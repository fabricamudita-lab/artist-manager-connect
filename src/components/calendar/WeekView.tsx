import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { CalendarExportDialog } from '@/components/CalendarExportDialog';
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
  project_id?: string | null;
}

interface WeekViewProps {
  currentDate: Date;
  selectedDate?: Date;
  events: Event[];
  bookingOffers: any[];
  viewMode: 'week' | 'month' | 'quarter' | 'year';
  setViewMode: (mode: 'week' | 'month' | 'quarter' | 'year') => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: Event, mouseEvent: React.MouseEvent) => void;
  getRemindersForBooking: (bookingId: string) => any[];
  // Time selection
  isSelecting: boolean;
  selectionStart: { day: Date; hour: number } | null;
  selectionEnd: { day: Date; hour: number } | null;
  hasActiveSelection: boolean;
  onTimeSlotMouseDown: (day: Date, hour: number) => void;
  onTimeSlotMouseEnter: (day: Date, hour: number) => void;
  onCreateEventFromSelection: () => void;
  onClearSelection: () => void;
}

export function WeekView({
  currentDate,
  selectedDate,
  events,
  bookingOffers,
  viewMode,
  setViewMode,
  onNavigateWeek,
  onSelectDate,
  onEventClick,
  getRemindersForBooking,
  selectionStart,
  selectionEnd,
  hasActiveSelection,
  onTimeSlotMouseDown,
  onTimeSlotMouseEnter,
  onCreateEventFromSelection,
  onClearSelection,
}: WeekViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 9 * 48;
    }
  }, [currentDate]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const isAllDayEvent = (event: Event) => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const startTime = startDate.getHours() * 60 + startDate.getMinutes();
    const endTime = endDate.getHours() * 60 + endDate.getMinutes();
    return (startTime === 0 && endTime === 1439) || startDate.toDateString() !== endDate.toDateString();
  };

  const getEventsForDate = (date: Date) => events.filter(event => isSameDay(new Date(event.start_date), date));
  const getAllDayEventsForDate = (date: Date) => getEventsForDate(date).filter(isAllDayEvent);
  const getTimedEventsForDate = (date: Date) => getEventsForDate(date).filter(event => !isAllDayEvent(event));

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

  return (
    <div className="calendar-week-view bg-background rounded-xl border shadow-soft overflow-hidden">
      <div className="bg-muted/30 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => onNavigateWeek('prev')} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => onNavigateWeek('next')} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>Semana</Button>
            <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>Mes</Button>
            <Button variant={viewMode === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('year')}>Año</Button>
            <div className="h-6 w-px bg-border mx-1" />
            <CalendarExportDialog events={events} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-8 border-b bg-muted/20">
        <div className="p-3 text-xs font-medium text-muted-foreground">GMT+02</div>
        {weekDays.map((day, index) => (
          <div key={index} className={`p-3 text-center border-l cursor-pointer hover:bg-muted/30 transition-colors ${selectedDate && isSameDay(day, selectedDate) ? 'bg-primary/10' : ''}`} onClick={() => onSelectDate(day)}>
            <div className="text-xs font-medium text-muted-foreground mb-1">{format(day, 'EEE', { locale: es }).toUpperCase()}</div>
            <div className={`text-2xl font-bold ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center mx-auto' : selectedDate && isSameDay(day, selectedDate) ? 'text-primary' : 'text-foreground'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-8 border-b bg-muted/5">
        <div className="p-3 text-xs font-medium text-muted-foreground bg-muted/10">Todo el día</div>
        {weekDays.map((day, dayIndex) => {
          const allDayEvents = getAllDayEventsForDate(day);
          return (
            <div key={dayIndex} className="border-l min-h-16 p-2 space-y-1">
              {allDayEvents.map((event) => (
                <div key={event.id} className={`text-xs px-2 py-1 rounded truncate font-medium relative ${event.event_type === 'concierto' ? 'bg-blue-100 text-blue-800 border border-blue-200' : event.event_type === 'entrevista' ? 'bg-green-100 text-green-800 border border-green-200' : event.event_type === 'reunion' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate">{event.title}</span>
                    {(() => {
                      const bookingOffer = bookingOffers.find((offer: any) => offer.event_id === event.id);
                      if (bookingOffer) {
                        const reminders = getRemindersForBooking(bookingOffer.id);
                        return reminders.length > 0 ? <div className="ml-1 flex-shrink-0"><ReminderBadge reminders={reminders} variant="compact" /></div> : null;
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

      <div className="h-96 overflow-y-auto" ref={scrollAreaRef}>
        <div className="grid grid-cols-8">
          <div className="bg-muted/10">
            {timeSlots.map(hour => (
              <div key={hour} className="h-12 border-b border-r border-muted/30 p-2 text-xs text-muted-foreground">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="border-r border-muted/30">
              {timeSlots.map(hour => {
                const dayEvents = getTimedEventsForDate(day).filter(event => new Date(event.start_date).getHours() === hour);
                const isFirstSelectedHour = selectionStart && selectionEnd && isSameDay(day, selectionStart.day) && hour === Math.min(selectionStart.hour, selectionEnd.hour);
                const selectedHoursCount = selectionStart && selectionEnd && isSameDay(day, selectionStart.day) ? Math.abs(selectionEnd.hour - selectionStart.hour) + 1 : 0;
                return (
                  <div key={hour} className="h-12 border-b border-muted/20 p-1 relative cursor-pointer hover:bg-muted/10 transition-colors select-none"
                    onMouseDown={e => { e.preventDefault(); onTimeSlotMouseDown(day, hour); }}
                    onMouseEnter={() => onTimeSlotMouseEnter(day, hour)}
                  >
                    {isFirstSelectedHour && (
                      <div className="absolute inset-x-1 bg-primary/90 border-2 border-primary rounded-lg flex items-center justify-center z-5 shadow-sm"
                        style={{ top: '4px', height: `${selectedHoursCount * 48 - 8}px` }}>
                        <span className="text-primary-foreground text-sm font-medium select-none">(Sin título)</span>
                      </div>
                    )}
                    {dayEvents.map((event, eventIndex) => (
                      <div key={event.id}
                        className={`absolute inset-1 border rounded text-xs p-2 overflow-hidden hover:opacity-80 transition-all cursor-pointer z-10 ${event.event_type === 'concierto' ? 'bg-blue-100 border-blue-300 text-blue-800' : event.event_type === 'entrevista' ? 'bg-green-100 border-green-300 text-green-800' : event.event_type === 'reunion' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-gray-100 border-gray-300 text-gray-800'}`}
                        style={{ zIndex: eventIndex + 10, marginTop: `${eventIndex * 2}px` }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); onEventClick(event, e); }}
                      >
                        <div className="flex flex-col h-full">
                          <div className="font-bold text-xs uppercase tracking-wide leading-tight mb-1">{event.title}</div>
                          <div className="text-xs opacity-80 leading-tight mb-1">
                            {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                          </div>
                          {event.location && <div className="text-xs opacity-70 leading-tight truncate">{event.location}</div>}
                          {(() => {
                            const bookingOffer = bookingOffers.find((offer: any) => offer.event_id === event.id);
                            if (bookingOffer) {
                              const reminders = getRemindersForBooking(bookingOffer.id);
                              return reminders.length > 0 ? <div className="mt-auto pt-1"><ReminderBadge reminders={reminders} variant="compact" /></div> : null;
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

      {hasActiveSelection && selectionStart && selectionEnd && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background border border-border/50 shadow-2xl rounded-xl p-4 z-20 animate-scale-in">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <div className="font-semibold text-foreground mb-1">{format(selectionStart.day, 'dd MMM yyyy', { locale: es })}</div>
              <div className="text-muted-foreground text-xs">{getSelectionTimeRange()}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={onCreateEventFromSelection} className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Plus className="h-3 w-3 mr-1.5" />Crear evento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
