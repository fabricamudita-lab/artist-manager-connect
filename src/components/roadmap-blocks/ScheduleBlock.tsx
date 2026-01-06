import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamMemberSelector } from './TeamMemberSelector';

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  activityType: string;
  title: string;
  location: string;
  notes: string;
  assignedMemberIds?: string[]; // Contact IDs for assigned team members
}

interface ScheduleDay {
  id: string;
  label: string;
  date: string;
  items: ScheduleItem[];
}

interface BookingInfo {
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  city?: string;
  tourTitle?: string;
}

interface ScheduleBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  tourDates?: string[]; // Dates from the tour to auto-initialize days
  bookingInfo?: BookingInfo; // Booking info to auto-fill activities
  artistId?: string | null;
}

interface ScheduleBlockData {
  days?: ScheduleDay[];
}

const activityTypes = [
  { value: 'travel', label: 'Viaje' },
  { value: 'soundcheck', label: 'Soundcheck' },
  { value: 'rehearsal', label: 'Ensayo' },
  { value: 'show', label: 'Show' },
  { value: 'meal', label: 'Comida' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'apartment', label: 'Apartamento' },
  { value: 'meeting', label: 'Reunión' },
  { value: 'other', label: 'Otro' },
];

export function ScheduleBlock({ data, onChange, tourDates, bookingInfo, artistId }: ScheduleBlockProps) {
  const blockData = data as ScheduleBlockData;
  const incomingDays = useMemo(() => blockData.days || [], [blockData.days]);

  // Local state to avoid losing keystrokes due to re-renders + remote saves.
  const [localDays, setLocalDays] = useState<ScheduleDay[]>(incomingDays);
  const [activeDay, setActiveDay] = useState(incomingDays[0]?.id || '');

  const lastSyncedRef = useRef<string>(JSON.stringify(incomingDays));
  const debouncedDays = useDebounce(localDays, 500);
  const hasAutoInitialized = useRef(false);

  // Auto-initialize days from tour dates - create a day for each tour date
  // Also auto-generate show activity on event date
  useEffect(() => {
    if (!tourDates || tourDates.length === 0) return;
    
    const sortedDates = [...tourDates].sort();
    
    // If block is empty, initialize with all tour dates
    if (!hasAutoInitialized.current && incomingDays.length === 0) {
      hasAutoInitialized.current = true;
      const newDays: ScheduleDay[] = sortedDates.map((date) => {
        const items: ScheduleItem[] = [];
        const isShowDay = bookingInfo?.eventDate === date;
        
        // If this date matches the event date from booking, add show activity
        if (isShowDay && bookingInfo?.eventTime) {
          items.push({
            id: crypto.randomUUID(),
            startTime: bookingInfo.eventTime,
            endTime: '',
            activityType: 'show',
            title: bookingInfo.tourTitle || 'Concierto',
            location: bookingInfo.venue || '',
            notes: bookingInfo.city || '',
          });
        }
        
        return {
          id: crypto.randomUUID(),
          label: isShowDay ? 'Show' : 'Day Off',
          date,
          items,
        };
      });
      setLocalDays(newDays);
      setActiveDay(newDays[0]?.id || '');
    }
  }, [incomingDays.length, tourDates, bookingInfo]);

  // Sync from parent when server/queries update the block.
  useEffect(() => {
    const next = JSON.stringify(incomingDays);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalDays(incomingDays);
      setActiveDay((prev) => {
        const exists = incomingDays.some((d) => d.id === prev);
        return exists ? prev : (incomingDays[0]?.id || '');
      });
    }
  }, [incomingDays]);

  // Persist to parent (and DB) in a debounced way.
  useEffect(() => {
    const next = JSON.stringify(debouncedDays);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, days: debouncedDays });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDays]);

  const addDay = () => {
    const newDay: ScheduleDay = {
      id: crypto.randomUUID(),
      label: `Día ${localDays.length + 1}`,
      date: '',
      items: [],
    };
    setLocalDays((prev) => [...prev, newDay]);
    setActiveDay(newDay.id);
  };

  const updateDay = (dayId: string, updates: Partial<ScheduleDay>) => {
    setLocalDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, ...updates } : d)));
  };

  const removeDay = (dayId: string) => {
    setLocalDays((prev) => {
      const next = prev.filter((d) => d.id !== dayId);
      setActiveDay((current) => {
        if (current !== dayId) return current;
        return next[0]?.id || '';
      });
      return next;
    });
  };

  const addItem = (dayId: string, activityType: string = 'other') => {
    // Find the last known time from the previous activity
    const day = localDays.find((d) => d.id === dayId);
    let defaultStartTime = '';
    
    if (day && day.items.length > 0) {
      const lastItem = day.items[day.items.length - 1];
      // Use endTime if available, otherwise use startTime
      defaultStartTime = lastItem.endTime || lastItem.startTime || '';
    }

    // Get the label for the activity type
    const activityLabel = activityTypes.find(t => t.value === activityType)?.label || '';

    const newItem: ScheduleItem = {
      id: crypto.randomUUID(),
      startTime: defaultStartTime,
      endTime: '',
      activityType,
      title: activityLabel,
      location: '',
      notes: '',
      assignedMemberIds: [],
    };

    setLocalDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, items: [...d.items, newItem] } : d))
    );
  };

  const updateItem = (dayId: string, itemId: string, updates: Partial<ScheduleItem>) => {
    setLocalDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)) }
          : d
      )
    );
  };

  const removeItem = (dayId: string, itemId: string) => {
    setLocalDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, items: d.items.filter((i) => i.id !== itemId) } : d))
    );
  };

  const currentDay = localDays.find((d) => d.id === activeDay);

  return (
    <div className="space-y-4">
      {localDays.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No hay días configurados</p>
          <Button onClick={addDay} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Añadir Día
          </Button>
        </div>
      ) : (
        <Tabs value={activeDay} onValueChange={setActiveDay}>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <TabsList className="flex-wrap h-auto">
              {localDays.map((day) => (
                <TabsTrigger key={day.id} value={day.id} className="relative group">
                  {day.label}
                  {/* Avoid nesting <button> inside <button> (TabsTrigger renders a button) */}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDay(day.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        removeDay(day.id);
                      }
                    }}
                    aria-label={`Eliminar ${day.label}`}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  >
                    ×
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={addDay} variant="outline" size="sm" className="gap-1">
              <Plus className="w-3 h-3" />
              Día
            </Button>
          </div>

          {currentDay && (
            <TabsContent value={currentDay.id} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del día</Label>
                  <Input
                    value={currentDay.label}
                    onChange={(e) => updateDay(currentDay.id, { label: e.target.value })}
                    placeholder="Ej: Viernes 12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={currentDay.date}
                    onChange={(e) => updateDay(currentDay.id, { date: e.target.value })}
                  />
                </div>
              </div>

              {/* Table header */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground w-20">Inicio</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground w-20">Fin</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground w-32">Tipo</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Título</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Ubicación</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Notas</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...currentDay.items]
                      .sort((a, b) => {
                        if (!a.startTime && !b.startTime) return 0;
                        if (!a.startTime) return 1;
                        if (!b.startTime) return -1;
                        return a.startTime.localeCompare(b.startTime);
                      })
                      .map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-2">
                            <Input
                              type="time"
                              value={item.startTime}
                              onChange={(e) => updateItem(currentDay.id, item.id, { startTime: e.target.value })}
                              className="h-9 w-full"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="time"
                              value={item.endTime}
                              onChange={(e) => updateItem(currentDay.id, item.id, { endTime: e.target.value })}
                              className="h-9 w-full"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Select
                              value={item.activityType}
                              onValueChange={(val) => updateItem(currentDay.id, item.id, { activityType: val })}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {activityTypes.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={item.title}
                              onChange={(e) => updateItem(currentDay.id, item.id, { title: e.target.value })}
                              placeholder="Título"
                              className="h-9 w-full"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={item.location}
                              onChange={(e) => updateItem(currentDay.id, item.id, { location: e.target.value })}
                              placeholder="Ubicación"
                              className="h-9 w-full"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={item.notes}
                              onChange={(e) => updateItem(currentDay.id, item.id, { notes: e.target.value })}
                              placeholder="Notas"
                              className="h-9 w-full"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(currentDay.id, item.id)}
                              className="text-destructive hover:text-destructive h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <Button 
                variant="outline" 
                className="gap-2 mt-3"
                onClick={() => addItem(currentDay.id, 'other')}
              >
                <Plus className="w-4 h-4" />
                Añadir Actividad
              </Button>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
