import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface RoomType {
  id: string;
  name: string;
  capacity: number;
}

interface RoomAssignment {
  id: string;
  passenger: string; // Text-based passenger name (legacy)
  passengerIds?: string[]; // Contact IDs for linked team members
  roomType: string;
  capacityAcknowledged?: boolean; // User confirmed they're okay with over-capacity
}

interface HospitalityBlockData {
  hotels?: Hotel[];
  roomingList?: RoomAssignment[];
  dietNotes?: string;
}

export interface HospitalityBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  artistId?: string | null;
  bookingId?: string | null; // Booking ID to fetch crew from format
}

export function HospitalityBlock({ data, onChange, artistId, bookingId }: HospitalityBlockProps) {
  const blockData = data as HospitalityBlockData;
  const incomingHotels = blockData.hotels || [];
  const incomingRoomingList = blockData.roomingList || [];
  const incomingDietNotes = blockData.dietNotes || '';

  // Local state for immediate UI updates
  const [localHotels, setLocalHotels] = useState<Hotel[]>(incomingHotels);
  const [localRoomingList, setLocalRoomingList] = useState<RoomAssignment[]>(incomingRoomingList);
  const [localDietNotes, setLocalDietNotes] = useState(incomingDietNotes);
  
  // Room types from database
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [newRoomTypeName, setNewRoomTypeName] = useState('');
  const [newRoomTypeCapacity, setNewRoomTypeCapacity] = useState(1);
  const [showAddRoomType, setShowAddRoomType] = useState(false);

  const lastSyncedRef = useRef<string>(
    JSON.stringify({ hotels: incomingHotels, roomingList: incomingRoomingList, dietNotes: incomingDietNotes })
  );
  const debouncedHotels = useDebounce(localHotels, 500);
  const debouncedRoomingList = useDebounce(localRoomingList, 500);
  const debouncedDietNotes = useDebounce(localDietNotes, 500);

  // Fetch room types from database
  useEffect(() => {
    const fetchRoomTypes = async () => {
      const { data: types, error } = await supabase
        .from('custom_room_types')
        .select('id, name, capacity')
        .order('name');
      
      if (!error && types) {
        setRoomTypes(types);
      }
    };
    fetchRoomTypes();
  }, []);

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
    const defaultType = roomTypes.find(t => t.name.toLowerCase() === 'single') || roomTypes[0];
    const newAssignment: RoomAssignment = {
      id: crypto.randomUUID(),
      passenger: '',
      passengerIds: [],
      roomType: defaultType?.name || 'Single',
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

  // Add new room type to database
  const handleAddRoomType = async () => {
    if (!newRoomTypeName.trim()) return;
    
    const { data: newType, error } = await supabase
      .from('custom_room_types')
      .insert({
        name: newRoomTypeName.trim(),
        capacity: newRoomTypeCapacity,
        created_by: 'user'
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Error al crear tipo de habitación');
      return;
    }
    
    if (newType) {
      setRoomTypes(prev => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRoomTypeName('');
      setNewRoomTypeCapacity(1);
      setShowAddRoomType(false);
      toast.success('Tipo de habitación creado');
    }
  };

  // Get capacity warning for a room assignment
  const getCapacityWarning = (assignment: RoomAssignment): string | null => {
    const roomType = roomTypes.find(t => t.name === assignment.roomType);
    if (!roomType || !assignment.passengerIds) return null;
    
    const guestCount = assignment.passengerIds.length;
    if (guestCount === 0) return null;
    
    if (guestCount > roomType.capacity) {
      return `Esta habitación es para ${roomType.capacity} persona${roomType.capacity > 1 ? 's' : ''}, pero hay ${guestCount} asignados`;
    }
    
    return null;
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
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowAddRoomType(!showAddRoomType)} 
              variant="ghost" 
              size="sm"
              className="text-xs"
            >
              + Tipo habitación
            </Button>
            <Button onClick={addRoomAssignment} variant="outline" size="sm" className="gap-1">
              <Plus className="w-3 h-3" />
              Habitación
            </Button>
          </div>
        </div>

        {/* Add new room type form */}
        {showAddRoomType && (
          <Card className="p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Nombre del tipo</Label>
                <Input
                  value={newRoomTypeName}
                  onChange={(e) => setNewRoomTypeName(e.target.value)}
                  placeholder="Ej: Junior Suite"
                  className="h-8"
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Capacidad</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newRoomTypeCapacity}
                  onChange={(e) => setNewRoomTypeCapacity(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <Button onClick={handleAddRoomType} size="sm" className="h-8">
                Añadir
              </Button>
              <Button onClick={() => setShowAddRoomType(false)} variant="ghost" size="sm" className="h-8">
                Cancelar
              </Button>
            </div>
          </Card>
        )}

        {localRoomingList.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="w-40">Tipo de Habitación</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localRoomingList.map((assignment) => {
                  const warning = getCapacityWarning(assignment);
                  const showWarning = warning && !assignment.capacityAcknowledged;
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="space-y-2">
                          <TeamMemberSelector
                            artistId={artistId}
                            bookingId={bookingId}
                            value={assignment.passengerIds || []}
                            onValueChange={(ids) => updateRoomAssignment(assignment.id, { 
                              passengerIds: ids,
                              capacityAcknowledged: false // Reset acknowledgement when passengers change
                            })}
                            placeholder="Seleccionar equipo..."
                            compact
                          />
                          {showWarning && (
                            <Alert variant="destructive" className="py-2 px-3">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <AlertDescription className="text-xs">
                                    {warning}
                                  </AlertDescription>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs hover:bg-destructive/20"
                                  onClick={() => updateRoomAssignment(assignment.id, { capacityAcknowledged: true })}
                                >
                                  Entendido
                                </Button>
                              </div>
                            </Alert>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assignment.roomType}
                          onValueChange={(val) => updateRoomAssignment(assignment.id, { roomType: val })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roomTypes.map((t) => (
                              <SelectItem key={t.id} value={t.name}>
                                {t.name} ({t.capacity}p)
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            No hay habitaciones asignadas
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
