import React, { useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Copy, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContractData {
  // Partes
  artistName: string;
  artistNIF: string;
  artistAddress: string;
  artistRepresentative: string;
  promoterName: string;
  promoterNIF: string;
  promoterAddress: string;
  promoterRepresentative: string;
  // Evento
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventCity: string;
  eventCapacity: string;
  // Condiciones
  fee: string;
  currency: string;
  paymentTerms: string;
  depositAmount: string;
  depositDate: string;
  // Técnicas
  soundcheck: string;
  doorsOpen: string;
  setDuration: string;
  // Extras
  catering: string;
  accommodation: string;
  transport: string;
  dressing: string;
  // Notas
  specialClauses: string;
}

interface ContractGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData?: Partial<ContractData>;
  onSave?: (contract: { title: string; content: string; pdfUrl?: string }) => void;
}

const CONTRACT_TEMPLATES = [
  { id: 'standard', name: 'Contrato Estándar', description: 'Contrato básico de actuación' },
  { id: 'festival', name: 'Festival / Evento Grande', description: 'Incluye cláusulas de exclusividad y riders' },
  { id: 'corporate', name: 'Evento Corporativo', description: 'Para eventos privados y empresas' },
  { id: 'residency', name: 'Residencia', description: 'Para múltiples actuaciones en un mismo venue' },
];

