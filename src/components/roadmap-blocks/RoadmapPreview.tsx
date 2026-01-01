import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, Mail, MapPin, Plane, Train, Bus, Car, Clock, Hotel, Users, Music, Calendar, User } from 'lucide-react';
import { RoadmapBlock } from '@/hooks/useRoadmaps';
import { Separator } from '@/components/ui/separator';

interface RoadmapPreviewProps {
  roadmapName: string;
  artistName?: string;
  promoter?: string;
  startDate?: string | null;
  endDate?: string | null;
  blocks: RoadmapBlock[];
}

// Type definitions for block data
interface HeaderBlockData {
  artistName?: string;
  tourTitle?: string;
  localPromoter?: string;
  globalDates?: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

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

interface HotelData {
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

interface BacklineItem {
  id: string;
  category: string;
  instrument: string;
  model: string;
  provider: string;
  confirmed: boolean;
}

interface VenueBackline {
  id: string;
  venueName: string;
  items: BacklineItem[];
}

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  activityType: string;
  title: string;
  location: string;
  notes: string;
}

interface ScheduleDay {
  id: string;
  label: string;
  date: string;
  items: ScheduleItem[];
}

const activityTypeLabels: Record<string, string> = {
  travel: 'Viaje',
  soundcheck: 'Soundcheck',
  show: 'Show',
  meal: 'Comida',
  hotel: 'Hotel',
  meeting: 'Reunión',
  other: 'Otro',
};

const roomTypeLabels: Record<string, string> = {
  single: 'Single',
  double: 'Doble',
  twin: 'Twin',
  suite: 'Suite',
};

const MediumIcon = ({ medium }: { medium: string }) => {
  switch (medium) {
    case 'plane': return <Plane className="w-4 h-4" />;
    case 'train': return <Train className="w-4 h-4" />;
    case 'bus': return <Bus className="w-4 h-4" />;
    case 'car': return <Car className="w-4 h-4" />;
    default: return null;
  }
};

export function RoadmapPreview({ roadmapName, artistName, promoter, startDate, endDate, blocks }: RoadmapPreviewProps) {
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "d 'de' MMMM yyyy", { locale: es });
    } catch {
      return date;
    }
  };

  const renderHeader = (data: HeaderBlockData) => (
    <div className="text-center space-y-2 py-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg">
      <h1 className="text-3xl font-bold font-playfair">{data.artistName || artistName || 'Artista'}</h1>
      {data.tourTitle && <p className="text-xl text-muted-foreground">{data.tourTitle}</p>}
      {data.globalDates && <p className="text-sm text-muted-foreground">{data.globalDates}</p>}
      {data.localPromoter && (
        <p className="text-sm">
          <span className="text-muted-foreground">Promotor Local:</span> {data.localPromoter}
        </p>
      )}
    </div>
  );

  const renderContacts = (data: { contacts?: Contact[] }) => {
    const contacts = data.contacts || [];
    if (contacts.length === 0) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Contactos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="border rounded-lg p-4 space-y-1">
              <p className="font-medium">{contact.name || 'Sin nombre'}</p>
              {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
              <div className="flex flex-wrap gap-3 pt-2 text-sm">
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {contact.email}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTravel = (data: { trips?: TravelTrip[]; luggagePolicy?: string }) => {
    const trips = data.trips || [];

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Plane className="w-5 h-5" />
          Logística de Viaje
        </h2>
        
        {data.luggagePolicy && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Política de Equipaje</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.luggagePolicy}</p>
          </div>
        )}

        {trips.length > 0 && (
          <div className="space-y-2">
            {trips.map((trip) => (
              <div key={trip.id} className="border rounded-lg p-4 flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                  <MediumIcon medium={trip.medium} />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha</p>
                    <p>{trip.date ? formatDate(trip.date) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Ruta</p>
                    <p className="font-medium">{trip.origin} → {trip.destination}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vuelo/Tren</p>
                    <p>{trip.flightNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">PNR</p>
                    <p className="font-mono">{trip.pnr || '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHospitality = (data: { hotels?: HotelData[]; roomingList?: RoomAssignment[]; dietNotes?: string }) => {
    const hotels = data.hotels || [];
    const roomingList = data.roomingList || [];

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Hotel className="w-5 h-5" />
          Hospitalidad
        </h2>

        {hotels.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Hoteles</h3>
            {hotels.map((hotel) => (
              <div key={hotel.id} className="border rounded-lg p-4 space-y-2">
                <p className="font-medium text-lg">{hotel.name || 'Hotel sin nombre'}</p>
                {hotel.address && (
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {hotel.address}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                  {hotel.phone && (
                    <div>
                      <p className="text-muted-foreground text-xs">Teléfono</p>
                      <p>{hotel.phone}</p>
                    </div>
                  )}
                  {hotel.checkIn && (
                    <div>
                      <p className="text-muted-foreground text-xs">Check-in</p>
                      <p>{hotel.checkIn}</p>
                    </div>
                  )}
                  {hotel.checkOut && (
                    <div>
                      <p className="text-muted-foreground text-xs">Check-out</p>
                      <p>{hotel.checkOut}</p>
                    </div>
                  )}
                  {hotel.breakfastTime && (
                    <div>
                      <p className="text-muted-foreground text-xs">Desayuno</p>
                      <p>{hotel.breakfastTime}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {roomingList.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Rooming List</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Pasajero</th>
                    <th className="text-left p-3">Tipo de Habitación</th>
                  </tr>
                </thead>
                <tbody>
                  {roomingList.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{r.passenger || '-'}</td>
                      <td className="p-3">{roomTypeLabels[r.roomType] || r.roomType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.dietNotes && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Notas de Dietas</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.dietNotes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderProduction = (data: { venues?: VenueBackline[] }) => {
    const venues = data.venues || [];
    if (venues.length === 0) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Music className="w-5 h-5" />
          Producción Técnica
        </h2>

        {venues.map((venue) => (
          <div key={venue.id} className="border rounded-lg p-4 space-y-3">
            <p className="font-medium">{venue.venueName || 'Venue sin nombre'}</p>
            {venue.items.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Instrumento</th>
                    <th className="text-left p-2">Modelo</th>
                    <th className="text-left p-2">Proveedor</th>
                    <th className="text-left p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {venue.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.instrument || '-'}</td>
                      <td className="p-2">{item.model || '-'}</td>
                      <td className="p-2">{item.provider || '-'}</td>
                      <td className="p-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs ${item.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {item.confirmed ? 'Confirmado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSchedule = (data: { days?: ScheduleDay[] }) => {
    const days = data.days || [];
    if (days.length === 0) return null;

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Cronograma
        </h2>

        {days.map((day) => (
          <div key={day.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-lg">{day.label}</h3>
              {day.date && (
                <span className="text-sm text-muted-foreground">
                  ({formatDate(day.date)})
                </span>
              )}
            </div>
            
            {day.items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 w-28">Hora</th>
                      <th className="text-left p-3">Actividad</th>
                      <th className="text-left p-3">Ubicación</th>
                      <th className="text-left p-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3 font-mono whitespace-nowrap">
                          {item.startTime}
                          {item.endTime && ` - ${item.endTime}`}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-primary/10 rounded text-xs">
                              {activityTypeLabels[item.activityType] || item.activityType}
                            </span>
                            {item.title && <span className="ml-1">{item.title}</span>}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{item.location || '-'}</td>
                        <td className="p-3 text-muted-foreground">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividades</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBlock = (block: RoadmapBlock) => {
    const data = block.data as Record<string, unknown>;

    switch (block.block_type) {
      case 'header':
        return renderHeader(data as HeaderBlockData);
      case 'contacts':
        return renderContacts(data as { contacts?: Contact[] });
      case 'travel':
        return renderTravel(data as { trips?: TravelTrip[]; luggagePolicy?: string });
      case 'hospitality':
        return renderHospitality(data as { hotels?: HotelData[]; roomingList?: RoomAssignment[]; dietNotes?: string });
      case 'production':
        return renderProduction(data as { venues?: VenueBackline[] });
      case 'schedule':
        return renderSchedule(data as { days?: ScheduleDay[] });
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8 bg-background">
      {/* Document Header */}
      <div className="text-center space-y-2 border-b pb-6">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Hoja de Ruta</p>
        <h1 className="text-2xl font-bold font-playfair">{roadmapName}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {artistName && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {artistName}
            </span>
          )}
          {startDate && endDate && (
            <span>
              {formatDate(startDate)} - {formatDate(endDate)}
            </span>
          )}
          {promoter && <span>Promotor: {promoter}</span>}
        </div>
      </div>

      {/* Blocks */}
      {blocks.map((block, index) => (
        <div key={block.id}>
          {renderBlock(block)}
          {index < blocks.length - 1 && <Separator className="my-8" />}
        </div>
      ))}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-8 border-t">
        <p>Generado el {format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}</p>
      </div>
    </div>
  );
}
