import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  observaciones?: string;
  notas_internas?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  artist_id?: string;
  
  // Campos específicos para entrevistas
  medio?: string;
  nombre_entrevistador?: string;
  nombre_programa?: string;
  hora_entrevista?: string;
  informacion_programa?: string;
  
  // Campos específicos para bookings
  hora_show?: string;
  nombre_festival?: string;
  lugar_concierto?: string;
  ciudad?: string;
  
  // Campo libre para tipo "otro"
  descripcion_libre?: string;
}

interface EditSolicitudDialogProps {
  solicitud: Solicitud | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSolicitudUpdated: () => void;
}

export function EditSolicitudDialog({ solicitud, open, onOpenChange, onSolicitudUpdated }: EditSolicitudDialogProps) {
  const [formData, setFormData] = useState({
    tipo: '' as 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro',
    nombre_solicitante: '',
    email: '',
    telefono: '',
    observaciones: '',
    notas_internas: '',
    estado: '' as 'pendiente' | 'aprobada' | 'denegada',
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

  useEffect(() => {
    if (solicitud && open) {
      setFormData({
        tipo: solicitud.tipo,
        nombre_solicitante: solicitud.nombre_solicitante,
        email: solicitud.email || '',
        telefono: solicitud.telefono || '',
        observaciones: solicitud.observaciones || '',
        notas_internas: solicitud.notas_internas || '',
        estado: solicitud.estado,
        artist_id: solicitud.artist_id || '',
        
        // Campos específicos para entrevistas
        medio: solicitud.medio || '',
        nombre_entrevistador: solicitud.nombre_entrevistador || '',
        nombre_programa: solicitud.nombre_programa || '',
        hora_entrevista: solicitud.hora_entrevista ? new Date(solicitud.hora_entrevista).toISOString().slice(0, 16) : '',
        informacion_programa: solicitud.informacion_programa || '',
        
        // Campos específicos para bookings
        hora_show: solicitud.hora_show ? new Date(solicitud.hora_show).toISOString().slice(0, 16) : '',
        nombre_festival: solicitud.nombre_festival || '',
        lugar_concierto: solicitud.lugar_concierto || '',
        ciudad: solicitud.ciudad || '',
        
        // Campo libre para tipo "otro"
        descripcion_libre: solicitud.descripcion_libre || '',
      });
    }
  }, [solicitud, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!solicitud || !formData.nombre_solicitante) {
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
        estado: formData.estado,
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
        
        ...((formData.tipo === 'otro' || formData.tipo === 'consulta' || formData.tipo === 'informacion') && {
          descripcion_libre: formData.descripcion_libre || null,
        }),
      };

      const { error } = await supabase
        .from('solicitudes')
        .update(solicitudData as any)
        .eq('id', solicitud.id);

      if (error) throw error;

      toast({
        title: "Solicitud actualizada",
        description: "La solicitud se ha actualizado correctamente.",
      });

      onSolicitudUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la solicitud.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Solicitud</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la solicitud
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Solicitud</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'otro') => 
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrevista">📻 Entrevista</SelectItem>
                      <SelectItem value="booking">🎤 Booking</SelectItem>
                      <SelectItem value="consulta">💬 Consulta</SelectItem>
                      <SelectItem value="informacion">ℹ️ Información</SelectItem>
                      <SelectItem value="otro">📌 Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => 
                      setFormData({ ...formData, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                      <SelectItem value="aprobada">✅ Aprobada</SelectItem>
                      <SelectItem value="denegada">❌ Denegada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_solicitante">Nombre del Solicitante</Label>
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
                  placeholder="Selecciona un artista"
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
            </CardContent>
          </Card>

          {/* Información específica por tipo */}
          {formData.tipo === 'entrevista' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📻 Información de la Entrevista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medio">Medio</Label>
                    <Input
                      id="medio"
                      value={formData.medio}
                      onChange={(e) => setFormData({ ...formData, medio: e.target.value })}
                      placeholder="Nombre del medio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre_entrevistador">Entrevistador</Label>
                    <Input
                      id="nombre_entrevistador"
                      value={formData.nombre_entrevistador}
                      onChange={(e) => setFormData({ ...formData, nombre_entrevistador: e.target.value })}
                      placeholder="Nombre del entrevistador"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre_programa">Programa</Label>
                    <Input
                      id="nombre_programa"
                      value={formData.nombre_programa}
                      onChange={(e) => setFormData({ ...formData, nombre_programa: e.target.value })}
                      placeholder="Nombre del programa"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="informacion_programa">Información del Programa</Label>
                  <Textarea
                    id="informacion_programa"
                    value={formData.informacion_programa}
                    onChange={(e) => setFormData({ ...formData, informacion_programa: e.target.value })}
                    placeholder="Descripción del programa"
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre_festival">Festival/Evento</Label>
                    <Input
                      id="nombre_festival"
                      value={formData.nombre_festival}
                      onChange={(e) => setFormData({ ...formData, nombre_festival: e.target.value })}
                      placeholder="Nombre del festival"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lugar_concierto">Lugar</Label>
                    <Input
                      id="lugar_concierto"
                      value={formData.lugar_concierto}
                      onChange={(e) => setFormData({ ...formData, lugar_concierto: e.target.value })}
                      placeholder="Venue o lugar"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Input
                      id="ciudad"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      placeholder="Ciudad del evento"
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
                </div>
              </CardContent>
            </Card>
          )}

          {(formData.tipo === 'otro' || formData.tipo === 'consulta' || formData.tipo === 'informacion') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📌 Información Adicional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="descripcion_libre">Descripción</Label>
                  <Textarea
                    id="descripcion_libre"
                    value={formData.descripcion_libre}
                    onChange={(e) => setFormData({ ...formData, descripcion_libre: e.target.value })}
                    placeholder="Descripción detallada"
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button type="submit">Guardar Cambios</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}