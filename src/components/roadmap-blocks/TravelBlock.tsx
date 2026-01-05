import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Plane, Train, Bus, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';

export interface TravelTrip {
  id: string;
  date: string;
  medium: 'plane' | 'train' | 'bus' | 'car';
  serviceNumber: string; // Nº Vuelo, Nº Tren, Nº Línea, etc.
  pnr: string; // Localizador / Código de reserva
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  passengers: string[];
  luggagePolicy?: string; // Política de equipaje específica para este desplazamiento
}

interface TravelBlockData {
  trips?: TravelTrip[];
  luggagePolicy?: string;
}

interface TravelBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  tourDates?: string[];
  bookingInfo?: {
    eventDate?: string;
  };
}

const mediumOptions = [
  { value: 'plane', label: 'Avión', icon: Plane, serviceLabel: 'Nº Vuelo', placeholder: 'IB1234' },
  { value: 'train', label: 'Tren', icon: Train, serviceLabel: 'Nº Tren', placeholder: 'AVE 1234' },
  { value: 'bus', label: 'Bus', icon: Bus, serviceLabel: 'Nº Línea', placeholder: 'ALSA 123' },
  { value: 'car', label: 'Coche', icon: Car, serviceLabel: null, placeholder: '' },
];

const getServiceLabel = (medium: TravelTrip['medium']): string | null => {
  const option = mediumOptions.find(o => o.value === medium);
  return option?.serviceLabel || null;
};

const getServicePlaceholder = (medium: TravelTrip['medium']): string => {
  const option = mediumOptions.find(o => o.value === medium);
  return option?.placeholder || '';
};

