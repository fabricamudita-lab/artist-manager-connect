import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Plane, Train } from 'lucide-react';
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

interface TravelTrip {
  id: string;
  date: string;
  medium: 'plane' | 'train' | 'bus' | 'car';
  flightNumber: string;
  pnr: string;
  origin: string;
  destination: string;
  passengers: string;
}

interface TravelBlockData {
  trips?: TravelTrip[];
  luggagePolicy?: string;
}

interface TravelBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

const mediumOptions = [
  { value: 'plane', label: 'Avión', icon: Plane },
  { value: 'train', label: 'Tren', icon: Train },
  { value: 'bus', label: 'Bus' },
  { value: 'car', label: 'Coche' },
];

export function TravelBlock({ data, onChange }: TravelBlockProps) {
  const blockData = data as TravelBlockData;
  const incomingTrips = blockData.trips || [];
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
      date: '',
      medium: 'plane',
      flightNumber: '',
      pnr: '',
      origin: '',
      destination: '',
      passengers: '',
    };
    setLocalTrips((prev) => [...prev, newTrip]);
  };

  const updateTrip = (tripId: string, updates: Partial<TravelTrip>) => {
    setLocalTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, ...updates } : t))
    );
  };

  const removeTrip = (tripId: string) => {
    setLocalTrips((prev) => prev.filter((t) => t.id !== tripId));
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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-24">Medio</TableHead>
                  <TableHead>Nº Vuelo/Tren</TableHead>
                  <TableHead>PNR</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Pasajeros</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localTrips.map((trip) => (
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
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={trip.flightNumber}
                        onChange={(e) => updateTrip(trip.id, { flightNumber: e.target.value })}
                        placeholder="IB1234"
                        className="h-8"
                      />
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
                        placeholder="MAD"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={trip.destination}
                        onChange={(e) => updateTrip(trip.id, { destination: e.target.value })}
                        placeholder="BCN"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={trip.passengers}
                        onChange={(e) => updateTrip(trip.id, { passengers: e.target.value })}
                        placeholder="Juan, María..."
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
                ))}
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
