import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Pencil, Music, Utensils, Hotel, Plane, Users, Clock, X, Check, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamMemberSelector } from './TeamMemberSelector';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  activityType: string;
  title: string;
  location: string;
  notes: string;
  assignedMemberIds?: string[];
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

export interface ScheduleBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  tourDates?: string[];
  bookingInfo?: BookingInfo;
  artistId?: string | null;
  bookingId?: string | null;
}

interface ScheduleBlockData {
  days?: ScheduleDay[];
}

const activityTypes = [
  { value: 'travel', label: 'Viaje', icon: Plane, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'soundcheck', label: 'Soundcheck', icon: Music, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'rehearsal', label: 'Ensayo', icon: Music, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'show', label: 'Show', icon: Music, color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'meal', label: 'Comida', icon: Utensils, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'hotel', label: 'Hotel', icon: Hotel, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'apartment', label: 'Apartamento', icon: Hotel, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'meeting', label: 'Reunión', icon: Users, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'other', label: 'Otro', icon: Clock, color: 'bg-muted text-muted-foreground border-muted' },
];

const getActivityConfig = (type: string) => {
  return activityTypes.find(a => a.value === type) || activityTypes[activityTypes.length - 1];
};

export function ScheduleBlock({ data, onChange, tourDates, bookingInfo, artistId, bookingId }: ScheduleBlockProps) {
  const blockData = data as ScheduleBlockData;
  const incomingDays = useMemo(() => blockData.days || [], [blockData.days]);

  const [localDays, setLocalDays] = useState<ScheduleDay[]>(incomingDays);
  const [activeDay, setActiveDay] = useState(incomingDays[0]?.id || '');
  const [editingItem, setEditingItem] = useState<{ dayId: string; item: ScheduleItem } | null>(null);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('');
  const [newDayDate, setNewDayDate] = useState('');

  const lastSyncedRef = useRef<string>(JSON.stringify(incomingDays));
  const debouncedDays = useDebounce(localDays, 500);
  const hasAutoInitialized = useRef(false);

  // Auto-initialize days from tour dates
  useEffect(() => {
    if (!tourDates || tourDates.length === 0) return;
    
    const sortedDates = [...tourDates].sort();
    
    if (!hasAutoInitialized.current && incomingDays.length === 0) {
      hasAutoInitialized.current = true;
      const newDays: ScheduleDay[] = sortedDates.map((date) => {
        const items: ScheduleItem[] = [];
        const isShowDay = bookingInfo?.eventDate === date;
        
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

  useEffect(() => {
    const next = JSON.stringify(debouncedDays);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, days: debouncedDays });
    }
  }, [debouncedDays]);

  const addDay = () => {
    if (!newDayLabel.trim()) return;
    const newDay: ScheduleDay = {
      id: crypto.randomUUID(),
      label: newDayLabel,
      date: newDayDate,
      items: [],
    };
    setLocalDays((prev) => [...prev, newDay]);
    setActiveDay(newDay.id);
    setIsAddingDay(false);
    setNewDayLabel('');
    setNewDayDate('');
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

  const addItem = (dayId: string) => {
    const day = localDays.find((d) => d.id === dayId);
    let defaultStartTime = '';
    
    if (day && day.items.length > 0) {
      const lastItem = day.items[day.items.length - 1];
      defaultStartTime = lastItem.endTime || lastItem.startTime || '';
    }

    const newItem: ScheduleItem = {
      id: crypto.randomUUID(),
      startTime: defaultStartTime,
      endTime: '',
      activityType: 'other',
      title: '',
      location: '',
      notes: '',
      assignedMemberIds: [],
    };

    setEditingItem({ dayId, item: newItem });
  };

  const saveItem = () => {
    if (!editingItem) return;
    
    const { dayId, item } = editingItem;
    
    setLocalDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const existingIndex = d.items.findIndex(i => i.id === item.id);
        if (existingIndex >= 0) {
          const newItems = [...d.items];
          newItems[existingIndex] = item;
          return { ...d, items: newItems };
        }
        return { ...d, items: [...d.items, item] };
      })
    );
    setEditingItem(null);
  };

  const removeItem = (dayId: string, itemId: string) => {
    setLocalDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, items: d.items.filter((i) => i.id !== itemId) } : d))
    );
  };

  const currentDay = localDays.find((d) => d.id === activeDay);

  const sortedItems = useMemo(() => {
    if (!currentDay) return [];
    return [...currentDay.items].sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [currentDay]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), "EEEE d 'de' MMMM yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {localDays.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No hay días configurados</p>
          <Button onClick={() => setIsAddingDay(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Añadir Día
          </Button>
        </div>
      ) : (
        <>
          {/* Day tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {localDays.map((day) => (
              <Button
                key={day.id}
                variant={activeDay === day.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveDay(day.id)}
                className="relative group"
              >
                {day.label}
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
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                >
                  ×
                </span>
              </Button>
            ))}
            <Button onClick={() => setIsAddingDay(true)} variant="ghost" size="sm" className="gap-1">
              <Plus className="w-3 h-3" />
              Día
            </Button>
          </div>

          {/* Current day content */}
          {currentDay && (
            <div className="space-y-4">
              {/* Day header - visual style */}
              <div className="bg-primary rounded-lg p-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg uppercase">{currentDay.label}</h3>
                    {currentDay.date && (
                      <p className="text-sm opacity-90">{formatDate(currentDay.date)}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={() => {
                      const newLabel = prompt('Nombre del día:', currentDay.label);
                      if (newLabel) updateDay(currentDay.id, { label: newLabel });
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Schedule table - visual style */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-4 p-3 bg-muted/50 font-medium text-sm">
                  <div>HORA</div>
                  <div>ACTIVIDAD</div>
                  <div>UBICACIÓN</div>
                  <div>NOTAS</div>
                </div>
                
                {sortedItems.length > 0 ? (
                  <div className="divide-y">
                    {sortedItems.map((item) => {
                      const config = getActivityConfig(item.activityType);
                      const Icon = config.icon;
                      
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[100px_1fr_1fr_1fr] gap-4 p-3 items-center hover:bg-muted/30 group"
                        >
                          <div className="font-mono text-lg">
                            {item.startTime || '—'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${config.color} gap-1`}>
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </Badge>
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            {item.location ? (
                              <>
                                <span className="text-muted-foreground">⊙</span>
                                {item.location}
                              </>
                            ) : '—'}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{item.notes || '—'}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingItem({ dayId: currentDay.id, item: { ...item } })}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removeItem(currentDay.id, item.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay actividades para este día
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => addItem(currentDay.id)}
              >
                <Plus className="w-4 h-4" />
                Añadir Actividad
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add Day Dialog */}
      <Dialog open={isAddingDay} onOpenChange={setIsAddingDay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Día</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del día</Label>
              <Input
                value={newDayLabel}
                onChange={(e) => setNewDayLabel(e.target.value)}
                placeholder="Ej: Show, Day Off, Viaje..."
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={newDayDate}
                onChange={(e) => setNewDayDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingDay(false)}>Cancelar</Button>
            <Button onClick={addDay} disabled={!newDayLabel.trim()}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem && localDays.find(d => d.id === editingItem.dayId)?.items.some(i => i.id === editingItem.item.id)
                ? 'Editar Actividad'
                : 'Nueva Actividad'}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora inicio</Label>
                  <Input
                    type="time"
                    value={editingItem.item.startTime}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, startTime: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora fin</Label>
                  <Input
                    type="time"
                    value={editingItem.item.endTime}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, endTime: e.target.value }
                    })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de actividad</Label>
                <Select
                  value={editingItem.item.activityType}
                  onValueChange={(val) => {
                    const config = getActivityConfig(val);
                    setEditingItem({
                      ...editingItem,
                      item: { 
                        ...editingItem.item, 
                        activityType: val,
                        title: editingItem.item.title || config.label
                      }
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className="w-4 h-4" />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editingItem.item.title}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, title: e.target.value }
                  })}
                  placeholder="Nombre de la actividad"
                />
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={editingItem.item.location}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, location: e.target.value }
                  })}
                  placeholder="Lugar o dirección"
                />
              </div>

              <div className="space-y-2">
                <Label>Asignados</Label>
                <TeamMemberSelector
                  artistId={artistId}
                  bookingId={bookingId}
                  value={editingItem.item.assignedMemberIds || []}
                  onValueChange={(ids) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, assignedMemberIds: ids }
                  })}
                  placeholder="Seleccionar equipo..."
                />
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={editingItem.item.notes}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, notes: e.target.value }
                  })}
                  placeholder="Notas adicionales"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button onClick={saveItem}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
