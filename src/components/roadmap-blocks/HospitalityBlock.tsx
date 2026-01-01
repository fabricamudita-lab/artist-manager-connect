import { Plus, Trash2, MapPin, ExternalLink } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  passenger: string;
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
}

const roomTypes = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Doble' },
  { value: 'twin', label: 'Twin' },
  { value: 'suite', label: 'Suite' },
];

export function HospitalityBlock({ data, onChange }: HospitalityBlockProps) {
  const blockData = data as HospitalityBlockData;
  const hotels = blockData.hotels || [];
  const roomingList = blockData.roomingList || [];

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
    onChange({ ...data, hotels: [...hotels, newHotel] });
  };

  const updateHotel = (hotelId: string, updates: Partial<Hotel>) => {
    const newHotels = hotels.map((h) => (h.id === hotelId ? { ...h, ...updates } : h));
    onChange({ ...data, hotels: newHotels });
  };

  const removeHotel = (hotelId: string) => {
    onChange({ ...data, hotels: hotels.filter((h) => h.id !== hotelId) });
  };

  const addRoomAssignment = () => {
    const newAssignment: RoomAssignment = {
      id: crypto.randomUUID(),
      passenger: '',
      roomType: 'single',
    };
    onChange({ ...data, roomingList: [...roomingList, newAssignment] });
  };

  const updateRoomAssignment = (assignmentId: string, updates: Partial<RoomAssignment>) => {
    const newList = roomingList.map((r) => (r.id === assignmentId ? { ...r, ...updates } : r));
    onChange({ ...data, roomingList: newList });
  };

  const removeRoomAssignment = (assignmentId: string) => {
    onChange({ ...data, roomingList: roomingList.filter((r) => r.id !== assignmentId) });
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
        {hotels.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {hotels.map((hotel) => (
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
        {roomingList.length > 0 ? (
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
                {roomingList.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Input
                        value={assignment.passenger}
                        onChange={(e) => updateRoomAssignment(assignment.id, { passenger: e.target.value })}
                        placeholder="Nombre completo"
                        className="h-8"
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
          value={blockData.dietNotes || ''}
          onChange={(e) => onChange({ ...data, dietNotes: e.target.value })}
          placeholder="Ej: Solo desayunos incluidos. Alergias: María - gluten free."
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
