import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Map, Calendar, User, MoreVertical, Trash2, Filter, X, Link2, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRoadmaps, TourRoadmap } from '@/hooks/useRoadmaps';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { BookingSelectorDialog, BookingForSelector } from '@/components/BookingSelectorDialog';
import { HubGate } from '@/components/permissions/HubGate';

const statusConfig: Record<TourRoadmap['status'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  completed: { label: 'En Revisión', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

function RoadmapsInner() {
  const navigate = useNavigate();
  const { roadmaps, isLoading, createRoadmap, deleteRoadmap } = useRoadmaps();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBookingSelector, setShowBookingSelector] = useState(false);
  const [newName, setNewName] = useState('');
  const [newArtistId, setNewArtistId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingForSelector | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('roadmaps_view_mode') as 'grid' | 'list') || 'grid';
  });

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('roadmaps_view_mode', mode);
  };

  // Filters
  const [filterArtist, setFilterArtist] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const hasActiveFilters = filterArtist || filterStatus || filterDateFrom || filterDateTo;

  const filteredRoadmaps = useMemo(() => {
    if (!roadmaps) return [];
    
    return roadmaps.filter((roadmap) => {
      // Filter by artist
      if (filterArtist && roadmap.artist_id !== filterArtist) {
        return false;
      }
      
      // Filter by status
      if (filterStatus && roadmap.status !== filterStatus) {
        return false;
      }
      
      // Filter by date range
      if (filterDateFrom && roadmap.start_date) {
        if (new Date(roadmap.start_date) < new Date(filterDateFrom)) {
          return false;
        }
      }
      
      if (filterDateTo && roadmap.end_date) {
        if (new Date(roadmap.end_date) > new Date(filterDateTo)) {
          return false;
        }
      }
      
      return true;
    });
  }, [roadmaps, filterArtist, filterStatus, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterArtist(null);
    setFilterStatus(null);
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createRoadmap.mutateAsync({
      name: newName,
      artist_id: newArtistId || undefined,
      booking_id: selectedBooking?.id,
      promoter: selectedBooking?.promotor || undefined,
      start_date: selectedBooking?.fecha || undefined,
      end_date: selectedBooking?.fecha || undefined,
    });
    setShowCreateDialog(false);
    setNewName('');
    setNewArtistId(null);
    setSelectedBooking(null);
    navigate(`/roadmaps/${result.id}`);
  };

  const handleBookingSelect = (booking: BookingForSelector) => {
    setSelectedBooking(booking);
    // Auto-fill fields from booking
    setNewName(booking.festival_ciclo || booking.lugar || '');
    if (booking.artist_id) {
      setNewArtistId(booking.artist_id);
    }
  };

  const clearSelectedBooking = () => {
    setSelectedBooking(null);
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return 'Sin fechas';
    const startStr = start ? format(new Date(start), 'd MMM', { locale: es }) : '';
    const endStr = end ? format(new Date(end), 'd MMM yyyy', { locale: es }) : '';
    if (start && end) return `${startStr} - ${endStr}`;
    return startStr || endStr;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-playfair">Hojas de Ruta</h1>
          <p className="text-muted-foreground mt-1">Gestiona las hojas de ruta de tus giras</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => toggleViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => toggleViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Hoja de Ruta
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filtros
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Artista</Label>
            <SingleArtistSelector
              value={filterArtist}
              onValueChange={setFilterArtist}
              placeholder="Todos"
              className="w-48"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? null : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">En Revisión</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-36"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-36"
            />
          </div>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="w-3 h-3" />
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRoadmaps && filteredRoadmaps.length > 0 ? (
        viewMode === 'list' ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoadmaps.map((roadmap) => (
                  <TableRow
                    key={roadmap.id}
                    className="cursor-pointer group"
                    onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
                  >
                    <TableCell className="font-medium">{roadmap.name}</TableCell>
                    <TableCell>
                      {roadmap.artist ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={roadmap.artist.avatar_url || undefined} />
                            <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{roadmap.artist.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[roadmap.status].variant}>
                        {statusConfig[roadmap.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateRange(roadmap.start_date, roadmap.end_date)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRoadmap.mutate(roadmap.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoadmaps.map((roadmap) => (
            <Card
              key={roadmap.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{roadmap.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRoadmap.mutate(roadmap.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Badge variant={statusConfig[roadmap.status].variant}>
                  {statusConfig[roadmap.status].label}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {roadmap.artist && (
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={roadmap.artist.avatar_url || undefined} />
                      <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{roadmap.artist.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateRange(roadmap.start_date, roadmap.end_date)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )
      ) : (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Map className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {hasActiveFilters ? 'No hay resultados' : 'No hay hojas de ruta'}
              </h3>
              <p className="text-muted-foreground mt-1">
                {hasActiveFilters 
                  ? 'Intenta ajustar los filtros de búsqueda' 
                  : 'Crea tu primera hoja de ruta para organizar una gira'}
              </p>
            </div>
            {!hasActiveFilters && (
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Hoja de Ruta
              </Button>
            )}
          </div>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setNewName('');
          setNewArtistId(null);
          setSelectedBooking(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Hoja de Ruta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Booking Link Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Vincular a Evento (opcional)
              </Label>
              {selectedBooking ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {selectedBooking.festival_ciclo || selectedBooking.lugar || 'Evento'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedBooking.fecha && format(new Date(selectedBooking.fecha), 'd MMM yyyy', { locale: es })}
                      {selectedBooking.ciudad && ` · ${selectedBooking.ciudad}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearSelectedBooking}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowBookingSelector(true)}>
                    Cambiar
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={() => setShowBookingSelector(true)}
                >
                  <Link2 className="w-4 h-4" />
                  Seleccionar evento de booking...
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Tour</Label>
              <Input
                id="name"
                placeholder="Ej: Tour Europa 2026"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Artista</Label>
              <SingleArtistSelector
                value={newArtistId}
                onValueChange={setNewArtistId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createRoadmap.isPending}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingSelectorDialog
        open={showBookingSelector}
        onOpenChange={setShowBookingSelector}
        artistId={newArtistId}
        onSelect={handleBookingSelect}
      />
    </div>
  );
}

export default function Roadmaps() {
  return (
    <HubGate module="roadmaps" required="view">
      <RoadmapsInner />
    </HubGate>
  );
}
