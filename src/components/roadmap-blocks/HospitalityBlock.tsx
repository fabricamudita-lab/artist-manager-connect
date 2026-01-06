import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamMemberSelector } from './TeamMemberSelector';

interface Hotel {
  id: string;
  name: string;
  address: string;
  mapLink: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  breakfastTime: string;
}

interface RoomAssignment {
  id: string;
  passenger: string; // Text-based passenger name (legacy)
  passengerIds?: string[]; // Contact IDs for linked team members
  roomType: 'single' | 'double' | 'twin' | 'suite';
}

interface HospitalityBlockData {
  hotels?: Hotel[];
  roomingList?: RoomAssignment[];
  dietNotes?: string;
}

interface HospitalityBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  artistId?: string | null;
}

const roomTypes = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Doble' },
  { value: 'twin', label: 'Twin' },
  { value: 'suite', label: 'Suite' },
];

export function HospitalityBlock({ data, onChange, artistId }: HospitalityBlockProps) {
  const blockData = data as HospitalityBlockData;
  const incomingHotels = blockData.hotels || [];
  const incomingRoomingList = blockData.roomingList || [];
  const incomingDietNotes = blockData.dietNotes || '';

  // Local state for immediate UI updates
  const [localHotels, setLocalHotels] = useState<Hotel[]>(incomingHotels);
  const [localRoomingList, setLocalRoomingList] = useState<RoomAssignment[]>(incomingRoomingList);
  const [localDietNotes, setLocalDietNotes] = useState(incomingDietNotes);

  const lastSyncedRef = useRef<string>(
    JSON.stringify({ hotels: incomingHotels, roomingList: incomingRoomingList, dietNotes: incomingDietNotes })
  );
  const debouncedHotels = useDebounce(localHotels, 500);
  const debouncedRoomingList = useDebounce(localRoomingList, 500);
  const debouncedDietNotes = useDebounce(localDietNotes, 500);

  // Sync from parent when data changes externally
  useEffect(() => {
    const next = JSON.stringify({ hotels: incomingHotels, roomingList: incomingRoomingList, dietNotes: incomingDietNotes });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalHotels(incomingHotels);
      setLocalRoomingList(incomingRoomingList);
      setLocalDietNotes(incomingDietNotes);
    }
  }, [incomingHotels, incomingRoomingList, incomingDietNotes]);

  // Save to parent when debounced data changes
  useEffect(() => {
    const next = JSON.stringify({ hotels: debouncedHotels, roomingList: debouncedRoomingList, dietNotes: debouncedDietNotes });
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, hotels: debouncedHotels, roomingList: debouncedRoomingList, dietNotes: debouncedDietNotes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedHotels, debouncedRoomingList, debouncedDietNotes]);

  const addHotel = () => {
    const newHotel: Hotel = {
      id: crypto.randomUUID(),
      name: '',
      address: '',
      mapLink: '',
      phone: '',
      checkIn: '',
      checkOut: '',
      breakfastTime: '',
    };
    setLocalHotels((prev) => [...prev, newHotel]);
  };

  const updateHotel = (hotelId: string, updates: Partial<Hotel>) => {
    setLocalHotels((prev) =>
      prev.map((h) => (h.id === hotelId ? { ...h, ...updates } : h))
    );
  };

  const removeHotel = (hotelId: string) => {
    setLocalHotels((prev) => prev.filter((h) => h.id !== hotelId));
  };

  const addRoomAssignment = () => {
    const newAssignment: RoomAssignment = {
      id: crypto.randomUUID(),
      passenger: '',
      passengerIds: [],
      roomType: 'single',
    };
    setLocalRoomingList((prev) => [...prev, newAssignment]);
  };

  const updateRoomAssignment = (assignmentId: string, updates: Partial<RoomAssignment>) => {
    setLocalRoomingList((prev) =>
      prev.map((r) => (r.id === assignmentId ? { ...r, ...updates } : r))
    );
  };

  const removeRoomAssignment = (assignmentId: string) => {
    setLocalRoomingList((prev) => prev.filter((r) => r.id !== assignmentId));
  };

  return (
    <div className="space-y-6">
      {/* Hotels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Hoteles</Label>
          <Button onClick={addHotel} variant="outline" size="sm" className="gap-1">
            <Plus className="w-3 h-3" />
            Hotel
          </Button>
        </div>
        {localHotels.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {localHotels.map((hotel) => (
              <Card key={hotel.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={hotel.name}
                      onChange={(e) => updateHotel(hotel.id, { name: e.target.value })}
                      placeholder="Nombre del hotel"
                      className="font-medium border-0 p-0 h-auto focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHotel(hotel.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Dirección</Label>
                    <div className="flex gap-2">
                      <Input
                        value={hotel.address}
                        onChange={(e) => updateHotel(hotel.id, { address: e.target.value })}
                        placeholder="Calle, número, ciudad"
                        className="flex-1"
                      />
                      {hotel.mapLink && (
                        <Button variant="outline" size="icon" asChild>
                          <a href={hotel.mapLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                    <Input
                      value={hotel.mapLink}
                      onChange={(e) => updateHotel(hotel.id, { mapLink: e.target.value })}
                      placeholder="Link a Google Maps"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Teléfono</Label>
                    <Input
                      value={hotel.phone}
                      onChange={(e) => updateHotel(hotel.id, { phone: e.target.value })}
                      placeholder="+34 XXX XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Horario Check-in / Check-out</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={hotel.checkIn}
                        onChange={(e) => updateHotel(hotel.id, { checkIn: e.target.value })}
                        placeholder="Check-in"
                      />
                      <Input
                        type="time"
                        value={hotel.checkOut}
                        onChange={(e) => updateHotel(hotel.id, { checkOut: e.target.value })}
                        placeholder="Check-out"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Horario Desayuno</Label>
                    <Input
                      value={hotel.breakfastTime}
                      onChange={(e) => updateHotel(hotel.id, { breakfastTime: e.target.value })}
                      placeholder="Ej: 7:00 - 10:30"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            No hay hoteles configurados
          </p>
        )}
      </div>

      {/* Rooming List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Rooming List</Label>
          <Button onClick={addRoomAssignment} variant="outline" size="sm" className="gap-1">
            <Plus className="w-3 h-3" />
            Pasajero
          </Button>
        </div>
        {localRoomingList.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasajero</TableHead>
                  <TableHead className="w-40">Tipo de Habitación</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localRoomingList.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <TeamMemberSelector
                        artistId={artistId}
                        value={assignment.passengerIds || []}
                        onValueChange={(ids) => updateRoomAssignment(assignment.id, { passengerIds: ids })}
                        placeholder="Seleccionar pasajero..."
                        compact
                        single
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={assignment.roomType}
                        onValueChange={(val) => updateRoomAssignment(assignment.id, { roomType: val as RoomAssignment['roomType'] })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roomTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRoomAssignment(assignment.id)}
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
            No hay pasajeros asignados
          </p>
        )}
      </div>

      {/* Diet Notes */}
      <div className="space-y-2">
        <Label>Notas de Dietas</Label>
        <Textarea
          value={localDietNotes}
          onChange={(e) => setLocalDietNotes(e.target.value)}
          placeholder="Ej: Solo desayunos incluidos. Alergias: María - gluten free."
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