export function ContractGenerator({
  open,
  onOpenChange,
  bookingData,
  onSave,
}: ContractGeneratorProps) {
  const [step, setStep] = useState<'template' | 'data' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [contractData, setContractData] = useState<ContractData>({
    artistName: bookingData?.artistName || '',
    artistNIF: bookingData?.artistNIF || '',
    artistAddress: bookingData?.artistAddress || '',
    artistRepresentative: bookingData?.artistRepresentative || '',
    promoterName: bookingData?.promoterName || '',
    promoterNIF: bookingData?.promoterNIF || '',
    promoterAddress: bookingData?.promoterAddress || '',
    promoterRepresentative: bookingData?.promoterRepresentative || '',
    eventName: bookingData?.eventName || '',
    eventDate: bookingData?.eventDate || '',
    eventTime: bookingData?.eventTime || '',
    eventVenue: bookingData?.eventVenue || '',
    eventCity: bookingData?.eventCity || '',
    eventCapacity: bookingData?.eventCapacity || '',
    fee: bookingData?.fee || '',
    currency: bookingData?.currency || 'EUR',
    paymentTerms: bookingData?.paymentTerms || '30 días',
    depositAmount: bookingData?.depositAmount || '',
    depositDate: bookingData?.depositDate || '',
    soundcheck: bookingData?.soundcheck || '',
    doorsOpen: bookingData?.doorsOpen || '',
    setDuration: bookingData?.setDuration || '90 minutos',
    catering: bookingData?.catering || '',
    accommodation: bookingData?.accommodation || '',
    transport: bookingData?.transport || '',
    dressing: bookingData?.dressing || '',
    specialClauses: bookingData?.specialClauses || '',
  });

  const updateField = (field: keyof ContractData, value: string) => {
    setContractData(prev => ({ ...prev, [field]: value }));
  };

  const generateContractText = () => {
    const date = contractData.eventDate 
      ? format(new Date(contractData.eventDate), "d 'de' MMMM 'de' yyyy", { locale: es })
      : '[FECHA]';
    
    let text = `
CONTRATO DE ACTUACIÓN ARTÍSTICA

En ${contractData.eventCity || '[CIUDAD]'}, a ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}

REUNIDOS

De una parte, ${contractData.artistName || '[NOMBRE ARTISTA]'}, con NIF ${contractData.artistNIF || '[NIF]'}, y domicilio en ${contractData.artistAddress || '[DIRECCIÓN]'}, representado por ${contractData.artistRepresentative || '[REPRESENTANTE]'}, en adelante "EL ARTISTA".

De otra parte, ${contractData.promoterName || '[NOMBRE PROMOTOR]'}, con NIF ${contractData.promoterNIF || '[NIF]'}, y domicilio en ${contractData.promoterAddress || '[DIRECCIÓN]'}, representado por ${contractData.promoterRepresentative || '[REPRESENTANTE]'}, en adelante "EL PROMOTOR".

Ambas partes se reconocen mutuamente capacidad legal necesaria para celebrar el presente contrato y, a tal efecto,

EXPONEN

Que EL PROMOTOR está interesado en contratar la actuación de EL ARTISTA para el evento que se celebrará según las condiciones que se detallan a continuación.

ESTIPULACIONES

PRIMERA. OBJETO DEL CONTRATO
EL ARTISTA se compromete a realizar una actuación musical en vivo en el evento "${contractData.eventName || '[NOMBRE EVENTO]'}" organizado por EL PROMOTOR.

SEGUNDA. LUGAR, FECHA Y HORA
- Lugar: ${contractData.eventVenue || '[VENUE]'}, ${contractData.eventCity || '[CIUDAD]'}
- Fecha: ${date}
- Hora de actuación: ${contractData.eventTime || '[HORA]'}
- Duración del set: ${contractData.setDuration || '90 minutos'}
- Aforo máximo: ${contractData.eventCapacity || '[AFORO]'} personas

TERCERA. CONDICIONES TÉCNICAS
- Prueba de sonido: ${contractData.soundcheck || 'A determinar'}
- Apertura de puertas: ${contractData.doorsOpen || 'A determinar'}
EL PROMOTOR se compromete a proporcionar equipo de sonido e iluminación profesional según el rider técnico adjunto.

CUARTA. CONTRAPRESTACIÓN ECONÓMICA
Por la actuación objeto del presente contrato, EL PROMOTOR abonará a EL ARTISTA la cantidad de ${contractData.fee || '[IMPORTE]'} ${contractData.currency} (más IVA aplicable).

Forma de pago:
- Depósito: ${contractData.depositAmount || '50%'} antes del ${contractData.depositDate || '[FECHA]'}
- Resto: ${contractData.paymentTerms || 'El día de la actuación'}

QUINTA. HOSPITALIDAD
EL PROMOTOR proporcionará:
- Catering: ${contractData.catering || 'Según rider de hospitalidad'}
- Alojamiento: ${contractData.accommodation || 'No incluido'}
- Transporte: ${contractData.transport || 'No incluido'}
- Camerino: ${contractData.dressing || 'Camerino privado con las comodidades habituales'}

SEXTA. CANCELACIÓN
En caso de cancelación por parte de EL PROMOTOR con menos de 30 días de antelación, deberá abonar el 100% del caché acordado. Con más de 30 días, se devolverá el depósito menos los gastos ya incurridos.

En caso de cancelación por parte de EL ARTISTA, se devolverá íntegramente el depósito recibido.

SÉPTIMA. FUERZA MAYOR
Ninguna de las partes será responsable por el incumplimiento de sus obligaciones cuando este sea debido a causas de fuerza mayor (catástrofes naturales, pandemias, restricciones gubernamentales, etc.).

${contractData.specialClauses ? `OCTAVA. CLÁUSULAS ESPECIALES\n${contractData.specialClauses}\n` : ''}

NOVENA. JURISDICCIÓN
Para cualquier controversia que pudiera surgir en relación con el presente contrato, las partes se someten a los Juzgados y Tribunales de ${contractData.eventCity || '[CIUDAD]'}, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.

Y en prueba de conformidad, las partes firman el presente contrato por duplicado, en el lugar y fecha indicados al inicio.



_________________________                    _________________________
EL ARTISTA                                   EL PROMOTOR
${contractData.artistRepresentative || ''}                                   ${contractData.promoterRepresentative || ''}
`;

    return text;
  };

  const generatePDF = (preview: boolean = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRATO DE ACTUACIÓN ARTÍSTICA', pageWidth / 2, 25, { align: 'center' });
    
    // Content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const text = generateContractText();
    const lines = doc.splitTextToSize(text.trim(), maxWidth);
    
    let y = 40;
    const lineHeight = 5;
    
    lines.forEach((line: string) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      
      // Bold for headers
      if (line.match(/^(REUNIDOS|EXPONEN|ESTIPULACIONES|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA)/)) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      
      doc.text(line, margin, y);
      y += lineHeight;
    });
    
    const fileName = `Contrato_${contractData.artistName || 'Artista'}_${contractData.eventDate || 'fecha'}.pdf`;
    
    if (preview) {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } else {
      doc.save(fileName);
      toast.success('Contrato descargado correctamente');
      if (onSave) {
        onSave({
          title: `Contrato - ${contractData.eventName || contractData.artistName}`,
          content: generateContractText(),
        });
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateContractText());
    toast.success('Contrato copiado al portapapeles');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generador de Contratos
            <Badge variant="outline" className="ml-2">
              {step === 'template' && 'Paso 1: Plantilla'}
              {step === 'data' && 'Paso 2: Datos'}
              {step === 'preview' && 'Paso 3: Vista previa'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 h-[calc(90vh-180px)] pr-4">
          {step === 'template' && (
            <div className="grid gap-4 py-4">
              <p className="text-muted-foreground">
                Selecciona el tipo de contrato que necesitas generar:
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {CONTRACT_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 'data' && (
            <div className="grid gap-6 py-4">
              {/* Artista */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge>1</Badge> Datos del Artista
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre artístico / Razón social</Label>
                    <Input
                      value={contractData.artistName}
                      onChange={(e) => updateField('artistName', e.target.value)}
                      placeholder="Nombre del artista"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NIF / CIF</Label>
                    <Input
                      value={contractData.artistNIF}
                      onChange={(e) => updateField('artistNIF', e.target.value)}
                      placeholder="B12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                      value={contractData.artistAddress}
                      onChange={(e) => updateField('artistAddress', e.target.value)}
                      placeholder="Dirección fiscal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Representante</Label>
                    <Input
                      value={contractData.artistRepresentative}
                      onChange={(e) => updateField('artistRepresentative', e.target.value)}
                      placeholder="Nombre del representante"
                    />
                  </div>
                </div>
              </div>

              {/* Promotor */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge>2</Badge> Datos del Promotor
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre / Razón social</Label>
                    <Input
                      value={contractData.promoterName}
                      onChange={(e) => updateField('promoterName', e.target.value)}
                      placeholder="Nombre del promotor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NIF / CIF</Label>
                    <Input
                      value={contractData.promoterNIF}
                      onChange={(e) => updateField('promoterNIF', e.target.value)}
                      placeholder="B87654321"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                      value={contractData.promoterAddress}
                      onChange={(e) => updateField('promoterAddress', e.target.value)}
                      placeholder="Dirección fiscal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Representante</Label>
                    <Input
                      value={contractData.promoterRepresentative}
                      onChange={(e) => updateField('promoterRepresentative', e.target.value)}
                      placeholder="Nombre del representante"
                    />
                  </div>
                </div>
              </div>

              {/* Evento */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge>3</Badge> Datos del Evento
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre del evento</Label>
                    <Input
                      value={contractData.eventName}
                      onChange={(e) => updateField('eventName', e.target.value)}
                      placeholder="Festival / Concierto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={contractData.eventDate}
                      onChange={(e) => updateField('eventDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de actuación</Label>
                    <Input
                      type="time"
                      value={contractData.eventTime}
                      onChange={(e) => updateField('eventTime', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue / Recinto</Label>
                    <Input
                      value={contractData.eventVenue}
                      onChange={(e) => updateField('eventVenue', e.target.value)}
                      placeholder="Nombre del venue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={contractData.eventCity}
                      onChange={(e) => updateField('eventCity', e.target.value)}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aforo</Label>
                    <Input
                      value={contractData.eventCapacity}
                      onChange={(e) => updateField('eventCapacity', e.target.value)}
                      placeholder="1500"
                    />
                  </div>
                </div>
              </div>

              {/* Económicas */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge>4</Badge> Condiciones Económicas
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Caché / Fee</Label>
                    <Input
                      value={contractData.fee}
                      onChange={(e) => updateField('fee', e.target.value)}
                      placeholder="5.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={contractData.currency} onValueChange={(v) => updateField('currency', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Depósito (%)</Label>
                    <Input
                      value={contractData.depositAmount}
                      onChange={(e) => updateField('depositAmount', e.target.value)}
                      placeholder="50%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha límite depósito</Label>
                    <Input
                      type="date"
                      value={contractData.depositDate}
                      onChange={(e) => updateField('depositDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Técnicas */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge>5</Badge> Condiciones Técnicas
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Hora soundcheck</Label>
                    <Input
                      type="time"
                      value={contractData.soundcheck}
                      onChange={(e) => updateField('soundcheck', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apertura puertas</Label>
                    <Input
                      type="time"
                      value={contractData.doorsOpen}
                      onChange={(e) => updateField('doorsOpen', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duración del set</Label>
                    <Input
                      value={contractData.setDuration}
                      onChange={(e) => updateField('setDuration', e.target.value)}
                      placeholder="90 minutos"
                    />
                  </div>
                </div>
              </div>

              {/* Hospitalidad */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge>6</Badge> Hospitalidad
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Catering</Label>
                    <Input
                      value={contractData.catering}
                      onChange={(e) => updateField('catering', e.target.value)}
                      placeholder="Según rider"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alojamiento</Label>
                    <Input
                      value={contractData.accommodation}
                      onChange={(e) => updateField('accommodation', e.target.value)}
                      placeholder="Hotel 4* x2 noches"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transporte</Label>
                    <Input
                      value={contractData.transport}
                      onChange={(e) => updateField('transport', e.target.value)}
                      placeholder="Vuelos + transfers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Camerino</Label>
                    <Input
                      value={contractData.dressing}
                      onChange={(e) => updateField('dressing', e.target.value)}
                      placeholder="Camerino privado"
                    />
                  </div>
                </div>
              </div>

              {/* Cláusulas especiales */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge>7</Badge> Cláusulas Especiales (opcional)
                </h3>
                <Textarea
                  value={contractData.specialClauses}
                  onChange={(e) => updateField('specialClauses', e.target.value)}
                  placeholder="Añade cláusulas adicionales específicas para este contrato..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="py-4">
              <div className="bg-muted/50 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {generateContractText()}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 pt-4 border-t">
          {step !== 'template' && (
            <Button variant="outline" onClick={() => setStep(step === 'preview' ? 'data' : 'template')}>
              Anterior
            </Button>
          )}
          
          {step === 'template' && (
            <Button onClick={() => setStep('data')}>
              Continuar
            </Button>
          )}
          
          {step === 'data' && (
            <Button onClick={() => setStep('preview')}>
              <Eye className="h-4 w-4 mr-2" />
              Vista previa
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar texto
              </Button>
              <Button variant="outline" onClick={() => generatePDF(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver PDF
              </Button>
              <Button onClick={() => generatePDF(false)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
