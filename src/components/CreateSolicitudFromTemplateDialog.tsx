import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Calendar, Mic, HelpCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { SingleArtistSelector } from "@/components/SingleArtistSelector";
import { ContactSelector } from "@/components/ContactSelector";

interface CreateSolicitudFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const templates = [
  {
    id: 'booking',
    title: 'Booking',
    description: 'Solicitud para conciertos, festivales y eventos',
    icon: Calendar,
    color: 'bg-blue-100 text-blue-800',
    fields: [
      'nombre_festival',
      'ciudad',
      'lugar_concierto', 
      'hora_show',
      'fee_propuesto',
      'condiciones_extra',
      'contacto_organizacion'
    ]
  },
  {
    id: 'entrevista',
    title: 'Entrevista',
    description: 'Solicitud para entrevistas en medios',
    icon: Mic,
    color: 'bg-green-100 text-green-800',
    fields: [
      'nombre_programa',
      'nombre_entrevistador',
      'hora_entrevista',
      'formato_entrevista',
      'informacion_adicional',
      'contacto_medio'
    ]
  },
  {
    id: 'consulta',
    title: 'Consulta',
    description: 'Consultas generales y preguntas',
    icon: HelpCircle,
    color: 'bg-yellow-100 text-yellow-800',
    fields: [
      'asunto_consulta',
      'detalle_contexto',
      'fecha_respuesta',
      'materiales_adjuntos',
      'contacto_referencia'
    ]
  },
  {
    id: 'informacion',
    title: 'Información',
    description: 'Solicitudes de información sobre proyectos',
    icon: Info,
    color: 'bg-purple-100 text-purple-800',
    fields: [
      'tema_proyecto',
      'detalle_solicitud',
      'formato_respuesta',
      'fecha_limite',
      'contacto_referencia'
    ]
  }
];

export function CreateSolicitudFromTemplateDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateSolicitudFromTemplateDialogProps) {
  const { profile } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [formData, setFormData] = useState<Record<string, any>>({
    contact_id: '',
    artist_id: '',
    prioridad: 'media',
    observaciones: '',
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setStep('form');
    // Reset form with template-specific structure
    setFormData({
      contact_id: '',
      artist_id: '',
      prioridad: 'media',
      observaciones: '',
      // Template-specific fields
      ...(templateId === 'booking' && {
        nombre_festival: '',
        ciudad: '',
        lugar_concierto: '',
        hora_show: '',
        fee_propuesto: '',
        condiciones_extra: '',
        contacto_organizacion: ''
      }),
      ...(templateId === 'entrevista' && {
        medio: '',
        nombre_programa: '',
        nombre_entrevistador: '',
        hora_entrevista: '',
        formato_entrevista: '',
        informacion_programa: '',
        contacto_medio: ''
      }),
      ...(templateId === 'consulta' && {
        asunto_consulta: '',
        detalle_contexto: '',
        fecha_respuesta: '',
        materiales_adjuntos: '',
        contacto_referencia: ''
      }),
      ...(templateId === 'informacion' && {
        tema_proyecto: '',
        detalle_solicitud: '',
        formato_respuesta: '',
        fecha_limite: '',
        contacto_referencia: ''
      })
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact_id || !formData.artist_id) {
      toast({
        title: "Error",
        description: "El contacto y el artista son requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get contact information for the solicitud
      const { data: contactData } = await supabase
        .from('contacts')
        .select('name, email, phone')
        .eq('id', formData.contact_id)
        .single();

      const template = templates.find(t => t.id === selectedTemplate);
      const tipo = selectedTemplate as 'booking' | 'entrevista' | 'consulta' | 'informacion';

      // Prepare solicitud data based on template
      const solicitudData: any = {
        tipo,
        nombre_solicitante: contactData?.name || 'Sin nombre',
        email: contactData?.email || null,
        telefono: contactData?.phone || null,
        contact_id: formData.contact_id,
        artist_id: formData.artist_id,
        observaciones: formData.observaciones || null,
        created_by: profile?.user_id,
        estado: 'pendiente'
      };

      // Add template-specific fields to descripcion_libre as structured text
      let descripcionLibre = `Solicitud de ${template?.title}\n\n`;
      
      if (selectedTemplate === 'booking') {
        descripcionLibre += `Nombre del festival/evento: ${formData.nombre_festival || 'No especificado'}\n`;
        descripcionLibre += `Ciudad/país: ${formData.ciudad || 'No especificado'}\n`;
        descripcionLibre += `Lugar del concierto: ${formData.lugar_concierto || 'No especificado'}\n`;
        descripcionLibre += `Fecha y hora: ${formData.hora_show || 'No especificado'}\n`;
        descripcionLibre += `Fee propuesto: ${formData.fee_propuesto || 'No especificado'}\n`;
        descripcionLibre += `Condiciones extra: ${formData.condiciones_extra || 'No especificado'}\n`;
        descripcionLibre += `Contacto organización: ${formData.contacto_organizacion || 'No especificado'}\n`;
        
        // Map to existing fields where possible
        solicitudData.nombre_festival = formData.nombre_festival || null;
        solicitudData.ciudad = formData.ciudad || null;
        solicitudData.lugar_concierto = formData.lugar_concierto || null;
        solicitudData.hora_show = formData.hora_show ? new Date(formData.hora_show).toISOString() : null;
      }

      if (selectedTemplate === 'entrevista') {
        descripcionLibre += `Nombre del programa/medio: ${formData.nombre_programa || 'No especificado'}\n`;
        descripcionLibre += `Nombre del entrevistador: ${formData.nombre_entrevistador || 'No especificado'}\n`;
        descripcionLibre += `Fecha y hora: ${formData.hora_entrevista || 'No especificado'}\n`;
        descripcionLibre += `Formato: ${formData.formato_entrevista || 'No especificado'}\n`;
        descripcionLibre += `Información adicional: ${formData.informacion_programa || 'No especificado'}\n`;
        descripcionLibre += `Contacto del medio: ${formData.contacto_medio || 'No especificado'}\n`;
        
        // Map to existing fields where possible
        solicitudData.medio = formData.medio || null;
        solicitudData.nombre_programa = formData.nombre_programa || null;
        solicitudData.nombre_entrevistador = formData.nombre_entrevistador || null;
        solicitudData.hora_entrevista = formData.hora_entrevista ? new Date(formData.hora_entrevista).toISOString() : null;
        solicitudData.informacion_programa = formData.informacion_programa || null;
      }

      if (selectedTemplate === 'consulta') {
        descripcionLibre += `Asunto principal: ${formData.asunto_consulta || 'No especificado'}\n`;
        descripcionLibre += `Detalle/contexto: ${formData.detalle_contexto || 'No especificado'}\n`;
        descripcionLibre += `Fecha sugerida para respuesta: ${formData.fecha_respuesta || 'No especificado'}\n`;
        descripcionLibre += `Materiales adjuntos: ${formData.materiales_adjuntos || 'No especificado'}\n`;
        descripcionLibre += `Contacto de referencia: ${formData.contacto_referencia || 'No especificado'}\n`;
      }

      if (selectedTemplate === 'informacion') {
        descripcionLibre += `Tema/proyecto: ${formData.tema_proyecto || 'No especificado'}\n`;
        descripcionLibre += `Detalle de la solicitud: ${formData.detalle_solicitud || 'No especificado'}\n`;
        descripcionLibre += `Formato de respuesta: ${formData.formato_respuesta || 'No especificado'}\n`;
        descripcionLibre += `Fecha límite: ${formData.fecha_limite || 'No especificado'}\n`;
        descripcionLibre += `Contacto de referencia: ${formData.contacto_referencia || 'No especificado'}\n`;
      }

      descripcionLibre += `\nPrioridad: ${formData.prioridad}\n`;
      
      solicitudData.descripcion_libre = descripcionLibre;

      const { error } = await supabase
        .from('solicitudes')
        .insert([solicitudData]);

      if (error) throw error;

      toast({
        title: "Solicitud creada",
        description: `Solicitud de ${template?.title} creada correctamente.`,
      });

      onSuccess();
      onOpenChange(false);
      setStep('select');
      setSelectedTemplate('');
      setFormData({
        contact_id: '',
        artist_id: '',
        prioridad: 'media',
        observaciones: '',
      });
    } catch (error) {
      console.error('Error creating solicitud:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud.",
        variant: "destructive",
      });
    }
  };

  const renderTemplateSelection = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h3 className="text-lg font-semibold mb-2">Selecciona el tipo de solicitud</h3>
        <p className="text-muted-foreground">Elige una plantilla predefinida para crear tu solicitud rápidamente</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const IconComponent = template.icon;
          return (
            <Card 
              key={template.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleTemplateSelect(template.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{template.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <Badge className={template.color}>
                      {template.fields.length} campos
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );

  const renderFormFields = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <template.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{template.title}</h3>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
        </div>

        {/* Common fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Información General</h4>
          
          <div className="space-y-2">
            <Label htmlFor="artist_id">Artista Relacionado *</Label>
            <SingleArtistSelector
              value={formData.artist_id}
              onValueChange={(value) => setFormData({ ...formData, artist_id: value })}
              placeholder="Selecciona el artista"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_id">Contacto *</Label>
            <ContactSelector
              value={formData.contact_id}
              onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
              artistId={formData.artist_id}
              placeholder="Seleccionar contacto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prioridad">Prioridad</Label>
            <Select
              value={formData.prioridad}
              onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">🟢 Baja</SelectItem>
                <SelectItem value="media">🟡 Media</SelectItem>
                <SelectItem value="alta">🟠 Alta</SelectItem>
                <SelectItem value="urgente">🔴 Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Template-specific fields */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
            Información Específica - {template.title}
          </h4>
          
          {selectedTemplate === 'booking' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nombre_festival">Nombre del festival / evento</Label>
                <Input
                  id="nombre_festival"
                  value={formData.nombre_festival}
                  onChange={(e) => setFormData({ ...formData, nombre_festival: e.target.value })}
                  placeholder="Nombre del festival o evento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad / país</Label>
                  <Input
                    id="ciudad"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    placeholder="Madrid, España"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lugar_concierto">Lugar del concierto</Label>
                  <Input
                    id="lugar_concierto"
                    value={formData.lugar_concierto}
                    onChange={(e) => setFormData({ ...formData, lugar_concierto: e.target.value })}
                    placeholder="Nombre del venue"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_show">Fecha(s) propuesta(s)</Label>
                  <Input
                    id="hora_show"
                    type="datetime-local"
                    value={formData.hora_show}
                    onChange={(e) => setFormData({ ...formData, hora_show: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee_propuesto">Fee propuesto (€)</Label>
                  <Input
                    id="fee_propuesto"
                    value={formData.fee_propuesto}
                    onChange={(e) => setFormData({ ...formData, fee_propuesto: e.target.value })}
                    placeholder="5000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condiciones_extra">Otras condiciones (backline, alojamiento, transporte)</Label>
                <Textarea
                  id="condiciones_extra"
                  value={formData.condiciones_extra}
                  onChange={(e) => setFormData({ ...formData, condiciones_extra: e.target.value })}
                  placeholder="Especifica backline, rider, alojamiento, transporte..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contacto_organizacion">Contacto de la organización (nombre, email, teléfono)</Label>
                <Textarea
                  id="contacto_organizacion"
                  value={formData.contacto_organizacion}
                  onChange={(e) => setFormData({ ...formData, contacto_organizacion: e.target.value })}
                  placeholder="Nombre: Juan Pérez, Email: juan@festival.com, Teléfono: +34 600 000 000"
                  rows={3}
                />
              </div>
            </>
          )}

          {selectedTemplate === 'entrevista' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_programa">Nombre del programa / medio</Label>
                  <Input
                    id="nombre_programa"
                    value={formData.nombre_programa}
                    onChange={(e) => setFormData({ ...formData, nombre_programa: e.target.value })}
                    placeholder="La Ventana, Cadena SER"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre_entrevistador">Nombre del entrevistador/a</Label>
                  <Input
                    id="nombre_entrevistador"
                    value={formData.nombre_entrevistador}
                    onChange={(e) => setFormData({ ...formData, nombre_entrevistador: e.target.value })}
                    placeholder="María García"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_entrevista">Fecha y hora propuesta</Label>
                  <Input
                    id="hora_entrevista"
                    type="datetime-local"
                    value={formData.hora_entrevista}
                    onChange={(e) => setFormData({ ...formData, hora_entrevista: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formato_entrevista">Formato</Label>
                  <Select
                    value={formData.formato_entrevista}
                    onValueChange={(value) => setFormData({ ...formData, formato_entrevista: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="grabada">Grabada</SelectItem>
                      <SelectItem value="directo">En directo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="informacion_programa">Información adicional (enlace, preguntas previstas, temática)</Label>
                <Textarea
                  id="informacion_programa"
                  value={formData.informacion_programa}
                  onChange={(e) => setFormData({ ...formData, informacion_programa: e.target.value })}
                  placeholder="Link del programa, temática principal, preguntas que podrían hacer..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contacto_medio">Contacto del medio (nombre, email, teléfono)</Label>
                <Textarea
                  id="contacto_medio"
                  value={formData.contacto_medio}
                  onChange={(e) => setFormData({ ...formData, contacto_medio: e.target.value })}
                  placeholder="Persona de contacto, email y teléfono del medio"
                  rows={2}
                />
              </div>
            </>
          )}

          {selectedTemplate === 'consulta' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asunto_consulta">Asunto principal de la consulta</Label>
                <Input
                  id="asunto_consulta"
                  value={formData.asunto_consulta}
                  onChange={(e) => setFormData({ ...formData, asunto_consulta: e.target.value })}
                  placeholder="Tema principal de la consulta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detalle_contexto">Detalle / contexto</Label>
                <Textarea
                  id="detalle_contexto"
                  value={formData.detalle_contexto}
                  onChange={(e) => setFormData({ ...formData, detalle_contexto: e.target.value })}
                  placeholder="Describe el contexto y detalles de la consulta"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_respuesta">Fecha sugerida para respuesta</Label>
                  <Input
                    id="fecha_respuesta"
                    type="date"
                    value={formData.fecha_respuesta}
                    onChange={(e) => setFormData({ ...formData, fecha_respuesta: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materiales_adjuntos">Materiales adjuntos (opcional)</Label>
                  <Input
                    id="materiales_adjuntos"
                    value={formData.materiales_adjuntos}
                    onChange={(e) => setFormData({ ...formData, materiales_adjuntos: e.target.value })}
                    placeholder="Documentos, links, referencias"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contacto_referencia">Contacto de referencia (nombre, email, teléfono)</Label>
                <Textarea
                  id="contacto_referencia"
                  value={formData.contacto_referencia}
                  onChange={(e) => setFormData({ ...formData, contacto_referencia: e.target.value })}
                  placeholder="Persona de contacto para esta consulta"
                  rows={2}
                />
              </div>
            </>
          )}

          {selectedTemplate === 'informacion' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tema_proyecto">Tema o proyecto sobre el que se solicita información</Label>
                <Input
                  id="tema_proyecto"
                  value={formData.tema_proyecto}
                  onChange={(e) => setFormData({ ...formData, tema_proyecto: e.target.value })}
                  placeholder="Nuevo álbum, gira, colaboración..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detalle_solicitud">Detalle de la solicitud</Label>
                <Textarea
                  id="detalle_solicitud"
                  value={formData.detalle_solicitud}
                  onChange={(e) => setFormData({ ...formData, detalle_solicitud: e.target.value })}
                  placeholder="Qué información específica necesitan"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formato_respuesta">Formato de respuesta</Label>
                  <Select
                    value={formData.formato_respuesta}
                    onValueChange={(value) => setFormData({ ...formData, formato_respuesta: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="llamada">Llamada</SelectItem>
                      <SelectItem value="reunion">Reunión</SelectItem>
                      <SelectItem value="documento">Documento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_limite">Fecha límite sugerida</Label>
                  <Input
                    id="fecha_limite"
                    type="date"
                    value={formData.fecha_limite}
                    onChange={(e) => setFormData({ ...formData, fecha_limite: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contacto_referencia">Contacto de referencia (nombre, email, teléfono)</Label>
                <Textarea
                  id="contacto_referencia"
                  value={formData.contacto_referencia}
                  onChange={(e) => setFormData({ ...formData, contacto_referencia: e.target.value })}
                  placeholder="Persona de contacto para esta solicitud"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones adicionales</Label>
          <Textarea
            id="observaciones"
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            placeholder="Cualquier información adicional relevante"
            rows={3}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={() => setStep('select')}>
            Atrás
          </Button>
          <Button type="submit" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Crear Solicitud
          </Button>
        </div>
      </form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {step === 'select' ? 'Crear Solicitud desde Plantilla' : 'Nueva Solicitud'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? renderTemplateSelection() : renderFormFields()}
      </DialogContent>
    </Dialog>
  );
}