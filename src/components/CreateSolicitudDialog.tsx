import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';

interface CreateSolicitudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSolicitudCreated: () => void;
}

export function CreateSolicitudDialog({ open, onOpenChange, onSolicitudCreated }: CreateSolicitudDialogProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    tipo: '' as 'entrevista' | 'booking' | 'otro' | '',
    nombre_solicitante: '',
    email: '',
    telefono: '',
    observaciones: '',
    notas_internas: '',
    artist_id: '',
    
    // Campos específicos para entrevistas
    medio: '',
    nombre_entrevistador: '',
    nombre_programa: '',
    hora_entrevista: '',
    informacion_programa: '',
    
    // Campos específicos para bookings
    hora_show: '',
    nombre_festival: '',
    lugar_concierto: '',
    ciudad: '',
    
    // Campo libre para tipo "otro"
    descripcion_libre: '',
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      tipo: '',
      nombre_solicitante: '',
      email: '',
      telefono: '',
      observaciones: '',
      notas_internas: '',
      artist_id: '',
      medio: '',
      nombre_entrevistador: '',
      nombre_programa: '',
      hora_entrevista: '',
      informacion_programa: '',
      hora_show: '',
      nombre_festival: '',
      lugar_concierto: '',
      ciudad: '',
      descripcion_libre: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo || !formData.nombre_solicitante) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const solicitudData = {
        tipo: formData.tipo,
        nombre_solicitante: formData.nombre_solicitante,
        email: formData.email || null,
        telefono: formData.telefono || null,
        observaciones: formData.observaciones || null,
        notas_internas: formData.notas_internas || null,
        created_by: profile?.user_id,
        artist_id: formData.artist_id || null,
        
        // Campos específicos según el tipo
        ...(formData.tipo === 'entrevista' && {
          medio: formData.medio || null,
          nombre_entrevistador: formData.nombre_entrevistador || null,
          nombre_programa: formData.nombre_programa || null,
          hora_entrevista: formData.hora_entrevista || null,
          informacion_programa: formData.informacion_programa || null,
        }),
        
        ...(formData.tipo === 'booking' && {
          hora_show: formData.hora_show || null,
          nombre_festival: formData.nombre_festival || null,
          lugar_concierto: formData.lugar_concierto || null,
          ciudad: formData.ciudad || null,
        }),
        
        ...(formData.tipo === 'otro' && {
          descripcion_libre: formData.descripcion_libre || null,
        }),
      };

      const { error } = await supabase
        .from('solicitudes')
        .insert([solicitudData]);

      if (error) throw error;

      toast({
        title: "Solicitud creada",
        description: "La solicitud se ha creado correctamente.",
      });

      onSolicitudCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud.",
        variant: "destructive",
      });
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo de Solicitud *</Label>
        <Select
          value={formData.tipo}
          onValueChange={(value: 'entrevista' | 'booking' | 'otro') => 
            setFormData({ ...formData, tipo: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo de solicitud" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entrevista">📻 Entrevista</SelectItem>
            <SelectItem value="booking">🎤 Booking</SelectItem>
            <SelectItem value="otro">📌 Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre_solicitante">Nombre del Solicitante *</Label>
        <Input
          id="nombre_solicitante"
          value={formData.nombre_solicitante}
          onChange={(e) => setFormData({ ...formData, nombre_solicitante: e.target.value })}
          placeholder="Nombre de la persona o empresa"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="+34 600 000 000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="artist_id">Artista Asociado</Label>
        <SingleArtistSelector
          value={formData.artist_id}
          onValueChange={(value) => setFormData({ ...formData, artist_id: value })}
          placeholder="Selecciona un artista (opcional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          placeholder="Información adicional sobre la solicitud"
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={() => setStep(2)}
          disabled={!formData.tipo || !formData.nombre_solicitante}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {formData.tipo === 'entrevista' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📻 Información de la Entrevista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medio">Medio</Label>
              <Input
                id="medio"
                value={formData.medio}
                onChange={(e) => setFormData({ ...formData, medio: e.target.value })}
                placeholder="Nombre del medio (radio, TV, podcast, etc.)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_entrevistador">Nombre del Entrevistador</Label>
              <Input
                id="nombre_entrevistador"
                value={formData.nombre_entrevistador}
                onChange={(e) => setFormData({ ...formData, nombre_entrevistador: e.target.value })}
                placeholder="Nombre del periodista o presentador"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_programa">Nombre del Programa</Label>
              <Input
                id="nombre_programa"
                value={formData.nombre_programa}
                onChange={(e) => setFormData({ ...formData, nombre_programa: e.target.value })}
                placeholder="Nombre del programa o sección"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_entrevista">Fecha y Hora</Label>
              <Input
                id="hora_entrevista"
                type="datetime-local"
                value={formData.hora_entrevista}
                onChange={(e) => setFormData({ ...formData, hora_entrevista: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="informacion_programa">Información del Programa</Label>
              <Textarea
                id="informacion_programa"
                value={formData.informacion_programa}
                onChange={(e) => setFormData({ ...formData, informacion_programa: e.target.value })}
                placeholder="Descripción del programa, audiencia, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formData.tipo === 'booking' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎤 Información del Booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_festival">Nombre del Festival/Evento</Label>
              <Input
                id="nombre_festival"
                value={formData.nombre_festival}
                onChange={(e) => setFormData({ ...formData, nombre_festival: e.target.value })}
                placeholder="Nombre del festival o evento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lugar_concierto">Lugar del Concierto</Label>
              <Input
                id="lugar_concierto"
                value={formData.lugar_concierto}
                onChange={(e) => setFormData({ ...formData, lugar_concierto: e.target.value })}
                placeholder="Nombre del venue o lugar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                placeholder="Ciudad donde se realizará el evento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_show">Fecha y Hora del Show</Label>
              <Input
                id="hora_show"
                type="datetime-local"
                value={formData.hora_show}
                onChange={(e) => setFormData({ ...formData, hora_show: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formData.tipo === 'otro' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📌 Información Adicional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion_libre">Descripción de la Solicitud</Label>
              <Textarea
                id="descripcion_libre"
                value={formData.descripcion_libre}
                onChange={(e) => setFormData({ ...formData, descripcion_libre: e.target.value })}
                placeholder="Describe detalladamente la solicitud"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="notas_internas">Notas Internas</Label>
        <Textarea
          id="notas_internas"
          value={formData.notas_internas}
          onChange={(e) => setFormData({ ...formData, notas_internas: e.target.value })}
          placeholder="Notas para uso interno del equipo"
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          Anterior
        </Button>
        <Button type="submit">
          Crear Solicitud
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nueva Solicitud - Paso {step} de 2
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Completa la información básica de la solicitud"
              : "Añade información específica según el tipo de solicitud"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {step === 1 ? renderStep1() : renderStep2()}
        </form>
      </DialogContent>
    </Dialog>
  );
}