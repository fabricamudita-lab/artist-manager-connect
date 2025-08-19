import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { SingleArtistSelector } from './SingleArtistSelector';
import { CreateBudgetFromTemplateDialog } from './CreateBudgetFromTemplateDialog';
import { Music, Mic, Megaphone, Video, Package, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  projectId?: string;
}

const budgetTypes = [
  { value: 'concierto', label: 'Actuación / Concierto', icon: Mic },
  { value: 'produccion_musical', label: 'Producción Musical', icon: Music },
  { value: 'campana_promocional', label: 'Campaña Promocional', icon: Megaphone },
  { value: 'videoclip', label: 'Videoclip', icon: Video },
  { value: 'otros', label: 'Otros', icon: Package },
];

export default function CreateBudgetDialog({ open, onOpenChange, onSuccess, projectId }: CreateBudgetDialogProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    venue: '',
    budget_status: 'nacional' as 'nacional' | 'internacional',
    show_status: 'pendiente' as 'confirmado' | 'pendiente' | 'cancelado',
    internal_notes: '',
    artist_id: '',
    event_date: undefined as Date | undefined,
    event_time: '',
    fee: 0,
    // Campos específicos para conciertos/actuaciones
    festival_ciclo: '',
    capacidad: '',
    formato: '',
    status_negociacion: '' as 'interes' | 'oferta' | 'negociacion' | 'cerrado' | 'cancelado' | '',
    oferta: '',
    condiciones: '',
    invitaciones: '',
  });
  const [showFromTemplate, setShowFromTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const handleTypeSelection = (type: string) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const errors: Record<string, boolean> = {};
    
    if (!selectedType) {
      errors.selectedType = true;
    }
    
    if (!formData.name.trim()) {
      errors.name = true;
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: "Error",
        description: "Por favor, completa los campos obligatorios",
        variant: "destructive"
      });
      return;
    }
    
    setFieldErrors({});

    setLoading(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .insert({
          type: selectedType as 'concierto' | 'produccion_musical' | 'campana_promocional' | 'videoclip' | 'otros',
          name: formData.name,
          city: formData.city,
          country: formData.country,
          venue: formData.venue,
          budget_status: formData.budget_status,
          show_status: formData.show_status,
          internal_notes: formData.internal_notes,
          artist_id: formData.artist_id || null,
          event_date: formData.event_date?.toISOString().split('T')[0] || null,
          event_time: formData.event_time || null,
          fee: formData.fee,
          created_by: profile?.user_id,
          project_id: projectId || null,
          // Campos específicos para conciertos
          ...(selectedType === 'concierto' && {
            festival_ciclo: formData.festival_ciclo || null,
            capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
            formato: formData.formato || null,
            status_negociacion: formData.status_negociacion || null,
            oferta: formData.oferta || null,
            condiciones: formData.condiciones || null,
            invitaciones: formData.invitaciones ? parseInt(formData.invitaciones) : null,
          })
        });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Presupuesto creado correctamente"
      });

      // Reset form
      setStep(1);
      setSelectedType('');
      setFieldErrors({});
      setFormData({
        name: '',
        city: '',
        country: '',
        venue: '',
        budget_status: 'nacional',
        show_status: 'pendiente',
        internal_notes: '',
        artist_id: '',
        event_date: undefined,
        event_time: '',
        fee: 0,
        festival_ciclo: '',
        capacidad: '',
        formato: '',
        status_negociacion: '',
        oferta: '',
        condiciones: '',
        invitaciones: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating budget:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el presupuesto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedType('');
    setFieldErrors({});
    setFormData({
      name: '',
      city: '',
      country: '',
      venue: '',
      budget_status: 'nacional',
      show_status: 'pendiente',
      internal_notes: '',
      artist_id: '',
      event_date: undefined,
      event_time: '',
      fee: 0,
      festival_ciclo: '',
      capacidad: '',
      formato: '',
      status_negociacion: '',
      oferta: '',
      condiciones: '',
      invitaciones: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Seleccionar Tipo de Presupuesto' : 'Detalles del Presupuesto'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Elige el tipo de presupuesto que deseas crear:
              </p>
              <Button variant="outline" onClick={() => setShowFromTemplate(true)}>
                Usar Plantilla
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card 
                    key={type.value}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleTypeSelection(type.value)}
                  >
                    <CardHeader className="text-center pb-4">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <CardTitle className="text-lg">{type.label}</CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
              {(() => {
                const selectedTypeObj = budgetTypes.find(t => t.value === selectedType);
                if (selectedTypeObj) {
                  const Icon = selectedTypeObj.icon;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="font-medium">{selectedTypeObj.label}</span>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name" className={fieldErrors.name ? "text-destructive" : ""}>
                  Nombre del evento *
                  {fieldErrors.name && <span className="text-xs block text-destructive mt-1">Campo obligatorio</span>}
                </Label>
                <Input
                  id="name"
                  placeholder="Ej. 12.07.2025 – Barcelona – Festival Alma"
                  value={formData.name}
                  onChange={(e) => {
                    handleInputChange('name', e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors(prev => ({ ...prev, name: false }));
                    }
                  }}
                  className={fieldErrors.name ? "border-destructive ring-destructive" : ""}
                />
              </div>

              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  placeholder="Barcelona"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  placeholder="España"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="venue">Lugar / Ciclo / Festival</Label>
                <Input
                  id="venue"
                  placeholder="Festival Alma - Escenario Principal"
                  value={formData.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="budget_status">Presupuesto</Label>
                <Select value={formData.budget_status} onValueChange={(value) => handleInputChange('budget_status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="show_status">Estado del show</Label>
                <Select value={formData.show_status} onValueChange={(value) => handleInputChange('show_status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="event_date">Fecha del evento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.event_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.event_date ? format(formData.event_date, "PPP") : <span>Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.event_date}
                      onSelect={(date) => handleInputChange('event_date', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="event_time">Hora del evento</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => handleInputChange('event_time', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="fee">Fee (€)</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.fee}
                  onChange={(e) => handleInputChange('fee', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="artist_id">Artista</Label>
                <SingleArtistSelector
                  value={formData.artist_id}
                  onValueChange={(value) => handleInputChange('artist_id', value)}
                />
              </div>

              {/* Campos específicos para Actuación / Concierto */}
              {selectedType === 'concierto' && (
                <>
                  <div className="md:col-span-2">
                    <div className="border-t pt-4 mb-4">
                      <h3 className="text-lg font-medium mb-4">📋 Información específica de Concierto</h3>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="festival_ciclo">Festival / Ciclo</Label>
                    <Input
                      id="festival_ciclo"
                      placeholder="Festival Primavera Sound"
                      value={formData.festival_ciclo}
                      onChange={(e) => handleInputChange('festival_ciclo', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="capacidad">Capacidad</Label>
                    <Input
                      id="capacidad"
                      type="number"
                      placeholder="5000"
                      value={formData.capacidad}
                      onChange={(e) => handleInputChange('capacidad', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="formato">Formato</Label>
                    <Select value={formData.formato} onValueChange={(value) => handleInputChange('formato', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar formato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acustico">Acústico</SelectItem>
                        <SelectItem value="electrico">Eléctrico</SelectItem>
                        <SelectItem value="banda_completa">Banda completa</SelectItem>
                        <SelectItem value="dj_set">DJ Set</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status_negociacion">Status</Label>
                    <Select value={formData.status_negociacion} onValueChange={(value) => handleInputChange('status_negociacion', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado de negociación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interes">Interés</SelectItem>
                        <SelectItem value="oferta">Oferta</SelectItem>
                        <SelectItem value="negociacion">Negociación</SelectItem>
                        <SelectItem value="cerrado">Cerrado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="invitaciones">Invitaciones</Label>
                    <Input
                      id="invitaciones"
                      type="number"
                      placeholder="10"
                      value={formData.invitaciones}
                      onChange={(e) => handleInputChange('invitaciones', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="oferta">Oferta</Label>
                    <Textarea
                      id="oferta"
                      placeholder="Detalles de la oferta económica..."
                      value={formData.oferta}
                      onChange={(e) => handleInputChange('oferta', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="condiciones">Condiciones</Label>
                    <Textarea
                      id="condiciones"
                      placeholder="Rider técnico, catering, alojamiento, etc..."
                      value={formData.condiciones}
                      onChange={(e) => handleInputChange('condiciones', e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <Label htmlFor="internal_notes">Notas internas</Label>
                <Textarea
                  id="internal_notes"
                  placeholder="Notas adicionales sobre el presupuesto..."
                  value={formData.internal_notes}
                  onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'Creando...' : 'Crear Presupuesto'}
              </Button>
            </div>
          </div>
        )}

        <CreateBudgetFromTemplateDialog 
          open={showFromTemplate}
          onOpenChange={setShowFromTemplate}
          onSuccess={() => {
            onSuccess();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}