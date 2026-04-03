import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CardContent } from '@/components/ui/card';
import { Calendar, Edit, Trash2, FolderPlus, FolderOpen, ExternalLink, Eye, ArrowRight, AlertCircle, Filter, Kanban } from 'lucide-react';
import { getStatusBadgeVariant, getPhaseLabel } from '@/lib/statusColors';
import { BookingTableColumns, useBookingColumns } from '@/components/BookingTableColumns';
import { BookingFiltersToolbar, BookingFiltersState } from '@/components/BookingFiltersToolbar';
import { EmptyState } from '@/components/ui/empty-state';

interface BookingOffer {
  id: string;
  fecha?: string;
  festival_ciclo?: string;
  ciudad?: string;
  pais?: string;
  lugar?: string;
  venue?: string;
  capacidad?: number;
  duracion?: string;
  estado?: string;
  phase?: string;
  promotor?: string;
  fee?: number;
  pvp?: number;
  hora?: string;
  formato?: string;
  contacto?: string;
  invitaciones?: number;
  inicio_venta?: string;
  link_venta?: string;
  publico?: string;
  logistica?: string;
  notas?: string;
  contratos?: string;
  folder_url?: string;
  artist_id?: string;
  created_at: string;
  availability_status?: 'all_available' | 'has_conflicts' | 'pending' | null;
}

interface BookingTableViewProps {
  offers: BookingOffer[];
  filteredOffers: BookingOffer[];
  filters: BookingFiltersState;
  onFiltersChange: (filters: Partial<BookingFiltersState>) => void;
  artists: { id: string; name: string; stage_name?: string }[];
  countries: string[];
  promoters: string[];
  onClearFilters: () => void;
  onExportCSV: () => void;
  onNewOffer: () => void;
  onDeleteOffer: (id: string) => void;
  onEditOffer: (offer: BookingOffer) => void;
  onOpenFolder: (offer: BookingOffer) => void;
  onCreateMissingFolder: (offer: BookingOffer) => void;
  foldersLoading: boolean;
  folderErrors: Record<string, string>;
  columns: ReturnType<typeof useBookingColumns>['columns'];
  setColumns: ReturnType<typeof useBookingColumns>['setColumns'];
  getColumnVisibility: ReturnType<typeof useBookingColumns>['getColumnVisibility'];
}

