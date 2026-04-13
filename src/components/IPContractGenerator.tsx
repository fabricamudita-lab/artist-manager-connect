import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Building, User, Music, Scale, CreditCard, Eye,
  Check, ChevronRight, ChevronLeft, Download, ClipboardCopy, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  IPContractData,
  DEFAULT_IP_CONTRACT_DATA,
  generateIPContractContent,
  generateIPContractPDF,
} from '@/lib/ipContractTemplate';

interface IPContractGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfUrl?: string }) => void | Promise<void>;
}

interface WizardStep {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const STEPS: WizardStep[] = [
  { id: 'label', title: 'Label', icon: <Building className="h-5 w-5" /> },
  { id: 'artist', title: 'Artista', icon: <User className="h-5 w-5" /> },
  { id: 'master', title: 'Master / Track', icon: <Music className="h-5 w-5" /> },
  { id: 'rights', title: 'Derechos', icon: <Scale className="h-5 w-5" /> },
  { id: 'compensation', title: 'Compensación', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'preview', title: 'Vista Previa', icon: <Eye className="h-5 w-5" /> },
];

export const IPContractGenerator: React.FC<IPContractGeneratorProps> = ({
  open,
  onOpenChange,
  onSave,
}) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IPContractData>({ ...DEFAULT_IP_CONTRACT_DATA });

  const set = <K extends keyof IPContractData>(key: K, value: IPContractData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const handleNext = () => step < STEPS.length - 1 && setStep(s => s + 1);
  const handleBack = () => step > 0 && setStep(s => s - 1);

  const handleDownloadPDF = () => {
    const doc = generateIPContractPDF(data);
    doc.save(`IP_Contract_${data.artistProfessionalName || 'draft'}.pdf`);
    toast.success('PDF descargado');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateIPContractContent(data));
    toast.success('Copiado al portapapeles');
  };

