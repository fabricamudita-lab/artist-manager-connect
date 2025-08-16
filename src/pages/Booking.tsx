import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreateBookingOfferDialog } from '@/components/CreateBookingOfferDialog';
import { EditBookingTemplateDialog } from '@/components/EditBookingTemplateDialog';
import { EditBookingOfferDialog } from '@/components/EditBookingOfferDialog';
import { AlertsBadge } from '@/components/AlertsBadge';
import { validateBookingOffer, ValidationResult } from '@/lib/bookingValidations';

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

  useEffect(() => {
    fetchOffers();
    fetchTemplateFields();
  }, []);

  useEffect(() => {
    if (offers.length > 0) {
      validateAllOffers();
    }
  }, [offers]);

  const validateAllOffers = async () => {
    const results: Record<string, ValidationResult> = {};
    for (const offer of offers) {
      if (offer.id) {
        results[offer.id] = await validateBookingOffer(offer);
      }
    }
    setValidationResults(results);
  };

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_offers')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
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
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_template_config')
        .select('*')
        .eq('is_active', true)
        .order('field_order');

      if (error) throw error;
      setTemplateFields(data || []);
    } catch (error) {
      console.error('Error fetching template fields:', error);
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

  const getStatusBadgeColor = (estado?: string) => {
    switch (estado?.toLowerCase()) {
      case 'confirmado': return 'bg-green-50 text-green-700 border-green-200';
      case 'interest': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelado': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
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
                   <TableHead>Alertas</TableHead>
                   <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.length === 0 ? (
                  <TableRow>
                     <TableCell 
                       colSpan={17} 
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
                      <TableCell>{offer.festival_ciclo || '-'}</TableCell>
                      <TableCell>{offer.ciudad || '-'}</TableCell>
                      <TableCell>{offer.lugar || '-'}</TableCell>
                      <TableCell>{offer.capacidad ? offer.capacidad.toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getStatusBadgeColor(offer.estado)}
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
                       <TableCell>{offer.contratos || '-'}</TableCell>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOffer(offer);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOffer(offer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        onOfferCreated={fetchOffers}
        templateFields={templateFields}
      />

      <EditBookingTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onTemplateUpdated={fetchTemplateFields}
      />

      {selectedOffer && (
        <EditBookingOfferDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          offer={selectedOffer}
          onOfferUpdated={fetchOffers}
          templateFields={templateFields}
        />
      )}
    </div>
  );
}