export function TravelBlock({ data, onChange, tourDates, bookingInfo }: TravelBlockProps) {
  const blockData = data as TravelBlockData;
  const incomingTrips = blockData.trips || [];
  
  // Get default date: first tour date or booking event date
  const getDefaultDate = (): string => {
    if (tourDates && tourDates.length > 0) {
      return [...tourDates].sort()[0];
    }
    if (bookingInfo?.eventDate) {
      return bookingInfo.eventDate;
    }
    return '';
  };
  const incomingLuggagePolicy = blockData.luggagePolicy || '';

  // Local state for immediate UI updates
  const [localTrips, setLocalTrips] = useState<TravelTrip[]>(incomingTrips);
  const [localLuggagePolicy, setLocalLuggagePolicy] = useState(incomingLuggagePolicy);

  const lastSyncedRef = useRef<string>(JSON.stringify({ trips: incomingTrips, luggagePolicy: incomingLuggagePolicy }));
  const debouncedTrips = useDebounce(localTrips, 500);
  const debouncedLuggagePolicy = useDebounce(localLuggagePolicy, 500);

  // Sync from parent when data changes externally
  useEffect(() => {
    const next = JSON.stringify({ trips: incomingTrips, luggagePolicy: incomingLuggagePolicy });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalTrips(incomingTrips);
      setLocalLuggagePolicy(incomingLuggagePolicy);
    }
  }, [incomingTrips, incomingLuggagePolicy]);

  // Save to parent when debounced data changes
  useEffect(() => {
    const next = JSON.stringify({ trips: debouncedTrips, luggagePolicy: debouncedLuggagePolicy });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, trips: debouncedTrips, luggagePolicy: debouncedLuggagePolicy });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTrips, debouncedLuggagePolicy]);

  const addTrip = () => {
    const newTrip: TravelTrip = {
      id: crypto.randomUUID(),
      date: getDefaultDate(),
      medium: 'plane',
      serviceNumber: '',
      pnr: '',
      origin: '',
      destination: '',
      departureTime: '',
      arrivalTime: '',
      passengers: [],
      luggagePolicy: '',
    };
    setLocalTrips((prev) => sortTripsByDate([...prev, newTrip]));
  };

  // Sort trips chronologically by date and departure time
  const sortTripsByDate = (trips: TravelTrip[]): TravelTrip[] => {
    return [...trips].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      // Same date - sort by departure time
      if (!a.departureTime && !b.departureTime) return 0;
      if (!a.departureTime) return 1;
      if (!b.departureTime) return -1;
      return a.departureTime.localeCompare(b.departureTime);
    });
  };

  const updateTrip = (tripId: string, updates: Partial<TravelTrip>) => {
    setLocalTrips((prev) => {
      const updated = prev.map((t) => (t.id === tripId ? { ...t, ...updates } : t));
      // Re-sort if date or departureTime changed
      if ('date' in updates || 'departureTime' in updates) {
        return sortTripsByDate(updated);
      }
      return updated;
    });
  };

  const removeTrip = (tripId: string) => {
    setLocalTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const handlePassengersChange = (tripId: string, value: string) => {
    // Convert comma-separated string to array
    const passengers = value.split(',').map((p) => p.trim()).filter(Boolean);
    updateTrip(tripId, { passengers });
  };

  const getPassengersString = (passengers: string[] | string | undefined): string => {
    if (!passengers) return '';
    if (typeof passengers === 'string') return passengers;
    return passengers.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Luggage Policy */}
      <div className="space-y-2">
        <Label>Política de Equipaje</Label>
        <Textarea
          value={localLuggagePolicy}
          onChange={(e) => setLocalLuggagePolicy(e.target.value)}
          placeholder="Ej: Equipaje de mano: 55x40x23cm, máx 10kg. Facturado: 23kg incluido."
          className="min-h-[80px]"
        />
      </div>

      {/* Trips Table */}
      <div className="space-y-2">
        <Label>Desplazamientos</Label>
        {localTrips.length > 0 ? (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-24">Medio</TableHead>
                  <TableHead className="w-28">Nº Servicio</TableHead>
                  <TableHead className="w-24">Localizador</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="w-20">Salida</TableHead>
                  <TableHead className="w-20">Llegada</TableHead>
                  <TableHead className="min-w-[150px]">Pasajeros</TableHead>
                  <TableHead className="min-w-[180px]">Equipaje</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localTrips.map((trip) => {
                  const serviceLabel = getServiceLabel(trip.medium);
                  const servicePlaceholder = getServicePlaceholder(trip.medium);
                  
                  return (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <Input
                        type="date"
                        value={trip.date}
                        onChange={(e) => updateTrip(trip.id, { date: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={trip.medium}
                        onValueChange={(val) => updateTrip(trip.id, { medium: val as TravelTrip['medium'] })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mediumOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-1">
                                <opt.icon className="w-3 h-3" />
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {serviceLabel ? (
                        <Input
                          value={trip.serviceNumber || ''}
                          onChange={(e) => updateTrip(trip.id, { serviceNumber: e.target.value })}
                          placeholder={servicePlaceholder}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={trip.pnr}
                        onChange={(e) => updateTrip(trip.id, { pnr: e.target.value })}
                        placeholder="ABC123"
                        className="h-8 font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={trip.origin}
                        onChange={(e) => updateTrip(trip.id, { origin: e.target.value })}
                        placeholder="Madrid (MAD)"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={trip.destination}
                        onChange={(e) => updateTrip(trip.id, { destination: e.target.value })}
                        placeholder="Roma (FCO)"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={trip.departureTime}
                        onChange={(e) => updateTrip(trip.id, { departureTime: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={trip.arrivalTime}
                        onChange={(e) => updateTrip(trip.id, { arrivalTime: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={getPassengersString(trip.passengers)}
                        onChange={(e) => handlePassengersChange(trip.id, e.target.value)}
                        placeholder="Juan, María, Pedro"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={trip.luggagePolicy || ''}
                        onChange={(e) => updateTrip(trip.id, { luggagePolicy: e.target.value })}
                        placeholder="55x40x23cm, 10kg"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTrip(trip.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            No hay desplazamientos configurados
          </p>
        )}
        <Button onClick={addTrip} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Añadir Desplazamiento
        </Button>
      </div>
    </div>
  );
}
