import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Settings, Edit, Trash2, Folder, FolderPlus } from 'lucide-react';
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

interface BookingOffer {
  id: string;
  fecha?: string;
  festival_ciclo?: string;
  ciudad?: string;
  lugar?: string;
  capacidad?: number;
  estado?: string;
  oferta?: string;
  formato?: string;
  contacto?: string;
  tour_manager?: string;
  info_comentarios?: string;
  condiciones?: string;
  link_venta?: string;
  inicio_venta?: string;
  contratos?: string;
  artist_id?: string;
  project_id?: string;
  event_id?: string;
  hora?: string;
  folder_url?: string;
  created_at: string;
}

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ofertas de Booking</h1>
          <p className="text-muted-foreground">
            Lista de ofertas de conciertos con información detallada
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleBackfillFolders}
            variant="outline"
            disabled={foldersLoading}
            className="flex items-center gap-2"
          >
            <Folder className="h-4 w-4" />
            Backfill Carpetas
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTemplateDialog(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Editar plantilla
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Añadir nueva oferta
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ofertas de Booking</CardTitle>
          <CardDescription>
            Lista de ofertas de conciertos con información detallada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Contract Warning for Confirmed Events without Contracts */}
          {offers.some(offer => offer.estado === 'confirmado' && offer.id && !contractStatus[offer.id]) && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Aviso:</strong> Hay eventos confirmados sin contrato subido. Revisa las ofertas marcadas.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Festival / Ciclo</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Oferta</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Tour Manager</TableHead>
                  <TableHead>Info / Comentarios</TableHead>
                  <TableHead>Condiciones</TableHead>
                   <TableHead>Link de venta</TableHead>
                   <TableHead>Inicio venta</TableHead>
                   <TableHead>Contratos</TableHead>
                   <TableHead>Carpeta</TableHead>
                   <TableHead>Recordatorios</TableHead>
                   <TableHead>Alertas</TableHead>
                   <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.length === 0 ? (
                  <TableRow>
                     <TableCell 
                       colSpan={19} 
                       className="text-center py-8 text-muted-foreground"
                     >
                      No hay ofertas registradas. Crea la primera oferta.
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer) => (
                    <TableRow key={offer.id} className="hover:bg-muted/50">
                      <TableCell>
                        {offer.fecha ? new Date(offer.fecha).toLocaleDateString('es-ES') : '-'}
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
                      <TableCell>{offer.ciudad || '-'}</TableCell>
                      <TableCell>{offer.lugar || '-'}</TableCell>
                      <TableCell>{offer.capacidad ? offer.capacidad.toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusBadgeVariant(offer.estado)}
                          >
                            {offer.estado || 'Pendiente'}
                          </Badge>
                        </TableCell>
                      <TableCell className="max-w-32 truncate">{offer.oferta || '-'}</TableCell>
                      <TableCell>{offer.formato || '-'}</TableCell>
                      <TableCell>{offer.contacto || '-'}</TableCell>
                      <TableCell>{offer.tour_manager || '-'}</TableCell>
                       <TableCell className="max-w-32 truncate">{offer.info_comentarios || '-'}</TableCell>
                       <TableCell className="max-w-32 truncate">{offer.condiciones || '-'}</TableCell>
                       <TableCell>
                         {offer.link_venta ? (
                           <a 
                             href={offer.link_venta} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-primary hover:underline"
                           >
                             Ver enlace
                           </a>
                         ) : '-'}
                       </TableCell>
                        <TableCell>
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
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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