  const handleSave = async () => {
    const content = generateIPContractContent(data);
    if (onSave) {
      await onSave({
        title: `IP Contract — ${data.artistProfessionalName || data.artistFullName || 'Draft'}`,
        content,
      });
    }
    toast.success('Contrato guardado');
    onOpenChange(false);
    setStep(0);
    setData({ ...DEFAULT_IP_CONTRACT_DATA });
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6 overflow-x-auto pb-2">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <button
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-sm',
              i === step && 'bg-primary text-primary-foreground',
              i < step && 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30',
              i > step && 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs">
              {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
            </span>
            <span className="hidden lg:inline">{s.title}</span>
          </button>
          {i < STEPS.length - 1 && (
            <ChevronRight className={cn('h-4 w-4 mx-1', i < step ? 'text-primary' : 'text-muted-foreground')} />
          )}
        </div>
      ))}
    </div>
  );

  // ---------- STEPS ----------

  const renderLabelStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Datos del Sello / Label</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre del Sello *</Label>
          <Input value={data.labelName} onChange={e => set('labelName', e.target.value)} placeholder="ALERTA TROMBÓN, S.L.U." />
        </div>
        <div className="space-y-2">
          <Label>CIF / Tax ID *</Label>
          <Input value={data.labelTaxId} onChange={e => set('labelTaxId', e.target.value)} placeholder="B-75286443" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Dirección</Label>
          <Input value={data.labelAddress} onChange={e => set('labelAddress', e.target.value)} placeholder="C/ Miquel Borotau, 11, 08340 Vilassar de Mar, Barcelona, Spain" />
        </div>
        <div className="space-y-2">
          <Label>Representante Legal</Label>
          <Input value={data.labelRepresentative} onChange={e => set('labelRepresentative', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Cargo</Label>
          <Input value={data.labelRepresentativeTitle} onChange={e => set('labelRepresentativeTitle', e.target.value)} placeholder="Managing Director" />
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Fecha de ejecución</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Día</Label>
            <Input value={data.executionDay} onChange={e => set('executionDay', e.target.value)} placeholder="15" />
          </div>
          <div className="space-y-2">
            <Label>Mes</Label>
            <Input value={data.executionMonth} onChange={e => set('executionMonth', e.target.value)} placeholder="April" />
          </div>
          <div className="space-y-2">
            <Label>Año</Label>
            <Input value={data.executionYear} onChange={e => set('executionYear', e.target.value)} placeholder="2026" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderArtistStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Featured Artist</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre completo *</Label>
          <Input value={data.artistFullName} onChange={e => set('artistFullName', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Nombre artístico *</Label>
          <Input value={data.artistProfessionalName} onChange={e => set('artistProfessionalName', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tipo de documento</Label>
          <Select value={data.artistIdType} onValueChange={v => set('artistIdType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DNI">DNI</SelectItem>
              <SelectItem value="NIE">NIE</SelectItem>
              <SelectItem value="PASSPORT">Pasaporte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Número de documento *</Label>
          <Input value={data.artistIdNumber} onChange={e => set('artistIdNumber', e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Dirección</Label>
          <Input value={data.artistAddress} onChange={e => set('artistAddress', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderMasterStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Álbum y Track</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Título del álbum *</Label>
          <Input value={data.albumTitle} onChange={e => set('albumTitle', e.target.value)} placeholder="De Camino al Camino" />
        </div>
        <div className="space-y-2">
          <Label>Artista principal del álbum *</Label>
          <Input value={data.albumArtistName} onChange={e => set('albumArtistName', e.target.value)} />
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Datos del Track</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título del track *</Label>
            <Input value={data.trackTitle} onChange={e => set('trackTitle', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contribución del artista</Label>
            <Input value={data.trackContribution} onChange={e => set('trackContribution', e.target.value)} placeholder="Vocals, Guitar..." />
          </div>
          <div className="space-y-2">
            <Label>Duración</Label>
            <Input value={data.trackDuration} onChange={e => set('trackDuration', e.target.value)} placeholder="3:45" />
          </div>
          <div className="space-y-2">
            <Label>Fecha de grabación</Label>
            <Input value={data.trackRecordingDate} onChange={e => set('trackRecordingDate', e.target.value)} placeholder="March 2026" />
          </div>
          <div className="space-y-2">
            <Label>Credit designation</Label>
            <Select value={data.trackCreditDesignation} onValueChange={v => set('trackCreditDesignation', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="main artist">Main Artist</SelectItem>
                <SelectItem value="featured artist">Featured Artist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={data.trackVideoParticipation} onCheckedChange={v => set('trackVideoParticipation', v)} />
            <Label>Participación en vídeo musical</Label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRightsStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Alcance de Derechos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duración (Term)</Label>
          <Select value={data.term} onValueChange={v => set('term', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Perpetual">Perpetuo</SelectItem>
              <SelectItem value="10 years">10 años</SelectItem>
              <SelectItem value="15 years">15 años</SelectItem>
              <SelectItem value="20 years">20 años</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Territorio</Label>
          <Select value={data.territory} onValueChange={v => set('territory', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Worldwide">Mundial</SelectItem>
              <SelectItem value="Europe">Europa</SelectItem>
              <SelectItem value="Spain">España</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Medios</Label>
          <Input value={data.media} onChange={e => set('media', e.target.value)} />
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Créditos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre profesional para créditos</Label>
            <Input value={data.creditProfessionalName} onChange={e => set('creditProfessionalName', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Credit designation</Label>
            <Select value={data.creditDesignation} onValueChange={v => set('creditDesignation', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="main artist">Main Artist</SelectItem>
                <SelectItem value="featured artist">Featured Artist</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompensationStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Compensación y Contacto</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Porcentaje de Royalty (%)</Label>
          <Input
            type="number"
            value={data.royaltyPercentage}
            onChange={e => set('royaltyPercentage', parseInt(e.target.value) || 0)}
            min={0}
            max={100}
          />
        </div>
        <div className="space-y-2">
          <Label>Frecuencia de pago</Label>
          <Select value={data.paymentFrequency} onValueChange={v => set('paymentFrequency', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semi-annually">Semestral</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="annually">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3 flex items-center gap-2"><Mail className="h-4 w-4" />Contacto (Notices)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email del Label</Label>
            <Input type="email" value={data.labelEmail} onChange={e => set('labelEmail', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email del Featured Artist</Label>
            <Input type="email" value={data.artistEmail} onChange={e => set('artistEmail', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    const content = generateIPContractContent(data);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vista previa del contrato</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <ClipboardCopy className="h-4 w-4 mr-1" />
              Copiar
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-lg p-6 max-h-[45vh] overflow-y-auto border shadow-inner">
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-gray-800 dark:text-gray-200">
            {content}
          </pre>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 0: return renderLabelStep();
      case 1: return renderArtistStep();
      case 2: return renderMasterStep();
      case 3: return renderRightsStep();
      case 4: return renderCompensationStep();
      case 5: return renderPreviewStep();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cesión de Derechos / IP Contract</DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}
        {renderStep()}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              Guardar contrato
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
