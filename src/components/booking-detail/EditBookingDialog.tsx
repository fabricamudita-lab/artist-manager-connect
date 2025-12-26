import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBookingFolderAutomation } from '@/hooks/useBookingFolderAutomation';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';

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
  const [loading, setLoading] = useState(false);
  const { syncBookingFolder } = useBookingFolderAutomation();

  useEffect(() => {
    if (open) {
      setFormData({ ...booking });
    }
  }, [open, booking]);

  const updateField = (field: keyof BookingOffer, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
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
        phase: formData.phase,
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
                <Input
                  type="date"
                  value={formData.fecha || ''}
                  onChange={(e) => updateField('fecha', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.hora || ''}
                  onChange={(e) => updateField('hora', e.target.value)}
                />
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
                    {FORMAT_OPTIONS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="es_internacional"
                  checked={formData.es_internacional || false}
                  onCheckedChange={(c) => updateField('es_internacional', !!c)}
                />
                <Label htmlFor="es_internacional">Internacional</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="es_cityzen"
                  checked={formData.es_cityzen || false}
                  onCheckedChange={(c) => updateField('es_cityzen', !!c)}
                />
                <Label htmlFor="es_cityzen">CityZen</Label>
              </div>
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

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Promotor</Label>
                <Input
                  value={formData.promotor || ''}
                  onChange={(e) => updateField('promotor', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contacto</Label>
                <Input
                  value={formData.contacto || ''}
                  onChange={(e) => updateField('contacto', e.target.value)}
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
                <Input
                  value={formData.inicio_venta || ''}
                  onChange={(e) => updateField('inicio_venta', e.target.value)}
                  placeholder="DD/MM/YYYY HH:MM"
                />
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
  );
}
