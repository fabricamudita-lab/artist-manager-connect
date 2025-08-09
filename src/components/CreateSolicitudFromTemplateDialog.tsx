import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Calendar, Mic, HelpCircle, Info, Scale, MoreHorizontal } from "lucide-react";
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
      'fecha',
      'festival_ciclo',
      'ciudad',
      'lugar',
      'capacidad',
      'hora',
      'formato',
      'status_booking',
      'oferta',
      'condiciones',
      'comentarios'
    ]
  },
  {
    id: 'entrevista',
    title: 'Entrevista',
    description: 'Solicitud para entrevistas en medios',
    icon: Mic,
    color: 'bg-green-100 text-green-800',
    fields: [
      'programa',
      'medio_canal',
      'fecha_hora',
      'formato_entrevista',
      'nombre_entrevistador',
      'informacion_adicional'
    ]
  },
  {
    id: 'consulta',
    title: 'Consulta',
    description: 'Consultas generales y preguntas',
    icon: HelpCircle,
    color: 'bg-yellow-100 text-yellow-800',
    fields: [
      'asunto',
      'descripcion_contexto',
      'prioridad',
      'contacto',
      'tipo_respuesta'
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
      'detalle_solicitado',
      'tipo_respuesta'
    ]
  },
  {
    id: 'licencia',
    title: 'Licencia',
    description: 'Solicitudes de licencias musicales',
    icon: Scale,
    color: 'bg-orange-100 text-orange-800',
    fields: [
      'tipo_licencia',
      'obra_licenciar',
      'medio_proyecto',
      'territorio',
      'duracion',
      'empresa_artista_solicitante'
    ]
  },
  {
    id: 'otros',
    title: 'Otros',
    description: 'Otras solicitudes no categorizadas',
    icon: MoreHorizontal,
    color: 'bg-gray-100 text-gray-800',
    fields: [
      'asunto',
      'descripcion',
      'contacto',
      'tipo_respuesta'
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
        fecha: '',
        festival_ciclo: '',
        ciudad: '',
        lugar: '',
        capacidad: '',
        hora: '',
        formato: '',
        status_booking: '',
        oferta: '',
        condiciones: '',
        comentarios: ''
      }),
      ...(templateId === 'entrevista' && {
        programa: '',
        medio_canal: '',
        fecha_hora: '',
        formato_entrevista: '',
        nombre_entrevistador: '',
        informacion_adicional: ''
      }),
      ...(templateId === 'consulta' && {
        asunto: '',
        descripcion_contexto: '',
        prioridad: 'media',
        contacto: '',
        tipo_respuesta: ''
      }),
      ...(templateId === 'informacion' && {
        tema_proyecto: '',
        detalle_solicitado: '',
        tipo_respuesta: ''
      }),
      ...(templateId === 'licencia' && {
        tipo_licencia: '',
        obra_licenciar: '',
        medio_proyecto: '',
        territorio: '',
        duracion: '',
        empresa_artista_solicitante: ''
      }),
      ...(templateId === 'otros' && {
        asunto: '',
        descripcion: '',
        contacto: '',
        tipo_respuesta: ''
      })
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.artist_id) {
      toast({
        title: "Error",
        description: "El artista es requerido.",
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
      const tipo = selectedTemplate as 'booking' | 'entrevista' | 'consulta' | 'informacion' | 'licencia' | 'otros';

      // Prepare solicitud data based on template
      const solicitudData: any = {
        tipo,
        nombre_solicitante: contactData?.name || 'Sin nombre',
        email: contactData?.email || null,
        telefono: contactData?.phone || null,
        contact_id: formData.contact_id || null,
        artist_id: formData.artist_id,
        observaciones: formData.observaciones || null,
        created_by: profile?.user_id,
        estado: 'pendiente'
      };

      // Add template-specific fields to descripcion_libre as structured text
      let descripcionLibre = `Solicitud de ${template?.title}\n\n`;
      
      if (selectedTemplate === 'booking') {
        descripcionLibre += `Fecha: ${formData.fecha || 'No especificada'}\n`;
        descripcionLibre += `Festival / Ciclo: ${formData.festival_ciclo || 'No especificado'}\n`;
        descripcionLibre += `Ciudad: ${formData.ciudad || 'No especificada'}\n`;
        descripcionLibre += `Lugar: ${formData.lugar || 'No especificado'}\n`;
        descripcionLibre += `Capacidad: ${formData.capacidad || 'No especificada'}\n`;
        descripcionLibre += `Hora: ${formData.hora || 'No especificada'}\n`;
        descripcionLibre += `Formato: ${formData.formato || 'No especificado'}\n`;
        descripcionLibre += `Status: ${formData.status_booking || 'No especificado'}\n`;
        descripcionLibre += `Oferta: ${formData.oferta || 'No especificada'}\n`;
        descripcionLibre += `Condiciones: ${formData.condiciones || 'No especificadas'}\n`;
        descripcionLibre += `Comentarios: ${formData.comentarios || 'No especificados'}\n`;
        
        // Map to existing fields where possible
        solicitudData.nombre_festival = formData.festival_ciclo || null;
        solicitudData.ciudad = formData.ciudad || null;
        solicitudData.lugar_concierto = formData.lugar || null;
        solicitudData.hora_show = formData.fecha && formData.hora ? new Date(formData.fecha + 'T' + formData.hora).toISOString() : null;
      }

      if (selectedTemplate === 'entrevista') {
        descripcionLibre += `Programa: ${formData.programa || 'No especificado'}\n`;
        descripcionLibre += `Medio / Canal: ${formData.medio_canal || 'No especificado'}\n`;
        descripcionLibre += `Fecha y hora: ${formData.fecha_hora || 'No especificada'}\n`;
        descripcionLibre += `Formato: ${formData.formato_entrevista || 'No especificado'}\n`;
        descripcionLibre += `Nombre del entrevistador: ${formData.nombre_entrevistador || 'No especificado'}\n`;
        descripcionLibre += `Información adicional: ${formData.informacion_adicional || 'No especificada'}\n`;
        
        // Map to existing fields where possible
        solicitudData.medio = formData.medio_canal || null;
        solicitudData.nombre_programa = formData.programa || null;
        solicitudData.nombre_entrevistador = formData.nombre_entrevistador || null;
        solicitudData.hora_entrevista = formData.fecha_hora ? new Date(formData.fecha_hora).toISOString() : null;
        solicitudData.informacion_programa = formData.informacion_adicional || null;
      }

      if (selectedTemplate === 'consulta') {
        descripcionLibre += `Asunto: ${formData.asunto || 'No especificado'}\n`;
        descripcionLibre += `Descripción / contexto: ${formData.descripcion_contexto || 'No especificada'}\n`;
        descripcionLibre += `Prioridad: ${formData.prioridad || 'Media'}\n`;
        descripcionLibre += `Contacto: ${formData.contacto || 'No especificado'}\n`;
        descripcionLibre += `Tipo de respuesta: ${formData.tipo_respuesta || 'No especificado'}\n`;
      }

      if (selectedTemplate === 'informacion') {
        descripcionLibre += `Tema o proyecto: ${formData.tema_proyecto || 'No especificado'}\n`;
        descripcionLibre += `Detalle de lo solicitado: ${formData.detalle_solicitado || 'No especificado'}\n`;
        descripcionLibre += `Tipo de respuesta: ${formData.tipo_respuesta || 'No especificado'}\n`;
      }

      if (selectedTemplate === 'licencia') {
        descripcionLibre += `Tipo de licencia: ${formData.tipo_licencia || 'No especificado'}\n`;
        descripcionLibre += `Obra a licenciar: ${formData.obra_licenciar || 'No especificada'}\n`;
        descripcionLibre += `Medio o proyecto: ${formData.medio_proyecto || 'No especificado'}\n`;
        descripcionLibre += `Territorio: ${formData.territorio || 'No especificado'}\n`;
        descripcionLibre += `Duración: ${formData.duracion || 'No especificada'}\n`;
        descripcionLibre += `Empresa o artista solicitante: ${formData.empresa_artista_solicitante || 'No especificado'}\n`;
      }

      if (selectedTemplate === 'otros') {
        descripcionLibre += `Asunto: ${formData.asunto || 'No especificado'}\n`;
        descripcionLibre += `Descripción: ${formData.descripcion || 'No especificada'}\n`;
        descripcionLibre += `Contacto: ${formData.contacto || 'No especificado'}\n`;
        descripcionLibre += `Tipo de respuesta: ${formData.tipo_respuesta || 'No especificado'}\n`;
      }
      
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="festival_ciclo">Festival / Ciclo</Label>
                  <Input
                    id="festival_ciclo"
                    value={formData.festival_ciclo}
                    onChange={(e) => setFormData({ ...formData, festival_ciclo: e.target.value })}
                    placeholder="Nombre del festival o ciclo"
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
                    placeholder="Madrid, España"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lugar">Lugar</Label>
                  <Input
                    id="lugar"
                    value={formData.lugar}
                    onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                    placeholder="Nombre del venue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacidad">Capacidad</Label>
                  <Input
                    id="capacidad"
                    type="number"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                    placeholder="1500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formato">Formato</Label>
                  <Input
                    id="formato"
                    value={formData.formato}
                    onChange={(e) => setFormData({ ...formData, formato: e.target.value })}
                    placeholder="Concierto, DJ set, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status_booking">Status</Label>
                  <Select
                    value={formData.status_booking}
                    onValueChange={(value) => setFormData({ ...formData, status_booking: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona status" />
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
                <div className="space-y-2">
                  <Label htmlFor="oferta">Oferta</Label>
                  <Input
                    id="oferta"
                    value={formData.oferta}
                    onChange={(e) => setFormData({ ...formData, oferta: e.target.value })}
                    placeholder="€5000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condiciones">Condiciones</Label>
                <Textarea
                  id="condiciones"
                  value={formData.condiciones}
                  onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                  placeholder="Backline, alojamiento, transporte, rider..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentarios">Comentarios</Label>
                <Textarea
                  id="comentarios"
                  value={formData.comentarios}
                  onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                  placeholder="Comentarios adicionales sobre la solicitud"
                  rows={3}
                />
              </div>
            </>
          )}

          {selectedTemplate === 'entrevista' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="programa">Programa</Label>
                  <Input
                    id="programa"
                    value={formData.programa}
                    onChange={(e) => setFormData({ ...formData, programa: e.target.value })}
                    placeholder="La Ventana"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medio_canal">Medio / Canal</Label>
                  <Input
                    id="medio_canal"
                    value={formData.medio_canal}
                    onChange={(e) => setFormData({ ...formData, medio_canal: e.target.value })}
                    placeholder="Cadena SER"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_hora">Fecha y hora</Label>
                  <Input
                    id="fecha_hora"
                    type="datetime-local"
                    value={formData.fecha_hora}
                    onChange={(e) => setFormData({ ...formData, fecha_hora: e.target.value })}
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
                      <SelectItem value="phonecall">Phonecall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_entrevistador">Nombre del entrevistador</Label>
                <Input
                  id="nombre_entrevistador"
                  value={formData.nombre_entrevistador}
                  onChange={(e) => setFormData({ ...formData, nombre_entrevistador: e.target.value })}
                  placeholder="María García"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="informacion_adicional">Información adicional</Label>
                <Textarea
                  id="informacion_adicional"
                  value={formData.informacion_adicional}
                  onChange={(e) => setFormData({ ...formData, informacion_adicional: e.target.value })}
                  placeholder="Enlace, preguntas previstas, temática..."
                  rows={3}
                />
              </div>
            </>
          )}

          {selectedTemplate === 'consulta' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto</Label>
                <Input
                  id="asunto"
                  value={formData.asunto}
                  onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                  placeholder="Asunto de la consulta"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion_contexto">Descripción / contexto</Label>
                <Textarea
                  id="descripcion_contexto"
                  value={formData.descripcion_contexto}
                  onChange={(e) => setFormData({ ...formData, descripcion_contexto: e.target.value })}
                  placeholder="Describe el contexto y detalles de la consulta"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="contacto">Contacto</Label>
                  <Input
                    id="contacto"
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                    placeholder="Persona de contacto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_respuesta">Tipo de respuesta</Label>
                <Select
                  value={formData.tipo_respuesta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_respuesta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de respuesta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="phonecall">Phonecall</SelectItem>
                    <SelectItem value="correo">Correo</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedTemplate === 'informacion' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tema_proyecto">Tema o proyecto</Label>
                <Input
                  id="tema_proyecto"
                  value={formData.tema_proyecto}
                  onChange={(e) => setFormData({ ...formData, tema_proyecto: e.target.value })}
                  placeholder="Nuevo álbum, gira, colaboración..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detalle_solicitado">Detalle de lo solicitado</Label>
                <Textarea
                  id="detalle_solicitado"
                  value={formData.detalle_solicitado}
                  onChange={(e) => setFormData({ ...formData, detalle_solicitado: e.target.value })}
                  placeholder="Qué información específica necesitan"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_respuesta">Tipo de respuesta</Label>
                <Select
                  value={formData.tipo_respuesta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_respuesta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de respuesta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="phonecall">Phonecall</SelectItem>
                    <SelectItem value="correo">Correo</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedTemplate === 'licencia' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tipo_licencia">Tipo de licencia</Label>
                <Select
                  value={formData.tipo_licencia}
                  onValueChange={(value) => setFormData({ ...formData, tipo_licencia: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de licencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="sampleo">Sampleo</SelectItem>
                    <SelectItem value="sincronia">Sincronía</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obra_licenciar">Obra a licenciar</Label>
                <Input
                  id="obra_licenciar"
                  value={formData.obra_licenciar}
                  onChange={(e) => setFormData({ ...formData, obra_licenciar: e.target.value })}
                  placeholder="Nombre de la canción/obra"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medio_proyecto">Medio o proyecto</Label>
                <Input
                  id="medio_proyecto"
                  value={formData.medio_proyecto}
                  onChange={(e) => setFormData({ ...formData, medio_proyecto: e.target.value })}
                  placeholder="Película, anuncio, serie, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="territorio">Territorio</Label>
                  <Input
                    id="territorio"
                    value={formData.territorio}
                    onChange={(e) => setFormData({ ...formData, territorio: e.target.value })}
                    placeholder="España, Mundial, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración</Label>
                  <Input
                    id="duracion"
                    value={formData.duracion}
                    onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                    placeholder="1 año, permanente, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa_artista_solicitante">Empresa o artista solicitante</Label>
                <Input
                  id="empresa_artista_solicitante"
                  value={formData.empresa_artista_solicitante}
                  onChange={(e) => setFormData({ ...formData, empresa_artista_solicitante: e.target.value })}
                  placeholder="Nombre de la empresa o artista"
                />
              </div>
            </>
          )}

          {selectedTemplate === 'otros' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto</Label>
                <Input
                  id="asunto"
                  value={formData.asunto}
                  onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                  placeholder="Asunto de la solicitud"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe la solicitud"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contacto">Contacto</Label>
                <Input
                  id="contacto"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  placeholder="Persona de contacto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_respuesta">Tipo de respuesta</Label>
                <Select
                  value={formData.tipo_respuesta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_respuesta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de respuesta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="phonecall">Phonecall</SelectItem>
                    <SelectItem value="correo">Correo</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="observaciones">Comentarios de la solicitante</Label>
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