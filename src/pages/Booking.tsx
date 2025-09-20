import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BookingOffer } from '@/types/booking';
import { Plus, Settings, Edit, Trash2, Folder, FolderPlus, Calendar, Kanban, List, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreateBookingOfferDialog } from '@/components/CreateBookingOfferDialog';
import { EditBookingTemplateDialog } from '@/components/EditBookingTemplateDialog';
import { EditBookingOfferDialog } from '@/components/EditBookingOfferDialog';
import { AlertsBadge } from '@/components/AlertsBadge';
import { validateBookingOffer, ValidationResult } from '@/lib/bookingValidations';
import { useBookingReminders } from '@/hooks/useBookingReminders';
import { ReminderBadge } from '@/components/ReminderBadge';
import { getStatusBadgeColor, getStatusBadgeVariant } from '@/lib/statusColors';
import { useBookingFolders } from '@/hooks/useBookingFolders';
import { FolderOpen, AlertTriangle } from 'lucide-react';
import { EventFolderDialog } from '@/components/EventFolderDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingKanban } from '@/components/BookingKanban';
import { PermissionChip } from '@/components/PermissionChip';
import { PermissionWrapper } from '@/components/PermissionBoundary';
import { exportToCSV } from '@/utils/exportUtils';
import { EmptyState } from '@/components/ui/empty-state';

// Using centralized BookingOffer interface from types/booking.ts

interface TemplateField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_order: number;
  is_required: boolean;
  is_active: boolean;
}

