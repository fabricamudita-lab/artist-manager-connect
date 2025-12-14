import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { ContactSelector } from "@/components/ContactSelector";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  FileText, Check, ChevronRight, ChevronLeft, ClipboardCopy, Eye, 
  Building, User, Calendar, CreditCard, Scale, Users, Download
} from "lucide-react";
import jsPDF from "jspdf";
import {
  AgentData,
  PromoterData,
  ContractConditions,
  PaymentTerms,
  LegalClauses,
  DEFAULT_AGENT_DATA,
  DEFAULT_LEGAL_CLAUSES,
  generateContractDocument
} from "@/lib/contractTemplates";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import cityzenLogo from "@/assets/cityzen-logo.png";

type ContractGeneratorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfUrl?: string }) => void | Promise<void>;
  bookingData?: {
    artista?: string;
    ciudad?: string;
    venue?: string;
    fecha?: string;
    hora?: string;
    fee?: number;
    aforo?: number;
    duracion?: string;
    promotor?: string;
    formato?: string;
    festival_ciclo?: string;
  };
};

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'agent', title: 'Agente', description: 'Datos del agente/representante', icon: <Building className="h-5 w-5" /> },
  { id: 'promoter', title: 'Promotor', description: 'Selecciona o introduce datos del promotor', icon: <Users className="h-5 w-5" /> },
  { id: 'conditions', title: 'Condiciones', description: 'Detalles de la actuación', icon: <Calendar className="h-5 w-5" /> },
  { id: 'payment', title: 'Pago', description: 'Forma de pago', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'legal', title: 'Cláusulas', description: 'Condiciones legales', icon: <Scale className="h-5 w-5" /> },
  { id: 'preview', title: 'Vista Previa', description: 'Revisa y guarda el contrato', icon: <Eye className="h-5 w-5" /> }
];