export function BookingTableView({
  offers,
  filteredOffers,
  filters,
  onFiltersChange,
  artists,
  countries,
  promoters,
  onClearFilters,
  onExportCSV,
  onNewOffer,
  onDeleteOffer,
  onEditOffer,
  onOpenFolder,
  onCreateMissingFolder,
  foldersLoading,
  folderErrors,
  columns,
  setColumns,
  getColumnVisibility,
}: BookingTableViewProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <BookingFiltersToolbar
        filters={filters}
        onFiltersChange={(newFilters) => onFiltersChange(newFilters)}
        artists={artists}
        phases={[
          { id: 'interes', label: 'Interés' },
          { id: 'oferta', label: 'Oferta' },
          { id: 'negociacion', label: 'Negociación' },
          { id: 'confirmado', label: 'Confirmado' },
          { id: 'realizado', label: 'Realizado' },
          { id: 'facturado', label: 'Facturado' },
          { id: 'cerrado', label: 'Cerrado' },
          { id: 'cancelado', label: 'Cancelado' },
        ]}
        countries={countries}
        promoters={promoters}
        totalCount={offers.length}
        filteredCount={filteredOffers.length}
        onClearFilters={onClearFilters}
        onExportCSV={onExportCSV}
        onNewOffer={onNewOffer}
      />

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {filteredOffers.length} de {offers.length} {offers.length === 1 ? 'booking' : 'bookings'}
        </div>
        <div className="flex gap-2">
          <BookingTableColumns columns={columns} onColumnsChange={setColumns} />
        </div>
      </div>

      <div className="card-moodita overflow-hidden">
        <CardContent className="p-0">
          {filteredOffers.length === 0 ? (
            offers.length === 0 ? (
              <EmptyState
                icon={<Kanban className="w-10 h-10 text-muted-foreground" />}
                title="No hay ofertas de booking"
                description="Crea tu primera oferta para comenzar a gestionar tus bookings y organizar conciertos de manera eficiente."
                action={{ label: "Crear Booking", onClick: onNewOffer }}
                secondaryAction={{ label: "Ver documentación", onClick: () => window.open('/docs/booking', '_blank'), variant: "outline" }}
              />
            ) : (
              <EmptyState
                icon={<Filter className="w-10 h-10 text-muted-foreground" />}
                title="Sin resultados"
                description="No hay bookings que coincidan con los filtros aplicados."
                action={{ label: "Limpiar filtros", onClick: onClearFilters }}
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-0">
                    {getColumnVisibility('fecha') && <TableHead className="font-semibold px-6">FECHA</TableHead>}
                    {getColumnVisibility('festival_ciclo') && <TableHead className="font-semibold">FESTIVAL</TableHead>}
                    {getColumnVisibility('ciudad') && <TableHead className="font-semibold">CIUDAD</TableHead>}
                    {getColumnVisibility('lugar') && <TableHead className="font-semibold">LUGAR</TableHead>}
                    {getColumnVisibility('estado') && <TableHead className="font-semibold">STATUS</TableHead>}
                    {getColumnVisibility('fee') && <TableHead className="font-semibold">OFERTA</TableHead>}
                    {getColumnVisibility('contratos') && <TableHead className="font-semibold">CONTRATO</TableHead>}
                    {getColumnVisibility('hora') && <TableHead className="font-semibold">HORA</TableHead>}
                    {getColumnVisibility('capacidad') && <TableHead className="font-semibold">CAPACIDAD</TableHead>}
                    {getColumnVisibility('duracion') && <TableHead className="font-semibold">DURACIÓN</TableHead>}
                    {getColumnVisibility('formato') && <TableHead className="font-semibold">FORMATO</TableHead>}
                    {getColumnVisibility('pvp') && <TableHead className="font-semibold">PVP</TableHead>}
                    {getColumnVisibility('contacto') && <TableHead className="font-semibold">CONTACTO</TableHead>}
                    {getColumnVisibility('invitaciones') && <TableHead className="font-semibold">INVITACIONES</TableHead>}
                    {getColumnVisibility('inicio_venta') && <TableHead className="font-semibold">INICIO VENTA</TableHead>}
                    {getColumnVisibility('link_venta') && <TableHead className="font-semibold">LINK VENTA</TableHead>}
                    {getColumnVisibility('publico') && <TableHead className="font-semibold">PÚBLICO</TableHead>}
                    {getColumnVisibility('logistica') && <TableHead className="font-semibold">LOGÍSTICA</TableHead>}
                    {getColumnVisibility('notas') && <TableHead className="font-semibold">COMENTARIOS</TableHead>}
                    <TableHead className="text-right font-semibold">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => (
                    <TableRow
                      key={offer.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors border-0 group"
                      onClick={() => navigate(`/booking/${offer.id}`)}
                    >
                      {getColumnVisibility('fecha') && (
                        <TableCell className="py-4 px-6">
                          {offer.fecha ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-accent" />
                              <span className="text-sm font-medium">{new Date(offer.fecha).toLocaleDateString('es-ES')}</span>
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      )}
                      {getColumnVisibility('festival_ciclo') && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {offer.folder_url ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); onOpenFolder(offer); }}
                                className="text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left font-medium"
                                title="Abrir carpeta del evento"
                              >
                                {offer.festival_ciclo || '-'}
                              </button>
                            ) : <span>{offer.festival_ciclo || '-'}</span>}
                          </div>
                        </TableCell>
                      )}
                      {getColumnVisibility('ciudad') && <TableCell className="py-4">{offer.ciudad || '-'}</TableCell>}
                      {getColumnVisibility('lugar') && <TableCell className="py-4">{offer.lugar || '-'}</TableCell>}
                      {getColumnVisibility('estado') && (
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getStatusBadgeVariant(offer.phase || offer.estado)}>
                              {getPhaseLabel(offer.phase || offer.estado)}
                            </Badge>
                            {offer.availability_status === 'has_conflicts' && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                <AlertCircle className="h-3 w-3 mr-0.5" />Conflicto
                              </Badge>
                            )}
                            {(offer.phase === 'interes' || offer.phase === 'oferta') && offer.availability_status === 'all_available' && (
                              <Badge className="bg-green-500 text-white text-xs px-1.5 py-0.5 animate-pulse">
                                <ArrowRight className="h-3 w-3 mr-0.5" />Listo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {getColumnVisibility('fee') && (
                        <TableCell className="py-4 font-medium">
                          {offer.fee ? `${offer.fee.toLocaleString('es-ES')} €` : '-'}
                        </TableCell>
                      )}
                      {getColumnVisibility('contratos') && (
                        <TableCell>
                          {offer.contratos ? (
                            <Badge variant={
                              offer.contratos === 'firmado' ? 'default' :
                              offer.contratos === 'enviado' ? 'secondary' : 'outline'
                            }>
                              {offer.contratos === 'ctto_por_hacer' ? 'Por Hacer' :
                               offer.contratos === 'enviado' ? 'Enviado' :
                               offer.contratos === 'firmado' ? 'Firmado' : offer.contratos}
                            </Badge>
                          ) : <Badge variant="outline">Por Hacer</Badge>}
                        </TableCell>
                      )}
                      {getColumnVisibility('hora') && <TableCell className="py-4">{offer.hora || '-'}</TableCell>}
                      {getColumnVisibility('capacidad') && <TableCell className="py-4">{offer.capacidad ? offer.capacidad.toLocaleString() : '-'}</TableCell>}
                      {getColumnVisibility('duracion') && <TableCell className="py-4">{offer.duracion || '-'}</TableCell>}
                      {getColumnVisibility('formato') && <TableCell className="py-4">{offer.formato || '-'}</TableCell>}
                      {getColumnVisibility('pvp') && <TableCell className="py-4">{offer.pvp ? `${offer.pvp} €` : '-'}</TableCell>}
                      {getColumnVisibility('contacto') && <TableCell className="py-4">{offer.contacto || '-'}</TableCell>}
                      {getColumnVisibility('invitaciones') && <TableCell className="py-4">{offer.invitaciones || '-'}</TableCell>}
                      {getColumnVisibility('inicio_venta') && (
                        <TableCell className="py-4">
                          {offer.inicio_venta ? new Date(offer.inicio_venta).toLocaleDateString('es-ES') : '-'}
                        </TableCell>
                      )}
                      {getColumnVisibility('link_venta') && (
                        <TableCell className="py-4">
                          {offer.link_venta ? (
                            <a href={offer.link_venta} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3" />Ver
                            </a>
                          ) : '-'}
                        </TableCell>
                      )}
                      {getColumnVisibility('publico') && <TableCell className="py-4">{offer.publico || '-'}</TableCell>}
                      {getColumnVisibility('logistica') && <TableCell className="py-4 max-w-40 truncate" title={offer.logistica || ''}>{offer.logistica || '-'}</TableCell>}
                      {getColumnVisibility('notas') && <TableCell className="py-4 max-w-40 truncate" title={offer.notas || ''}>{offer.notas || '-'}</TableCell>}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/booking/${offer.id}`)} title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border shadow-md">
                              <DropdownMenuItem onClick={() => navigate(`/booking/${offer.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEditOffer(offer)}>
                                <Edit className="h-4 w-4 mr-2" />Editar
                              </DropdownMenuItem>
                              {offer.folder_url && (
                                <DropdownMenuItem onClick={() => onOpenFolder(offer)}>
                                  <FolderOpen className="h-4 w-4 mr-2" />Abrir carpeta
                                </DropdownMenuItem>
                              )}
                              {!offer.folder_url && offer.fecha && offer.ciudad && offer.festival_ciclo && (
                                <DropdownMenuItem onClick={() => onCreateMissingFolder(offer)} disabled={foldersLoading}>
                                  <FolderPlus className="h-4 w-4 mr-2" />
                                  {folderErrors[offer.id] ? 'Reintentar carpeta' : 'Crear carpeta'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />Eliminar
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Seguro que quieres eliminarlo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Si quieres mantener la información, puedes marcar el evento como cancelado.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDeleteOffer(offer.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Eliminar definitivamente
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
