import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Save, Plus, X, CalendarIcon, Clock, Ticket, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBookingFolderAutomation } from '@/hooks/useBookingFolderAutomation';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { ContactSelector } from '@/components/ContactSelector';

interface BookingOffer {
  id: string;
  fecha?: string | null;
  hora?: string | null;
  festival_ciclo?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  lugar?: string | null;
  venue?: string | null;
  capacidad?: number | null;
  duracion?: string | null;
  estado?: string | null;
  phase?: string | null;
  promotor?: string | null;
  fee?: number | null;
  pvp?: number | null;
  gastos_estimados?: number | null;
  comision_porcentaje?: number | null;
  comision_euros?: number | null;
  es_cityzen?: boolean | null;
  es_internacional?: boolean | null;
  estado_facturacion?: string | null;
  oferta?: string | null;
  formato?: string | null;
  contacto?: string | null;
  tour_manager?: string | null;
  info_comentarios?: string | null;
  condiciones?: string | null;
  link_venta?: string | null;
  inicio_venta?: string | null;
  folder_url?: string | null;
  notas?: string | null;
  logistica?: string | null;
  contratos?: string | null;
  publico?: string | null;
  invitaciones?: number | null;
  anunciado?: boolean | null;
  es_privado?: boolean | null;
  artist_id?: string | null;
  adjuntos?: any;
  is_sold_out?: boolean | null;
  tickets_sold?: number | null;
}

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingOffer;
  onSuccess: () => void;
}

// Phases matching the Kanban view
const PHASE_OPTIONS = [
  { id: 'interes', label: 'Interés' },
  { id: 'oferta', label: 'Oferta' },
  { id: 'negociacion', label: 'Negociación' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'facturado', label: 'Facturado' },
  { id: 'cerrado', label: 'Cerrado' },
  { id: 'cancelado', label: 'Cancelado' },
];

const BILLING_STATUS_OPTIONS = [
  'pendiente',
  'facturado',
  'cobrado',
  'pagado',
];

const FORMAT_OPTIONS = [
  'Solista',
  'Dúo',
  'Trío',
  'Cuarteto',
  'Quinteto',
  'Banda Completa',
  'Acústico',
  'Eléctrico',
  'DJ Set',
  'Live Set',
];

const CONTRACT_STATUS_OPTIONS = [
  'por_hacer',
  'enviado',
  'firmado',
];

const AUDIENCE_OPTIONS = [
  'sentado',
  'de_pie',
  'mix',
];

