import React, { useState } from "react";
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
import { toast } from "@/components/ui/use-toast";
import { templates } from "@/lib/templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FileText, Check, ChevronRight, ChevronLeft, ClipboardCopy, Eye } from "lucide-react";

type ContractGeneratorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfUrl?: string }) => void | Promise<void>;
  bookingData?: Record<string, unknown>;
  initialData?: Record<string, string>;
};

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'template',
    title: 'Plantilla',
    description: 'Selecciona el tipo de contrato',
    icon: <FileText className="h-5 w-5" />
  },
  {
    id: 'data',
    title: 'Datos',
    description: 'Rellena la información del contrato',
    icon: <ClipboardCopy className="h-5 w-5" />
  },
  {
    id: 'preview',
    title: 'Vista Previa',
    description: 'Revisa y guarda el contrato',
    icon: <Eye className="h-5 w-5" />
  }
];

const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(Object.keys(templates)[0]);
  const [formData, setFormData] = useState<Record<string, string>>(initialData || {});

  const getTemplateFields = () => {
    const matches = templates[selectedTemplate]?.match(/{{(.*?)}}/g) || [];
    return [...new Set(matches.map(m => m.replace(/{{|}}/g, "")))];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateContractText = () => {
    let template = templates[selectedTemplate];
    Object.entries(formData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regex, value);
    });
    return template;
  };

  const handleSave = async () => {
    const content = generateContractText();
    if (onSave) {
      await onSave({ title: `Contrato - ${selectedTemplate}`, content });
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({});
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateContractText());
    toast({ description: "Contrato copiado al portapapeles" });
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return !!selectedTemplate;
    }
    if (currentStep === 1) {
      const fields = getTemplateFields();
      return fields.every(field => formData[field]?.trim());
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {WIZARD_STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => index < currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              index === currentStep && "bg-primary text-primary-foreground",
              index < currentStep && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
              index > currentStep && "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current">
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </span>
            <span className="hidden sm:inline font-medium">{step.title}</span>
          </button>
          {index < WIZARD_STEPS.length - 1 && (
            <ChevronRight className={cn(
              "h-5 w-5 mx-2",
              index < currentStep ? "text-primary" : "text-muted-foreground"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  const renderTemplateStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de contrato</Label>
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona una plantilla" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(templates).map((templateName) => (
              <SelectItem key={templateName} value={templateName}>
                {templateName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderDataStep = () => {
    const fields = getTemplateFields();
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>
                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id={field}
                name={field}
                value={formData[field] || ""}
                onChange={handleInputChange}
                placeholder={`Introduce ${field.replace(/_/g, ' ')}`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 max-h-[40vh] overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm font-mono">
          {generateContractText()}
        </pre>
      </div>
      <div className="flex justify-center">
        <Button variant="outline" onClick={copyToClipboard}>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          Copiar al portapapeles
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderTemplateStep();
      case 1:
        return renderDataStep();
      case 2:
        return renderPreviewStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Generador de Contratos</DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {WIZARD_STEPS[currentStep].icon}
              {WIZARD_STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>{WIZARD_STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderCurrentStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={currentStep === 0 ? () => onOpenChange(false) : handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
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
