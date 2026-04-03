import React from 'react';
import { Button } from '@/components/ui/button';
import { format, isSameDay, isSameMonth, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarExportDialog } from '@/components/CalendarExportDialog';

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

interface MonthViewProps {
  currentDate: Date;
  selectedDate?: Date;
  events: Event[];
  bookingOffers: any[];
  viewMode: 'week' | 'month' | 'quarter' | 'year';
  setViewMode: (mode: 'week' | 'month' | 'quarter' | 'year') => void;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: Event, mouseEvent: React.MouseEvent) => void;
  onBookingOfferClick: (offer: any) => void;
  formatBookingTitle: (offer: any) => string;
}

export function MonthView({
  currentDate,
  selectedDate,
  events,
  bookingOffers,
  viewMode,
  setViewMode,
  onSelectDate,
  onEventClick,
  onBookingOfferClick,
  formatBookingTitle,
}: MonthViewProps) {
  const nextMonth = addMonths(currentDate, 1);

  const getMonthWeeks = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };

  const getEventsForDate = (date: Date) => events.filter(event => isSameDay(new Date(event.start_date), date));
  const getBookingOffersForDate = (date: Date) => bookingOffers.filter((offer: any) => offer.fecha && isSameDay(new Date(offer.fecha), date));

  const renderSingleMonth = (monthDate: Date, monthWeeks: Date[][]) => (
    <div className="flex-1 min-w-0">
      <div className="bg-muted/20 p-3 border-b text-center">
        <h3 className="text-lg font-semibold capitalize">{format(monthDate, 'MMMM yyyy', { locale: es })}</h3>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/10">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthWeeks.map((week, weekIndex) => week.map((day, dayIndex) => {
          const dayEvents = getEventsForDate(day);
          const dayBookings = getBookingOffersForDate(day);
          const isCurrentMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, new Date());
          const allItems = [
            ...dayEvents.map(e => ({ type: 'event' as const, data: e })),
            ...dayBookings.map(b => ({ type: 'booking' as const, data: b }))
          ];
          return (
            <div key={`${weekIndex}-${dayIndex}`}
              className={`min-h-20 border-r border-b border-muted/30 p-1.5 cursor-pointer hover:bg-muted/10 transition-colors ${!isCurrentMonth ? 'bg-muted/5 text-muted-foreground' : ''}`}
              onClick={() => onSelectDate(day)}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {allItems.slice(0, 2).map((item, idx) => {
                  if (item.type === 'event') {
                    const event = item.data as Event;
                    return (
                      <div key={event.id} className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary/20"
                        onClick={e => { e.stopPropagation(); onEventClick(event, e); }}>
                        {event.title}
                      </div>
                    );
                  } else {
                    const booking = item.data;
                    return (
                      <div key={booking.id} className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50"
                        onClick={e => { e.stopPropagation(); onBookingOfferClick(booking); }}>
                        {formatBookingTitle(booking)}
                      </div>
                    );
                  }
                })}
                {allItems.length > 2 && <div className="text-[10px] text-muted-foreground">+{allItems.length - 2}</div>}
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );

  const currentMonthWeeks = getMonthWeeks(currentDate);
  const nextMonthWeeks = getMonthWeeks(nextMonth);

  return (
    <div className="calendar-month-view bg-background rounded-xl border shadow-soft overflow-hidden">
      <div className="bg-muted/30 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM', { locale: es })} - {format(nextMonth, 'MMMM yyyy', { locale: es })}
            </h2>
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
      <div className="flex divide-x">
        {renderSingleMonth(currentDate, currentMonthWeeks)}
        {renderSingleMonth(nextMonth, nextMonthWeeks)}
      </div>
    </div>
  );
}