export default function Booking() {
  const { profile } = useAuth();
  const [offers, setOffers] = useState<BookingOffer[]>([]);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<BookingOffer | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const { getRemindersForBooking } = useBookingReminders(offers);
  const { openFolder, checkFolderExists, checkContractExists, backfillEventFolders, createEventFolder, loading: foldersLoading } = useBookingFolders();
  const [folderExists, setFolderExists] = useState<Record<string, boolean>>({});
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolderOffer, setSelectedFolderOffer] = useState<BookingOffer | null>(null);
  const [contractStatus, setContractStatus] = useState<Record<string, boolean>>({});
  const [folderErrors, setFolderErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOffers();
    fetchTemplateFields();
  }, []);

  useEffect(() => {
    if (offers.length > 0) {
      validateAllOffers();
      checkAllFolders();
      checkAllContracts();
    }
  }, [offers]);

  const checkAllFolders = async () => {
    const folderStatuses: Record<string, boolean> = {};
    for (const offer of offers) {
      if (offer.id) {
        const exists = await checkFolderExists(offer);
        folderStatuses[offer.id] = exists;
      }
    }
    setFolderExists(folderStatuses);
  };

  const checkAllContracts = async () => {
    const contractStatuses: Record<string, boolean> = {};
    for (const offer of offers) {
      if (offer.id && offer.estado === 'confirmado') {
        const hasContract = await checkContractExists(offer);
        contractStatuses[offer.id] = hasContract;
      }
    }
    setContractStatus(contractStatuses);
  };

  const validateAllOffers = async () => {
    console.log('Validating all offers:', offers.length);
    const results: Record<string, ValidationResult> = {};
    try {
      for (const offer of offers) {
        if (offer.id) {
          console.log('Validating offer:', offer.id);
          results[offer.id] = await validateBookingOffer(offer);
        }
      }
      console.log('Validation results:', results);
      setValidationResults(results);
    } catch (error) {
      console.error('Error validating offers:', error);
    }
  };

  const fetchOffers = async () => {
    try {
      console.log('Fetching booking offers...');
      const { data, error } = await supabase
        .from('booking_offers')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Error fetching offers:', error);
        throw error;
      }
      
      console.log('Fetched offers:', data);
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ofertas.",
        variant: "destructive",
      });
    }
  };

  const fetchTemplateFields = async () => {
    try {
      console.log('Fetching template fields...');
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_template_config')
        .select('*')
        .eq('is_active', true)
        .order('field_order');

      if (error) {
        console.error('Error fetching template fields:', error);
        throw error;
      }
      
      console.log('Fetched template fields:', data);
      setTemplateFields(data || []);
    } catch (error) {
      console.error('Error fetching template fields:', error);
      toast({
        title: "Error", 
        description: "No se pudieron cargar los campos de la plantilla.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('booking_offers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Oferta eliminada",
        description: "La oferta se ha eliminado correctamente.",
      });

      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la oferta.",
        variant: "destructive",
      });
    }
  };

  const handleOpenFolder = (offer: BookingOffer) => {
    setSelectedFolderOffer(offer);
    setShowFolderDialog(true);
  };

  const handleBackfillFolders = async () => {
    try {
      const result = await backfillEventFolders();
      
      toast({
        title: "Backfill completado",
        description: `${result.created} carpetas creadas, ${result.updated} actualizadas.`,
      });

      // Refresh data
      fetchOffers();
      checkAllFolders();
    } catch (error) {
      console.error('Error in backfill:', error);
      toast({
        title: "Error",
        description: "Error durante el backfill de carpetas.",
        variant: "destructive",
      });
    }
  };

  const handleCreateMissingFolder = async (offer: BookingOffer) => {
    // Clear previous error for this offer
    setFolderErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[offer.id];
      return newErrors;
    });

    try {
      const result = await createEventFolder(offer);
      
      if (result.success && result.folderPath) {
        const publicUrl = `https://hptjzbaiclmgbvxlmllo.supabase.co/storage/v1/object/public/documents/${result.folderPath}`;
        await supabase
          .from('booking_offers')
          .update({ folder_url: publicUrl })
          .eq('id', offer.id);

        toast({
          title: "Carpeta creada",
          description: "La carpeta del evento se ha creado exitosamente.",
        });

        // Refresh data
        fetchOffers();
        checkAllFolders();
      } else {
        // Store error for this specific offer
        setFolderErrors(prev => ({
          ...prev,
          [offer.id]: result.error || "Error desconocido"
        }));

        // Show specific error message
        toast({
          title: "Error al crear carpeta",
          description: result.error || "No se pudo crear la carpeta del evento.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      
      // Store error for this specific offer
      setFolderErrors(prev => ({
        ...prev,
        [offer.id]: "Error inesperado al crear la carpeta"
      }));

      toast({
        title: "Error",
        description: "Error inesperado al crear la carpeta.",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const csvHeaders = {
        fecha: 'Fecha',
        festival_ciclo: 'Festival/Ciclo',
        ciudad: 'Ciudad',
        pais: 'País',
        lugar: 'Lugar',
        venue: 'Venue',
        capacidad: 'Capacidad',
        estado: 'Estado',
        phase: 'Fase',
        promotor: 'Promotor',
        fee: 'Fee (€)',
        gastos_estimados: 'Gastos Estimados (€)',
        comision_porcentaje: 'Comisión (%)',
        comision_euros: 'Comisión (€)',
        es_cityzen: 'CityZen',
        es_internacional: 'Internacional',
        estado_facturacion: 'Estado Facturación',
        oferta: 'Oferta',
        formato: 'Formato',
        contacto: 'Contacto',
        tour_manager: 'Tour Manager',
        created_at: 'Fecha Creación'
      };

      const exportData = offers.map(offer => ({
        fecha: offer.fecha ? new Date(offer.fecha).toLocaleDateString() : '',
        festival_ciclo: offer.festival_ciclo || '',
        ciudad: offer.ciudad || '',
        pais: offer.pais || '',
        lugar: offer.lugar || '',
        venue: offer.venue || '',
        capacidad: offer.capacidad || '',
        estado: offer.estado || '',
        phase: offer.phase || '',
        promotor: offer.promotor || '',
        fee: offer.fee || 0,
        gastos_estimados: offer.gastos_estimados || 0,
        comision_porcentaje: offer.comision_porcentaje || 0,
        comision_euros: offer.comision_euros || 0,
        es_cityzen: offer.es_cityzen ? 'Sí' : 'No',
        es_internacional: offer.es_internacional ? 'Sí' : 'No',
        estado_facturacion: offer.estado_facturacion || '',
        oferta: offer.oferta || '',
        formato: offer.formato || '',
        contacto: offer.contacto || '',
        tour_manager: offer.tour_manager || '',
        created_at: new Date(offer.created_at).toLocaleDateString()
      }));

      exportToCSV(exportData, 'ofertas_booking', csvHeaders);
      
      toast({
        title: "Exportación exitosa",
        description: "Las ofertas se han exportado correctamente",
      });
    } catch (error) {
      console.error('Error exporting offers:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudieron exportar las ofertas",
        variant: "destructive",
      });
    }
  };

  const formatValue = (value: any, fieldType: string) => {
    if (!value) return '-';
    
    switch (fieldType) {
      case 'date':
        return new Date(value).toLocaleDateString('es-ES');
      case 'number':
        return value.toLocaleString();
      case 'url':
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Ver enlace
          </a>
        );
      default:
        return value;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container-moodita section-spacing space-y-8">
      {/* Hero Header */}
      <div className="card-moodita p-8 bg-gradient-accent text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Kanban className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-playfair font-bold">Booking</h1>
              <p className="text-white/90 mt-1">
                Gestiona ofertas de conciertos por fases con reglas CityZen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PermissionChip className="bg-white/10 border-white/20 text-white" />
            <div className="flex gap-3">
              <Button
                onClick={() => handleExportCSV()}
                className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <PermissionWrapper requiredPermission="manage">
                <Button
                  onClick={handleBackfillFolders}
                  disabled={foldersLoading}
                  className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/20"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Backfill Carpetas
                </Button>
              </PermissionWrapper>
              <PermissionWrapper requiredPermission="edit">
                <Button
                  onClick={() => setShowTemplateDialog(true)}
                  className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/20"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Editar plantilla
                </Button>
              </PermissionWrapper>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Warning for Confirmed Events without Contracts */}
      {offers.some(offer => offer.estado === 'confirmado' && offer.id && !contractStatus[offer.id]) && (
        <Alert className="border-warning/20 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            <strong>Aviso:</strong> Hay eventos confirmados sin contrato subido. Revisa las ofertas marcadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="kanban" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Vista Kanban
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Vista Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          <BookingKanban templateFields={templateFields} />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <div className="card-moodita overflow-hidden">
            <CardContent className="p-0">
              {offers.length === 0 ? (
                <EmptyState
                  icon={<Kanban className="w-10 h-10 text-muted-foreground" />}
                  title="No hay ofertas de booking"
                  description="Crea tu primera oferta para comenzar a gestionar tus bookings y organizar conciertos de manera eficiente."
                  action={{
                    label: "Crear Oferta",
                    onClick: () => setShowCreateDialog(true)
                  }}
                  secondaryAction={{
                    label: "Ver documentación",
                    onClick: () => window.open('/docs/booking', '_blank'),
                    variant: "outline"
                  }}
                />
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-0">
                      <TableHead className="font-semibold px-6">Fecha</TableHead>
                      <TableHead className="font-semibold">Festival / Ciclo</TableHead>
                      <TableHead className="font-semibold">Ciudad</TableHead>
                      <TableHead className="font-semibold">Lugar</TableHead>
                      <TableHead className="font-semibold">Capacidad</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Oferta</TableHead>
                      <TableHead className="font-semibold">Formato</TableHead>
                      <TableHead className="font-semibold">Contacto</TableHead>
                      <TableHead className="font-semibold">Tour Manager</TableHead>
                      <TableHead className="font-semibold">Info / Comentarios</TableHead>
                      <TableHead className="font-semibold">Condiciones</TableHead>
                       <TableHead className="font-semibold">Link de venta</TableHead>
                       <TableHead className="font-semibold">Inicio venta</TableHead>
                       <TableHead className="font-semibold">Contratos</TableHead>
                       <TableHead className="font-semibold">Carpeta</TableHead>
                       <TableHead className="font-semibold">Recordatorios</TableHead>
                       <TableHead className="font-semibold">Alertas</TableHead>
                       <TableHead className="text-right font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => (
                      <TableRow key={offer.id} className="cursor-pointer hover:bg-muted/30 transition-colors border-0 group">
                          <TableCell className="py-4 px-6">
                            {offer.fecha ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent" />
                                <span className="text-sm font-medium">
                                  {new Date(offer.fecha).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-2">
                               {offer.folder_url ? (
                                 <>
                                   <button
                                     onClick={() => handleOpenFolder(offer)}
                                     className="text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left font-medium"
                                     title="Abrir carpeta del evento"
                                   >
                                     {offer.festival_ciclo || '-'}
                                   </button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleOpenFolder(offer)}
                                     className="h-6 w-6 p-0 hover:bg-muted"
                                     title="Abrir carpeta del evento"
                                   >
                                     <FolderOpen className="h-3 w-3" />
                                   </Button>
                                 </>
                               ) : (
                                 <div className="flex items-center gap-2">
                                   <FolderOpen className="h-3 w-3 text-muted-foreground/50" />
                                   <span>{offer.festival_ciclo || '-'}</span>
                                 </div>
                               )}
                               {offer.estado === 'confirmado' && offer.id && !contractStatus[offer.id] && (
                                 <div title="Sin contrato">
                               <AlertTriangle className="h-4 w-4 text-amber-500" />
                             </div>
                           )}
                         </div>
                        </TableCell>
                       <TableCell className="py-4">{offer.ciudad || '-'}</TableCell>
                       <TableCell className="py-4">{offer.lugar || '-'}</TableCell>
                       <TableCell className="py-4">{offer.capacidad ? offer.capacidad.toLocaleString() : '-'}</TableCell>
                         <TableCell className="py-4">
                           <Badge 
                             variant={getStatusBadgeVariant(offer.estado)}
                           >
                             {offer.estado || 'Pendiente'}
                           </Badge>
                         </TableCell>
                       <TableCell className="max-w-32 truncate py-4">{offer.oferta || '-'}</TableCell>
                       <TableCell className="py-4">{offer.formato || '-'}</TableCell>
                       <TableCell className="py-4">{offer.contacto || '-'}</TableCell>
                       <TableCell className="py-4">{offer.tour_manager || '-'}</TableCell>
                        <TableCell className="max-w-32 truncate py-4">{offer.info_comentarios || '-'}</TableCell>
                        <TableCell className="max-w-32 truncate py-4">{offer.condiciones || '-'}</TableCell>
                        <TableCell className="py-4">
                          {offer.link_venta ? (
                            <a 
                              href={offer.link_venta} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Ver enlace
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                         <TableCell className="py-4">
                          {offer.inicio_venta ? new Date(offer.inicio_venta).toLocaleDateString('es-ES') : '-'}
                        </TableCell>
                          <TableCell>
                            {offer.contratos ? (
                              <a 
                                href={offer.contratos} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm"
                              >
                                📄 Ver contrato
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {offer.folder_url ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700">
                                  OK
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {folderErrors[offer.id] ? (
                                    <>
                                      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700">
                                        Error
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCreateMissingFolder(offer)}
                                        disabled={foldersLoading}
                                        title={`Reintentar - ${folderErrors[offer.id]}`}
                                        className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700"
                                      >
                                        <FolderPlus className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700">
                                        Falta
                                      </Badge>
                                      {offer.fecha && offer.ciudad && offer.festival_ciclo && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleCreateMissingFolder(offer)}
                                          disabled={foldersLoading}
                                          title="Crear carpeta"
                                          className="h-6 w-6 p-0"
                                        >
                                          <FolderPlus className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                         <TableCell>
                           <ReminderBadge reminders={getRemindersForBooking(offer.id)} variant="compact" />
                         </TableCell>
                        <TableCell>
                          {offer.id && validationResults[offer.id] && (
                            <AlertsBadge 
                              errors={validationResults[offer.id].errors}
                              warnings={validationResults[offer.id].warnings}
                            />
                          )}
                        </TableCell>
                       <TableCell className="text-right">
                         <div className="flex gap-2 justify-end">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="sm">
                                 <Edit className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="bg-background border shadow-md">
                               <DropdownMenuItem 
                                 onClick={() => {
                                   setSelectedOffer(offer);
                                   setShowEditDialog(true);
                                 }}
                               >
                                   <Edit className="h-4 w-4 mr-2" />
                                   Editar
                                 </DropdownMenuItem>
                                  {!offer.folder_url && offer.fecha && offer.ciudad && offer.festival_ciclo && (
                                    <DropdownMenuItem 
                                      onClick={() => handleCreateMissingFolder(offer)}
                                      disabled={foldersLoading}
                                    >
                                      <FolderPlus className="h-4 w-4 mr-2" />
                                      {folderErrors[offer.id] ? 'Reintentar carpeta' : 'Crear carpeta'}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
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
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteOffer(offer.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
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
                  ))
                }
              </TableBody>
            </Table>
            </div>
          )}
         </CardContent>
      </div>
        </TabsContent>
      </Tabs>

      <CreateBookingOfferDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOfferCreated={() => {
          fetchOffers();
          checkAllFolders();
          checkAllContracts();
        }}
        templateFields={templateFields}
      />

      <EditBookingTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onTemplateUpdated={() => {
          fetchTemplateFields();
          checkAllFolders();
          checkAllContracts();
        }}
      />

      {selectedOffer && (
        <EditBookingOfferDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          offer={selectedOffer}
          onOfferUpdated={() => {
            fetchOffers();
            checkAllFolders();
            checkAllContracts();
          }}
          templateFields={templateFields}
        />
      )}

      <EventFolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        offer={selectedFolderOffer}
      />
    </div>
  );
}