const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  open,
  onOpenChange,
  onSave,
  bookingData,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [contractDate, setContractDate] = useState(format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es }));
  
  // Agent Data
  const [agentData, setAgentData] = useState<AgentData>(DEFAULT_AGENT_DATA);
  
  // Promoter Data
  const [promoterData, setPromoterData] = useState<PromoterData>({
    nombre: '',
    cif: '',
    direccion: '',
    representante: '',
    cargo: ''
  });
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  
  // Conditions
  const [conditions, setConditions] = useState<ContractConditions>({
    artista: '',
    ciudad: '',
    aforo: '',
    recinto: '',
    evento: '',
    billing: 'TBC',
    otrosArtistas: '',
    fechaAnuncio: 'TBC',
    fechaActuacion: '',
    duracion: '',
    montajePrueba: 'TBC',
    aperturaPuertas: 'TBC',
    inicioConcierto: '',
    curfew: 'TBC',
    cacheGarantizado: '',
    comisionAgencia: '10%',
    precioTickets: 'TBC',
    sponsors: '',
    riderTecnico: true,
    riderHospitalidad: 'Catering de cortesía',
    hoteles: false,
    transporteInterno: false,
    vuelos: false,
    backline: true
  });
  
  // Payment
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>({
    tipo: 'post-concierto',
    primerPagoPorcentaje: 50,
    primerPagoMomento: 'A la firma del contrato',
    segundoPagoPorcentaje: 50,
    segundoPagoMomento: 'El día hábil después de la actuación'
  });
  
  // Legal Clauses
  const [legalClauses, setLegalClauses] = useState<LegalClauses>(DEFAULT_LEGAL_CLAUSES);

  // Pre-fill from booking data
  useEffect(() => {
    if (bookingData) {
      setConditions(prev => ({
        ...prev,
        artista: bookingData.artista || prev.artista,
        ciudad: bookingData.ciudad || prev.ciudad,
        recinto: bookingData.venue || prev.recinto,
        aforo: bookingData.aforo?.toString() || prev.aforo,
        fechaActuacion: bookingData.fecha ? format(new Date(bookingData.fecha), "d 'de' MMMM 'de' yyyy", { locale: es }) : prev.fechaActuacion,
        inicioConcierto: bookingData.hora || prev.inicioConcierto,
        cacheGarantizado: bookingData.fee ? `${bookingData.fee.toLocaleString('es-ES')}€` : prev.cacheGarantizado,
        duracion: bookingData.duracion || prev.duracion,
        evento: bookingData.festival_ciclo || prev.evento,
      }));
    }
  }, [bookingData]);

  // Load promoter data from contact
  useEffect(() => {
    const loadContactData = async () => {
      if (!selectedContactId) return;
      
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', selectedContactId)
        .single();
      
      if (contact) {
        setPromoterData({
          contactId: contact.id,
          nombre: contact.company || contact.name,
          cif: contact.iban || '', // Use iban field for CIF if available
          direccion: `${contact.address || ''}, ${contact.city || ''}, ${contact.country || ''}`.replace(/^, |, $/g, ''),
          representante: contact.name,
          cargo: contact.role || ''
        });
      }
    };
    
    loadContactData();
  }, [selectedContactId]);

  const generateContract = () => {
    return generateContractDocument(
      agentData,
      promoterData,
      conditions,
      paymentTerms,
      legalClauses,
      contractDate
    );
  };

  const handleSave = async () => {
    const content = generateContract();
    if (onSave) {
      await onSave({ 
        title: `Contrato ${conditions.artista} - ${conditions.evento || conditions.ciudad}`, 
        content 
      });
    }
    toast({ description: "Contrato guardado correctamente" });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(0);
    setAgentData(DEFAULT_AGENT_DATA);
    setPromoterData({ nombre: '', cif: '', direccion: '', representante: '', cargo: '' });
    setSelectedContactId('');
    setConditions({
      artista: '', ciudad: '', aforo: '', recinto: '', evento: '', billing: 'TBC',
      otrosArtistas: '', fechaAnuncio: 'TBC', fechaActuacion: '', duracion: '',
      montajePrueba: 'TBC', aperturaPuertas: 'TBC', inicioConcierto: '', curfew: 'TBC',
      cacheGarantizado: '', comisionAgencia: '10%', precioTickets: 'TBC', sponsors: '',
      riderTecnico: true, riderHospitalidad: 'Catering de cortesía',
      hoteles: false, transporteInterno: false, vuelos: false, backline: true
    });
    setPaymentTerms({ tipo: 'post-concierto' });
    setLegalClauses(DEFAULT_LEGAL_CLAUSES);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateContract());
    toast({ description: "Contrato copiado al portapapeles" });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return agentData.nombre && agentData.cif;
      case 1: return promoterData.nombre && promoterData.representante;
      case 2: return conditions.artista && conditions.fechaActuacion && conditions.cacheGarantizado;
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  };

  const handleNext = () => currentStep < WIZARD_STEPS.length - 1 && setCurrentStep(prev => prev + 1);
  const handleBack = () => currentStep > 0 && setCurrentStep(prev => prev - 1);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6 overflow-x-auto pb-2">
      {WIZARD_STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => index < currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-sm",
              index === currentStep && "bg-primary text-primary-foreground",
              index < currentStep && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
              index > currentStep && "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs">
              {index < currentStep ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}
            </span>
            <span className="hidden lg:inline">{step.title}</span>
          </button>
          {index < WIZARD_STEPS.length - 1 && (
            <ChevronRight className={cn("h-4 w-4 mx-1", index < currentStep ? "text-primary" : "text-muted-foreground")} />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Agent Data
  const renderAgentStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre de la Sociedad *</Label>
          <Input value={agentData.nombre} onChange={e => setAgentData({ ...agentData, nombre: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>CIF *</Label>
          <Input value={agentData.cif} onChange={e => setAgentData({ ...agentData, cif: e.target.value })} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Dirección</Label>
          <Input value={agentData.direccion} onChange={e => setAgentData({ ...agentData, direccion: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Representante</Label>
          <Input value={agentData.representante} onChange={e => setAgentData({ ...agentData, representante: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Fecha del Contrato</Label>
          <Input value={contractDate} onChange={e => setContractDate(e.target.value)} />
        </div>
      </div>
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">Datos Bancarios</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input value={agentData.banco} onChange={e => setAgentData({ ...agentData, banco: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>IBAN</Label>
            <Input value={agentData.iban} onChange={e => setAgentData({ ...agentData, iban: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: Promoter Data
  const renderPromoterStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Seleccionar de Contactos</Label>
        <ContactSelector 
          value={selectedContactId} 
          onValueChange={setSelectedContactId}
          placeholder="Buscar promotor en contactos..."
        />
      </div>
      
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">O introducir manualmente</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre/Empresa *</Label>
          <Input value={promoterData.nombre} onChange={e => setPromoterData({ ...promoterData, nombre: e.target.value })} placeholder="Nombre de la empresa o entidad" />
        </div>
        <div className="space-y-2">
          <Label>CIF</Label>
          <Input value={promoterData.cif} onChange={e => setPromoterData({ ...promoterData, cif: e.target.value })} placeholder="CIF de la empresa" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Dirección</Label>
          <Input value={promoterData.direccion} onChange={e => setPromoterData({ ...promoterData, direccion: e.target.value })} placeholder="Dirección completa" />
        </div>
        <div className="space-y-2">
          <Label>Representante Legal *</Label>
          <Input value={promoterData.representante} onChange={e => setPromoterData({ ...promoterData, representante: e.target.value })} placeholder="Nombre del representante" />
        </div>
        <div className="space-y-2">
          <Label>Cargo</Label>
          <Input value={promoterData.cargo} onChange={e => setPromoterData({ ...promoterData, cargo: e.target.value })} placeholder="Ej: Alcalde, Director..." />
        </div>
      </div>
    </div>
  );

  // Step 3: Conditions
  const renderConditionsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Artista *</Label>
          <Input value={conditions.artista} onChange={e => setConditions({ ...conditions, artista: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Ciudad</Label>
          <Input value={conditions.ciudad} onChange={e => setConditions({ ...conditions, ciudad: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Aforo</Label>
          <Input value={conditions.aforo} onChange={e => setConditions({ ...conditions, aforo: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Recinto</Label>
          <Input value={conditions.recinto} onChange={e => setConditions({ ...conditions, recinto: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Evento/Festival</Label>
          <Input value={conditions.evento} onChange={e => setConditions({ ...conditions, evento: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Billing</Label>
          <Input value={conditions.billing} onChange={e => setConditions({ ...conditions, billing: e.target.value })} placeholder="HEADLINER, TBC..." />
        </div>
        <div className="space-y-2">
          <Label>Otros Artistas/DJs</Label>
          <Input value={conditions.otrosArtistas} onChange={e => setConditions({ ...conditions, otrosArtistas: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Fecha Anuncio</Label>
          <Input value={conditions.fechaAnuncio} onChange={e => setConditions({ ...conditions, fechaAnuncio: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Fecha Actuación *</Label>
          <Input value={conditions.fechaActuacion} onChange={e => setConditions({ ...conditions, fechaActuacion: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Duración</Label>
          <Input value={conditions.duracion} onChange={e => setConditions({ ...conditions, duracion: e.target.value })} placeholder="70-90 min" />
        </div>
        <div className="space-y-2">
          <Label>Inicio Concierto</Label>
          <Input value={conditions.inicioConcierto} onChange={e => setConditions({ ...conditions, inicioConcierto: e.target.value })} placeholder="22:00" />
        </div>
        <div className="space-y-2">
          <Label>Curfew</Label>
          <Input value={conditions.curfew} onChange={e => setConditions({ ...conditions, curfew: e.target.value })} />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Económico</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Caché Garantizado *</Label>
            <Input value={conditions.cacheGarantizado} onChange={e => setConditions({ ...conditions, cacheGarantizado: e.target.value })} placeholder="12.000€ + IVA" />
          </div>
          <div className="space-y-2">
            <Label>Comisión Agencia</Label>
            <Input value={conditions.comisionAgencia} onChange={e => setConditions({ ...conditions, comisionAgencia: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Precio Tickets</Label>
            <Input value={conditions.precioTickets} onChange={e => setConditions({ ...conditions, precioTickets: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Riders y Logística</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'riderTecnico', label: 'Rider Técnico' },
            { key: 'backline', label: 'Backline' },
            { key: 'hoteles', label: 'Hoteles' },
            { key: 'transporteInterno', label: 'Transporte Interno' },
            { key: 'vuelos', label: 'Vuelos' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <Label>{item.label}</Label>
              <Switch 
                checked={conditions[item.key as keyof ContractConditions] as boolean} 
                onCheckedChange={checked => setConditions({ ...conditions, [item.key]: checked })} 
              />
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <Label>Rider Hospitalidad</Label>
          <Input value={conditions.riderHospitalidad} onChange={e => setConditions({ ...conditions, riderHospitalidad: e.target.value })} />
        </div>
        <div className="mt-4 space-y-2">
          <Label>Sponsors</Label>
          <Textarea value={conditions.sponsors} onChange={e => setConditions({ ...conditions, sponsors: e.target.value })} rows={2} placeholder="Condiciones de patrocinios..." />
        </div>
      </div>
    </div>
  );

  // Step 4: Payment
  const renderPaymentStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Pago</Label>
        <Select value={paymentTerms.tipo} onValueChange={v => setPaymentTerms({ ...paymentTerms, tipo: v as PaymentTerms['tipo'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="post-concierto">100% después del concierto</SelectItem>
            <SelectItem value="50-50">50% firma + 50% post-actuación</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paymentTerms.tipo === 'personalizado' && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primer Pago (%)</Label>
              <Input type="number" value={paymentTerms.primerPagoPorcentaje || ''} onChange={e => setPaymentTerms({ ...paymentTerms, primerPagoPorcentaje: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Momento del Primer Pago</Label>
              <Input value={paymentTerms.primerPagoMomento || ''} onChange={e => setPaymentTerms({ ...paymentTerms, primerPagoMomento: e.target.value })} placeholder="A la firma del contrato" />
            </div>
            <div className="space-y-2">
              <Label>Segundo Pago (%)</Label>
              <Input type="number" value={paymentTerms.segundoPagoPorcentaje || ''} onChange={e => setPaymentTerms({ ...paymentTerms, segundoPagoPorcentaje: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Momento del Segundo Pago</Label>
              <Input value={paymentTerms.segundoPagoMomento || ''} onChange={e => setPaymentTerms({ ...paymentTerms, segundoPagoMomento: e.target.value })} placeholder="El día hábil después de la actuación" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condiciones Adicionales</Label>
            <Textarea value={paymentTerms.condicionesAdicionales || ''} onChange={e => setPaymentTerms({ ...paymentTerms, condicionesAdicionales: e.target.value })} rows={2} />
          </div>
        </div>
      )}
    </div>
  );

  // Step 5: Legal Clauses
  const renderLegalStep = () => (
    <div className="space-y-4">
      {[
        { key: 'propiedadIntelectual', label: '1. Propiedad Intelectual' },
        { key: 'grabaciones', label: '1.2 Grabaciones' },
        { key: 'publicidad', label: '2. Publicidad' },
        { key: 'patrocinios', label: '2.2 Patrocinios' },
        { key: 'merchandising', label: '2.3 Entrevistas y promoción' },
        { key: 'recinto', label: '3. Recinto, escenario y camerinos' },
        { key: 'riders', label: '4. Riders técnico y hospitality' },
        { key: 'obligaciones', label: '5. Otras obligaciones' },
        { key: 'cancelacion', label: '5.2 Cancelación' },
        { key: 'fuerzaMayor', label: '5.3 Fuerza Mayor' },
        { key: 'confidencialidad', label: '7. Confidencialidad' },
        { key: 'jurisdiccion', label: '8. Ley y Jurisdicción' },
      ].map(item => (
        <div key={item.key} className="space-y-2">
          <Label>{item.label}</Label>
          <Textarea 
            value={legalClauses[item.key as keyof LegalClauses]} 
            onChange={e => setLegalClauses({ ...legalClauses, [item.key]: e.target.value })} 
            rows={3}
            className="text-sm"
          />
        </div>
      ))}
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => setLegalClauses(DEFAULT_LEGAL_CLAUSES)}
        className="w-full"
      >
        Restaurar Cláusulas Predeterminadas
      </Button>
    </div>
  );

  const downloadPDF = async () => {
    const content = generateContract();
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 5;
    
    // Add logo to first page
    const addLogo = () => {
      try {
        const logoWidth = 40;
        const logoHeight = 15;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(cityzenLogo, 'PNG', logoX, 10, logoWidth, logoHeight);
        return 30; // Return starting Y position after logo
      } catch {
        return margin;
      }
    };
    
    let y = addLogo();
    let pageNumber = 1;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Clean content to remove problematic characters
    const cleanContent = content
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/…/g, '...')
      .replace(/\u00A0/g, ' ');
    
    const lines = doc.splitTextToSize(cleanContent, maxWidth);
    
    const addPageNumber = () => {
      doc.setFontSize(8);
      doc.text(String(pageNumber), pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.setFontSize(10);
    };
    
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - 20) {
        addPageNumber();
        doc.addPage();
        pageNumber++;
        // Add logo to each page
        y = addLogo();
      }
      
      // Check for section headers (numbered sections like "1.", "2.", etc. or all caps)
      const isSectionHeader = /^\d+\./.test(line.trim()) || 
        (line.length < 70 && line === line.toUpperCase() && line.trim().length > 0 && !line.includes('-'));
      
      if (isSectionHeader) {
        doc.setFont("helvetica", "bold");
        if (/^\d+\./.test(line.trim()) && !line.includes('.1') && !line.includes('.2') && !line.includes('.3')) {
          y += 3; // Add extra spacing before main sections
        }
      } else {
        doc.setFont("helvetica", "normal");
      }
      
      doc.text(line, margin, y);
      y += lineHeight;
    });
    
    // Add page number to last page
    addPageNumber();
    
    const fileName = `Contrato_${conditions.artista.replace(/\s+/g, "_")}_${conditions.evento || conditions.ciudad || "booking"}.pdf`;
    doc.save(fileName);
    toast({ description: "PDF descargado correctamente" });
  };

  // Step 6: Preview
  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
          {generateContract()}
        </pre>
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={copyToClipboard}>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          Copiar al portapapeles
        </Button>
        <Button variant="outline" onClick={downloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          Descargar PDF
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderAgentStep();
      case 1: return renderPromoterStep();
      case 2: return renderConditionsStep();
      case 3: return renderPaymentStep();
      case 4: return renderLegalStep();
      case 5: return renderPreviewStep();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => { onOpenChange(isOpen); if (!isOpen) resetForm(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Generador de Contratos
          </DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {WIZARD_STEPS[currentStep].icon}
              {WIZARD_STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>{WIZARD_STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[50vh] overflow-y-auto">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={currentStep === 0 ? () => onOpenChange(false) : handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              <FileText className="h-4 w-4 mr-2" />
              Guardar Contrato
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ContractGenerator };
export default ContractGenerator;
