import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

type ContractGeneratorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfUrl?: string }) => void | Promise<void>;
  bookingData?: Record<string, unknown>;
  initialData?: Record<string, string>;
};

const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData,
}) => {
  const [step, setStep] = useState<"template" | "data" | "preview">("template");
  const [selectedTemplate, setSelectedTemplate] = useState(
    Object.keys(templates)[0]
  );
  const [formData, setFormData] = useState<Record<string, string>>(
    initialData || {}
  );

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    setStep("data");
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
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
      await onSave({ title: "Contrato generado", content });
    }
    onOpenChange(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateContractText());
    toast({ description: "Contrato copiado al portapapeles" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generador de Contratos
            <Badge variant="outline" className="ml-2">
              {step === "template" && "Paso 1: Plantilla"}
              {step === "data" && "Paso 2: Datos"}
              {step === "preview" && "Paso 3: Vista previa"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          {step === "template" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Selecciona una plantilla:
              </h2>
              <Select onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-[180px]">
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
          )}

          {step === "data" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Introduce los datos:
              </h2>
              <Accordion type="single" collapsible>
                {Object.keys(
                  templates[selectedTemplate].match(/{{(.*?)}}/g)?.reduce(
                    (acc: Record<string, boolean>, match) => {
                      const key = match.replace(/{{|}}/g, "");
                      acc[key] = true;
                      return acc;
                    },
                    {}
                  ) || {}
                ).map((key) => (
                  <AccordionItem value={key} key={key}>
                    <AccordionTrigger>
                      {key}
                      <span
                        className={cn(
                          "ml-auto text-xs text-muted-foreground"
                        )}
                      >
                        (requerido)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-2">
                        <Label htmlFor={key}>{key}</Label>
                        <Input
                          type="text"
                          id={key}
                          name={key}
                          value={formData[key] || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <Button
                className="mt-4"
                onClick={() => setStep("preview")}
                disabled={
                  Object.keys(
                    templates[selectedTemplate].match(/{{(.*?)}}/g)?.reduce(
                      (acc: Record<string, boolean>, match) => {
                        const key = match.replace(/{{|}}/g, "");
                        acc[key] = true;
                        return acc;
                      },
                      {}
                    ) || {}
                  ).length > Object.keys(formData).length
                }
              >
                Vista previa
              </Button>
            </div>
          )}

          {step === "preview" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Vista previa:</h2>
              <div className="whitespace-pre-line">
                {generateContractText()}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 flex justify-end gap-2 flex-shrink-0">
          {step === "preview" && (
            <Button variant="secondary" onClick={copyToClipboard}>
              Copiar al portapapeles
            </Button>
          )}
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ContractGenerator };
export default ContractGenerator;