export function EditBookingDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: EditBookingDialogProps) {
  const [formData, setFormData] = useState<Partial<BookingOffer>>({});
  const [fechasOpcionales, setFechasOpcionales] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [artistFormats, setArtistFormats] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const { syncBookingFolder } = useBookingFolderAutomation();

  useEffect(() => {
    if (open) {
      setFormData({ ...booking });
      // Load fechas opcionales from adjuntos
      const adjuntos = booking.adjuntos as { fechas_opcionales?: string[] } | null;
      setFechasOpcionales(adjuntos?.fechas_opcionales || []);
    }
  }, [open, booking]);

  // Fetch artist booking products when artist_id changes
  useEffect(() => {
    const fetchArtistFormats = async () => {
      if (!formData.artist_id) {
        setArtistFormats([]);
        return;
      }
      const { data } = await supabase
        .from('booking_products')
        .select('name')
        .eq('artist_id', formData.artist_id)
        .eq('is_active', true)
        .order('sort_order');
      setArtistFormats(data?.map(p => p.name) || []);
    };
    fetchArtistFormats();
  }, [formData.artist_id]);

  const updateField = (field: keyof BookingOffer, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Check if date changed to a past date
    const isPastDate = formData.fecha && new Date(formData.fecha + 'T00:00:00') < new Date(new Date().toDateString());
    const dateChanged = formData.fecha !== booking.fecha;
    if (isPastDate && dateChanged) {
      setShowPastDateWarning(true);
      return;
    }

    // If phase changed to confirmado and it wasn't already confirmado, show confirmation dialog
    const phaseChangedToConfirmado = formData.phase === 'confirmado' && booking.phase !== 'confirmado';
    if (phaseChangedToConfirmado) {
      setShowConfirmDialog(true);
      return;
    }
    await saveBooking(formData.phase);
  };

  const proceedAfterPastDateWarning = async () => {
    setShowPastDateWarning(false);
    const phaseChangedToConfirmado = formData.phase === 'confirmado' && booking.phase !== 'confirmado';
    if (phaseChangedToConfirmado) {
      setShowConfirmDialog(true);
      return;
    }
    await saveBooking(formData.phase);
  };

  const saveBooking = async (overridePhase?: string | null) => {
    setLoading(true);
    try {
      // Build adjuntos with fechas opcionales
      const filteredFechas = fechasOpcionales.filter(f => f);
      const adjuntos = filteredFechas.length > 0 
        ? { fechas_opcionales: filteredFechas }
        : null;

      const updateData = {
        fecha: formData.fecha,
        hora: formData.hora,
        duracion: formData.duracion,
        festival_ciclo: formData.festival_ciclo,
        ciudad: formData.ciudad,
        pais: formData.pais,
        lugar: formData.lugar,
        venue: formData.venue,
        capacidad: formData.capacidad,
        estado: formData.estado,
        phase: overridePhase ?? formData.phase,
        promotor: formData.promotor,
        fee: formData.fee,
        pvp: formData.pvp,
        gastos_estimados: formData.gastos_estimados,
        comision_porcentaje: formData.comision_porcentaje,
        comision_euros: formData.comision_euros,
        es_cityzen: formData.es_cityzen,
        es_internacional: formData.es_internacional,
        estado_facturacion: formData.estado_facturacion,
        oferta: formData.oferta,
        formato: formData.formato,
        contacto: formData.contacto,
        tour_manager: formData.tour_manager,
        info_comentarios: formData.info_comentarios,
        condiciones: formData.condiciones,
        link_venta: formData.link_venta,
        inicio_venta: formData.inicio_venta,
        folder_url: formData.folder_url,
        notas: formData.notas,
        logistica: formData.logistica,
        contratos: formData.contratos,
        publico: formData.publico,
        invitaciones: formData.invitaciones,
        anunciado: formData.anunciado,
        es_privado: formData.es_privado,
        artist_id: formData.artist_id,
        adjuntos: adjuntos,
        is_sold_out: formData.is_sold_out,
        tickets_sold: formData.tickets_sold,
      };

      const { data, error } = await supabase
        .from('booking_offers')
        .update(updateData)
        .eq('id', booking.id)
        .select()
        .single();

      if (error) throw error;

      // Trigger folder automation if status changed to confirmado
      if (data) {
        await syncBookingFolder(booking as any, data);
      }

      toast.success('Booking actualizado');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Error al actualizar el booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Booking</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="location">Ubicación</TabsTrigger>
            <TabsTrigger value="financial">Financiero</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 pt-4">
            {/* Artist Selector */}
            <div className="space-y-2">
              <Label>Artista</Label>
              <SingleArtistSelector
                value={formData.artist_id || null}
                onValueChange={(value) => updateField('artist_id', value)}
                placeholder="Seleccionar artista..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Festival / Ciclo</Label>
                <Input
                  value={formData.festival_ciclo || ''}
                  onChange={(e) => updateField('festival_ciclo', e.target.value)}
                  placeholder="Nombre del festival o ciclo"
                />
              </div>
              <div className="space-y-2">
                <Label>Venue</Label>
                <Input
                  value={formData.venue || ''}
                  onChange={(e) => updateField('venue', e.target.value)}
                  placeholder="Sala / Recinto"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.fecha && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fecha 
                        ? format(new Date(formData.fecha), "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fecha ? new Date(formData.fecha) : undefined}
                      onSelect={(date) => updateField('fecha', date ? format(date, 'yyyy-MM-dd') : null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={formData.hora || ''}
                    onChange={(e) => updateField('hora', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duración</Label>
                <Input
                  value={formData.duracion || ''}
                  onChange={(e) => updateField('duracion', e.target.value)}
                  placeholder="ej: 1h 30min"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input
                  type="number"
                  value={formData.capacidad || ''}
                  onChange={(e) => updateField('capacidad', parseInt(e.target.value) || null)}
                />
              </div>
            </div>

            {/* Fechas opcionales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  Fechas opcionales
                  <span className="ml-2 text-xs">(si el festival/sala tiene varios días disponibles)</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFechasOpcionales([...fechasOpcionales, ''])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir fecha
                </Button>
              </div>
              
              {fechasOpcionales.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {fechasOpcionales.map((fecha, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={fecha}
                        onChange={(e) => {
                          const newFechas = [...fechasOpcionales];
                          newFechas[index] = e.target.value;
                          setFechasOpcionales(newFechas);
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const newFechas = fechasOpcionales.filter((_, i) => i !== index);
                          setFechasOpcionales(newFechas);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Público</Label>
                <Select
                  value={formData.publico || ''}
                  onValueChange={(v) => updateField('publico', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt === 'sentado' ? 'Sentado' : opt === 'de_pie' ? 'De pie' : 'Mix'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contrato</Label>
                <Select
                  value={formData.contratos || ''}
                  onValueChange={(v) => updateField('contratos', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt === 'por_hacer' ? 'Por Hacer' : opt === 'enviado' ? 'Enviado' : 'Firmado'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fase</Label>
                <Select
                  value={formData.phase || ''}
                  onValueChange={(v) => updateField('phase', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHASE_OPTIONS.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={formData.formato || ''}
                  onValueChange={(v) => updateField('formato', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    {artistFormats.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Formatos del artista</SelectLabel>
                        {artistFormats.map((fmt) => (
                          <SelectItem key={`artist-${fmt}`} value={fmt}>
                            {fmt}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    <SelectGroup>
                      <SelectLabel>Formatos generales</SelectLabel>
                      {FORMAT_OPTIONS.map((fmt) => (
                        <SelectItem key={fmt} value={fmt}>
                          {fmt}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Tipo de tarifa</Label>
              <RadioGroup
                value={formData.es_internacional ? 'internacional' : 'nacional'}
                onValueChange={(value) => updateField('es_internacional', value === 'internacional')}
                className="flex items-center gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nacional" id="tarifa_nacional" />
                  <Label htmlFor="tarifa_nacional" className="font-normal cursor-pointer">Nacional</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="internacional" id="tarifa_internacional" />
                  <Label htmlFor="tarifa_internacional" className="font-normal cursor-pointer">Internacional</Label>
                </div>
              </RadioGroup>
            </div>

            {/* EPK Visibility Options */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Visibilidad en EPK</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="anunciado"
                    checked={formData.anunciado || false}
                    onCheckedChange={(c) => updateField('anunciado', !!c)}
                  />
                  <Label htmlFor="anunciado" className="text-sm">
                    Anunciado (mostrar en EPK público)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="es_privado"
                    checked={formData.es_privado || false}
                    onCheckedChange={(c) => updateField('es_privado', !!c)}
                  />
                  <Label htmlFor="es_privado" className="text-sm">
                    Privado (ocultar de vistas públicas)
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={formData.ciudad || ''}
                  onChange={(e) => updateField('ciudad', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>País</Label>
                <Input
                  value={formData.pais || ''}
                  onChange={(e) => updateField('pais', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lugar / Dirección</Label>
              <Input
                value={formData.lugar || ''}
                onChange={(e) => updateField('lugar', e.target.value)}
                placeholder="Dirección o ubicación específica"
              />
            </div>

            <div className="space-y-2">
              <Label>URL Carpeta (Drive)</Label>
              <Input
                value={formData.folder_url || ''}
                onChange={(e) => updateField('folder_url', e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Oferta / Fee (€)</Label>
                <Input
                  type="number"
                  value={formData.fee || ''}
                  onChange={(e) => updateField('fee', parseFloat(e.target.value) || null)}
                />
              </div>
              <div className="space-y-2">
                <Label>PVP Entradas (€)</Label>
                <Input
                  type="number"
                  value={formData.pvp || ''}
                  onChange={(e) => updateField('pvp', parseFloat(e.target.value) || null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gastos Estimados (€)</Label>
                <Input
                  type="number"
                  value={formData.gastos_estimados || ''}
                  onChange={(e) => updateField('gastos_estimados', parseFloat(e.target.value) || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Comisión (%)</Label>
                <Input
                  type="number"
                  value={formData.comision_porcentaje || ''}
                  onChange={(e) => updateField('comision_porcentaje', parseFloat(e.target.value) || null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Comisión (€)</Label>
                <Input
                  type="number"
                  value={formData.comision_euros || ''}
                  onChange={(e) => updateField('comision_euros', parseFloat(e.target.value) || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Oferta</Label>
                <Input
                  value={formData.oferta || ''}
                  onChange={(e) => updateField('oferta', e.target.value)}
                  placeholder="Flat Fee, Door Deal, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Estado Facturación</Label>
                <Select
                  value={formData.estado_facturacion || ''}
                  onValueChange={(v) => updateField('estado_facturacion', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condiciones</Label>
              <Textarea
                value={formData.condiciones || ''}
                onChange={(e) => updateField('condiciones', e.target.value)}
                placeholder="Condiciones especiales del contrato..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Promotor</Label>
                <ContactSelector
                  value={formData.promotor || null}
                  onValueChange={(contactId) => updateField('promotor', contactId)}
                  compact
                />
              </div>
              <div className="space-y-2">
                <Label>Contacto</Label>
                <ContactSelector
                  value={formData.contacto || null}
                  onValueChange={(contactId) => updateField('contacto', contactId)}
                  compact
                />
              </div>
              <div className="space-y-2">
                <Label>Tour Manager</Label>
                <Input
                  value={formData.tour_manager || ''}
                  onChange={(e) => updateField('tour_manager', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invitaciones</Label>
                <Input
                  type="number"
                  value={formData.invitaciones || ''}
                  onChange={(e) => updateField('invitaciones', parseInt(e.target.value) || null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Entradas vendidas</Label>
                <Input
                  type="number"
                  value={formData.tickets_sold ?? ''}
                  onChange={(e) => updateField('tickets_sold', parseInt(e.target.value) || null)}
                  placeholder="ej: 120"
                />
                {formData.tickets_sold != null && formData.capacidad != null && formData.capacidad > 0 && (
                  <div className="space-y-1">
                    <Progress value={(formData.tickets_sold / formData.capacidad) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {formData.tickets_sold} / {formData.capacidad} ({Math.round((formData.tickets_sold / formData.capacidad) * 100)}%)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_sold_out"
                  checked={formData.is_sold_out || false}
                  onCheckedChange={(c) => {
                    updateField('is_sold_out', !!c);
                    if (c && formData.capacidad && !formData.tickets_sold) {
                      updateField('tickets_sold', formData.capacidad);
                    }
                  }}
                />
                <Label htmlFor="is_sold_out" className="text-sm cursor-pointer">Sold Out</Label>
              </div>
              {formData.is_sold_out && (
                <Badge variant="success">
                  <Ticket className="h-3 w-3 mr-1" />
                  SOLD OUT
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link de Venta</Label>
                <Input
                  value={formData.link_venta || ''}
                  onChange={(e) => updateField('link_venta', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Inicio de Venta</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !formData.inicio_venta && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.inicio_venta 
                          ? format(new Date(formData.inicio_venta), "dd/MM/yyyy", { locale: es })
                          : "Fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.inicio_venta ? new Date(formData.inicio_venta) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            // Preserve time if exists, otherwise set to midnight
                            const existingDate = formData.inicio_venta ? new Date(formData.inicio_venta) : new Date();
                            date.setHours(existingDate.getHours(), existingDate.getMinutes());
                            updateField('inicio_venta', date.toISOString());
                          } else {
                            updateField('inicio_venta', null);
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative w-28">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={formData.inicio_venta 
                        ? format(new Date(formData.inicio_venta), "HH:mm") 
                        : ''}
                      onChange={(e) => {
                        const time = e.target.value;
                        if (time) {
                          const [hours, minutes] = time.split(':').map(Number);
                          const date = formData.inicio_venta 
                            ? new Date(formData.inicio_venta) 
                            : new Date();
                          date.setHours(hours, minutes);
                          updateField('inicio_venta', date.toISOString());
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas del Artista</Label>
              <Textarea
                value={formData.info_comentarios || ''}
                onChange={(e) => updateField('info_comentarios', e.target.value)}
                placeholder="Información visible para el artista..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Logística</Label>
              <Textarea
                value={formData.logistica || ''}
                onChange={(e) => updateField('logistica', e.target.value)}
                placeholder="Detalles de logística, transporte, hospedaje..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Comentarios / Notas Internas</Label>
              <Textarea
                value={formData.notas || ''}
                onChange={(e) => updateField('notas', e.target.value)}
                placeholder="Notas internas del equipo..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showPastDateWarning} onOpenChange={setShowPastDateWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fecha anterior a hoy
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            La fecha seleccionada ({formData.fecha}) es anterior a la fecha actual. El booking se guardará como evento pasado. ¿Deseas continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowPastDateWarning(false)}>
            Cancelar
          </Button>
          <Button onClick={proceedAfterPastDateWarning} disabled={loading}>
            Aceptar y guardar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            ¿Confirmar directamente?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <p>
              Recomendamos consultar la disponibilidad de todas las partes y verificar la viabilidad antes de confirmar un evento.
            </p>
            <p className="text-muted-foreground text-xs">
              Esto guarda el booking sin cambiar a confirmado, para que puedas gestionar la disponibilidad y los checks de viabilidad desde el detalle.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowConfirmDialog(false);
              saveBooking('confirmado');
            }}
            disabled={loading}
          >
            Confirmar directamente
          </Button>
          <Button
            onClick={() => {
              setShowConfirmDialog(false);
              saveBooking(booking.phase);
            }}
            disabled={loading}
          >
            Consultar disponibilidad y viabilidad
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
