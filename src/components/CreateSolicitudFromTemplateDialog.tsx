import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Calendar, Mic, HelpCircle, Info, Scale, MoreHorizontal, Users, DollarSign, X, MapPin, UserCheck } from "lucide-react";
import { BookingStatusCombobox } from "@/components/BookingStatusCombobox";
import { TeamMemberSelector } from "@/components/TeamMemberSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { SingleArtistSelector } from "@/components/SingleArtistSelector";
import { ContactSelector } from "@/components/ContactSelector";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

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
  const [artistFormats, setArtistFormats] = useState<{ id: string; name: string }[]>([]);
  const [showNewFormatInput, setShowNewFormatInput] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({
    contact_id: '',
    artist_id: '',
    prioridad: 'media',
    observaciones: '',
  });

  // Fetch artist formats when artist changes
  useEffect(() => {
    const fetchArtistFormats = async () => {
      if (!formData.artist_id) {
        setArtistFormats([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('booking_products')
          .select('id, name')
          .eq('artist_id', formData.artist_id)
          .eq('is_active', true)
          .order('sort_order');
        
        if (error) throw error;
        setArtistFormats(data || []);
        
        // Reset format if current selection is not in new artist's formats
        if (formData.formato && data && !data.some(f => f.name === formData.formato)) {
          setFormData(prev => ({ ...prev, formato: '' }));
        }
      } catch (error) {
        console.error('Error fetching artist formats:', error);
        setArtistFormats([]);
      }
    };
    
    fetchArtistFormats();
  }, [formData.artist_id]);

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
        pais: '',
        lugar: '',
        direccion: '',
        capacidad: '',
        hora: '',
        fechas_opcionales: [] as string[],
        formato: '',
        // Buyer/Promotor
        promotor_tab: 'existing' as 'existing' | 'new',
        promotor_contact_id: '',
        new_promotor: {
          name: '',
          company: '',
          email: '',
          phone: '',
        },
        // Deal info
        deal_type: 'flat_fee' as 'flat_fee' | 'door_split',
        fee: '',
        door_split_percentage: '',
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

      // Establecer fecha límite según prioridad seleccionada
      const priorityDays: Record<string, number> = { urgente: 1, alta: 3, media: 7, baja: 14 };
      const selectedPriority = (formData.prioridad || 'media').toLowerCase();
      const daysToAdd = priorityDays[selectedPriority] ?? 7;
      solicitudData.fecha_limite_respuesta = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      // Add template-specific fields to descripcion_libre as structured text
      let descripcionLibre = `Solicitud de ${template?.title}\n`;
      const prioridadLabelMap: Record<string, string> = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
      const prioridadLabel = prioridadLabelMap[(formData.prioridad || 'media').toLowerCase()] || 'Media';
      descripcionLibre += `Prioridad: ${prioridadLabel}\n\n`;
      if (selectedTemplate === 'booking') {
        // Create promotor contact if needed
        let promotorContactId = formData.promotor_contact_id || null;
        if (formData.promotor_tab === 'new' && formData.new_promotor?.name) {
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              name: formData.new_promotor.name,
              company: formData.new_promotor.company,
              email: formData.new_promotor.email,
              phone: formData.new_promotor.phone,
              category: 'promotor',
              created_by: profile?.user_id,
            })
            .select()
            .single();
          if (!contactError && newContact) {
            promotorContactId = newContact.id;
          }
        }

        descripcionLibre += `Fecha: ${formData.fecha || 'No especificada'}\n`;
        descripcionLibre += `Festival / Ciclo: ${formData.festival_ciclo || 'No especificado'}\n`;
        descripcionLibre += `Ciudad: ${formData.ciudad || 'No especificada'}\n`;
        descripcionLibre += `País: ${formData.pais || 'No especificado'}\n`;
        descripcionLibre += `Venue: ${formData.lugar || 'No especificado'}\n`;
        descripcionLibre += `Dirección: ${formData.direccion || 'No especificada'}\n`;
        descripcionLibre += `Capacidad: ${formData.capacidad || 'No especificada'}\n`;
        descripcionLibre += `Hora: ${formData.hora || 'No especificada'}\n`;
        descripcionLibre += `Formato: ${formData.formato || 'No especificado'}\n`;
        descripcionLibre += `Estado Booking: ${formData.booking_status || 'interest'}\n`;
        descripcionLibre += `Deal Type: ${formData.deal_type === 'flat_fee' ? 'Fee Fijo' : 'Door Split'}\n`;
        if (formData.deal_type === 'flat_fee') {
          descripcionLibre += `Fee: ${formData.fee ? `€${formData.fee}` : 'No especificado'}\n`;
        } else {
          descripcionLibre += `Door Split: ${formData.door_split_percentage || 'No especificado'}%\n`;
        }
        descripcionLibre += `Condiciones: ${formData.condiciones || 'No especificadas'}\n`;
        descripcionLibre += `Comentarios: ${formData.comentarios || 'No especificados'}\n`;
        
        // Map to existing fields where possible
        solicitudData.nombre_festival = formData.festival_ciclo || null;
        solicitudData.ciudad = formData.ciudad || null;
        solicitudData.pais = formData.pais || null;
        solicitudData.lugar_concierto = formData.lugar || null;
        solicitudData.direccion = formData.direccion || null;
        solicitudData.capacidad = formData.capacidad ? parseInt(formData.capacidad) : null;
        solicitudData.hora_show = formData.fecha && formData.hora ? new Date(formData.fecha + 'T' + formData.hora).toISOString() : null;
        solicitudData.formato = formData.formato || null;
        solicitudData.fechas_opcionales = formData.fechas_opcionales?.length > 0 
          ? formData.fechas_opcionales.filter((f: string) => f) 
          : null;
        solicitudData.promotor_contact_id = promotorContactId;
        solicitudData.deal_type = formData.deal_type;
        solicitudData.fee = formData.deal_type === 'flat_fee' && formData.fee ? parseFloat(formData.fee) : null;
        solicitudData.door_split_percentage = formData.deal_type === 'door_split' && formData.door_split_percentage 
          ? parseFloat(formData.door_split_percentage) 
          : null;
        solicitudData.condiciones = formData.condiciones || null;
        // Save booking status and required approvers
        (solicitudData as any).booking_status = formData.booking_status || 'interest';
        (solicitudData as any).required_approvers = formData.required_approvers || [];
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

      // For booking requests, create the booking_offer first and link it
      if (selectedTemplate === 'booking') {
        // Map booking_status to phase
        const statusToPhase: Record<string, string> = {
          'interest': 'interes',
          'offer': 'oferta',
          'confirmed': 'confirmado'
        };
        const phase = statusToPhase[formData.booking_status || 'interest'] || 'interes';

        // Create booking offer
        const bookingOfferData = {
          artist_id: formData.artist_id,
          festival_ciclo: formData.festival_ciclo || null,
          ciudad: formData.ciudad || null,
          pais: formData.pais || null,
          lugar: formData.lugar || null,
          venue: formData.direccion || null,
          capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
          fecha: formData.fecha || null,
          hora: formData.hora || null,
          formato: formData.formato || null,
          fee: formData.deal_type === 'flat_fee' && formData.fee ? parseFloat(formData.fee) : null,
          condiciones: formData.condiciones || null,
          info_comentarios: formData.comentarios || null,
          estado: 'pendiente',
          phase: phase,
          created_by: profile?.user_id,
        };

        const { data: bookingOffer, error: bookingError } = await supabase
          .from('booking_offers')
          .insert([bookingOfferData])
          .select('id')
          .single();

        if (bookingError) throw bookingError;

        // Link booking offer to solicitud
        (solicitudData as any).booking_id = bookingOffer.id;
      }

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
                <SelectItem value="baja">
                  <span className="inline-flex items-center gap-1">
                    <span>🟢 Baja</span>
                    <span className="text-muted-foreground">— 14 días</span>
                  </span>
                </SelectItem>
                <SelectItem value="media">
                  <span className="inline-flex items-center gap-1">
                    <span>🟡 Media</span>
                    <span className="text-muted-foreground">— 7 días</span>
                  </span>
                </SelectItem>
                <SelectItem value="alta">
                  <span className="inline-flex items-center gap-1">
                    <span>🟠 Alta</span>
                    <span className="text-muted-foreground">— 3 días</span>
                  </span>
                </SelectItem>
                <SelectItem value="urgente">
                  <span className="inline-flex items-center gap-1">
                    <span>🔴 Urgente</span>
                    <span className="text-muted-foreground">— 1 día</span>
                  </span>
                </SelectItem>
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
            <div className="space-y-6">
              {/* Sección 1: Datos Generales */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Datos Generales
                  </CardTitle>
                  <CardDescription className="text-sm">Información básica del evento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="festival_ciclo">Nombre del Evento / Festival</Label>
                      <Input
                        id="festival_ciclo"
                        value={formData.festival_ciclo}
                        onChange={(e) => setFormData({ ...formData, festival_ciclo: e.target.value })}
                        placeholder="Ej: Primavera Sound 2025"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lugar">Venue <span className="text-destructive">*</span></Label>
                      <Input
                        id="lugar"
                        value={formData.lugar}
                        onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                        placeholder="Ej: Sala Apolo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ciudad">Ciudad</Label>
                      <Input
                        id="ciudad"
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        placeholder="Ej: Barcelona"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pais">País</Label>
                      <Input
                        id="pais"
                        value={formData.pais}
                        onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                        placeholder="Ej: España"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="direccion">Dirección</Label>
                      <AddressAutocomplete
                        value={formData.direccion || ''}
                        onChange={(value) => setFormData((prev) => ({ ...prev, direccion: value }))}
                        venue={formData.lugar}
                        city={formData.ciudad}
                        country={formData.pais}
                        placeholder="Buscar dirección..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha <span className="text-destructive">*</span></Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
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
                      <Label htmlFor="capacidad">Capacidad</Label>
                      <Input
                        id="capacidad"
                        type="number"
                        value={formData.capacidad}
                        onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                        placeholder="Ej: 1500"
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
                        onClick={() => setFormData({
                          ...formData,
                          fechas_opcionales: [...(formData.fechas_opcionales || []), '']
                        })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Añadir fecha
                      </Button>
                    </div>
                    {(formData.fechas_opcionales || []).map((fecha: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="date"
                          value={fecha}
                          onChange={(e) => {
                            const newFechas = [...(formData.fechas_opcionales || [])];
                            newFechas[index] = e.target.value;
                            setFormData({ ...formData, fechas_opcionales: newFechas });
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newFechas = (formData.fechas_opcionales || []).filter((_: string, i: number) => i !== index);
                            setFormData({ ...formData, fechas_opcionales: newFechas });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sección 2: Buyer / Promotor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Buyer / Promotor
                  </CardTitle>
                  <CardDescription className="text-sm">Selecciona o crea el promotor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs 
                    value={formData.promotor_tab || 'existing'} 
                    onValueChange={(v) => setFormData({ ...formData, promotor_tab: v as 'existing' | 'new' })}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="existing">Contacto Existente</TabsTrigger>
                      <TabsTrigger value="new">Crear Nuevo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="existing" className="mt-4">
                      <div className="space-y-2">
                        <Label>Seleccionar Promotor/Buyer</Label>
                        <ContactSelector
                          value={formData.promotor_contact_id || ''}
                          onValueChange={(value) => setFormData({ ...formData, promotor_contact_id: value })}
                          placeholder="Buscar contacto..."
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="new" className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre <span className="text-destructive">*</span></Label>
                          <Input
                            value={formData.new_promotor?.name || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), name: e.target.value }
                            })}
                            placeholder="Nombre del contacto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Empresa</Label>
                          <Input
                            value={formData.new_promotor?.company || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), company: e.target.value }
                            })}
                            placeholder="Nombre de la promotora"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={formData.new_promotor?.email || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), email: e.target.value }
                            })}
                            placeholder="email@promotora.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            value={formData.new_promotor?.phone || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              new_promotor: { ...(formData.new_promotor || {}), phone: e.target.value }
                            })}
                            placeholder="+34 600 000 000"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Sección 3: Deal Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4" />
                    Deal Info
                  </CardTitle>
                  <CardDescription className="text-sm">Condiciones económicas del evento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Tipo de Deal</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deal_type: 'flat_fee' })}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.deal_type === 'flat_fee' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium">Fee Fijo</div>
                        <div className="text-sm text-muted-foreground">Caché garantizado</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deal_type: 'door_split' })}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.deal_type === 'door_split' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium">Door Split</div>
                        <div className="text-sm text-muted-foreground">Porcentaje de taquilla</div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {formData.deal_type === 'flat_fee' ? (
                      <div className="space-y-2">
                        <Label htmlFor="fee">Fee (€)</Label>
                        <Input
                          id="fee"
                          type="number"
                          value={formData.fee || ''}
                          onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                          placeholder="5000"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="door_split_percentage">Porcentaje (%)</Label>
                        <Input
                          id="door_split_percentage"
                          type="number"
                          value={formData.door_split_percentage || ''}
                          onChange={(e) => setFormData({ ...formData, door_split_percentage: e.target.value })}
                          placeholder="80"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="formato">Formato</Label>
                      {showNewFormatInput ? (
                        <div className="flex gap-2">
                          <Input
                            id="new_formato"
                            value={newFormatName}
                            onChange={(e) => setNewFormatName(e.target.value)}
                            placeholder="Nombre del nuevo formato"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (newFormatName.trim()) {
                                setFormData({ ...formData, formato: newFormatName.trim() });
                                setNewFormatName('');
                                setShowNewFormatInput(false);
                              }
                            }}
                          >
                            Añadir
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewFormatName('');
                              setShowNewFormatInput(false);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Select
                          value={formData.formato || ''}
                          onValueChange={(value) => {
                            if (value === '__new__') {
                              setShowNewFormatInput(true);
                            } else {
                              setFormData({ ...formData, formato: value });
                            }
                          }}
                          disabled={!formData.artist_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !formData.artist_id 
                                ? "Selecciona primero un artista" 
                                : artistFormats.length === 0 
                                  ? "Sin formatos - añade uno nuevo"
                                  : "Seleccionar formato"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {artistFormats.map((format) => (
                              <SelectItem key={format.id} value={format.name}>
                                {format.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="__new__" className="text-primary">
                              <span className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Nuevo formato
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condiciones">Condiciones</Label>
                    <Textarea
                      id="condiciones"
                      value={formData.condiciones || ''}
                      onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                      placeholder="Backline, alojamiento, transporte, rider..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comentarios">Comentarios del solicitante</Label>
                    <Textarea
                      id="comentarios"
                      value={formData.comentarios || ''}
                      onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                      placeholder="Notas adicionales sobre la solicitud"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sección 4: Estado y Aprobadores */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCheck className="h-4 w-4" />
                    Estado y Aprobación
                  </CardTitle>
                  <CardDescription className="text-sm">Estado del booking y aprobadores requeridos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking_status">Estado del Booking</Label>
                    <BookingStatusCombobox
                      value={formData.booking_status || 'interest'}
                      onValueChange={(value) => setFormData({ ...formData, booking_status: value })}
                      placeholder="Selecciona el estado..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Si se aprueba la solicitud, el booking pasará a "confirmado". Si se deniega, pasará a "cancelado".
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Aprobadores Requeridos</Label>
                    <TeamMemberSelector
                      selectedMembers={formData.required_approvers || []}
                      onSelectionChange={(value) => setFormData({ ...formData, required_approvers: value })}
                      artistId={formData.artist_id}
                      placeholder={formData.artist_id ? "Selecciona los aprobadores del equipo..." : "Primero selecciona un artista"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si hay múltiples aprobadores, todos deben aprobar para que la solicitud se considere aprobada.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                      <SelectItem value="baja">
                        <span className="inline-flex items-center gap-1">
                          <span>🟢 Baja</span>
                          <span className="text-muted-foreground">— 14 días</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="media">
                        <span className="inline-flex items-center gap-1">
                          <span>🟡 Media</span>
                          <span className="text-muted-foreground">— 7 días</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="alta">
                        <span className="inline-flex items-center gap-1">
                          <span>🟠 Alta</span>
                          <span className="text-muted-foreground">— 3 días</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="urgente">
                        <span className="inline-flex items-center gap-1">
                          <span>🔴 Urgente</span>
                          <span className="text-muted-foreground">— 1 día</span>
                        </span>
                      </SelectItem>
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