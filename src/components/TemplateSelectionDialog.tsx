import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Crown, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TemplateItem {
  id: string;
  section: string;
  section_es: string;
  task: string;
  task_es: string;
  owner_label_es?: string;
  sort_order: number;
  due_anchor?: string;
  due_days_offset?: number;
}

interface Template {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  is_system_template: boolean;
  workspace_id: string | null;
  items?: TemplateItem[];
}

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTemplateApplied: () => void;
}

export function TemplateSelectionDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  onTemplateApplied 
}: TemplateSelectionDialogProps) {
  const [systemTemplates, setSystemTemplates] = useState<Template[]>([]);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      console.log('Fetching templates...');
      // Fetch system templates
      const { data: systemData, error: systemError } = await supabase
        .from('checklist_templates')
        .select('id, name, name_es, description, description_es, is_system_template, workspace_id')
        .eq('is_system_template', true)
        .order('name_es');

      if (systemError) {
        console.error('System templates error:', systemError);
        throw systemError;
      }

      // Fetch user templates (personal + workspace)
      const { data: userData, error: userError } = await supabase
        .from('checklist_templates')
        .select('id, name, name_es, description, description_es, is_system_template, workspace_id')
        .eq('is_system_template', false)
        .order('name_es');

      if (userError) {
        console.error('User templates error:', userError);
        throw userError;
      }

      console.log('System templates:', systemData);
      console.log('User templates:', userData);
      
      setSystemTemplates(systemData || []);
      setUserTemplates(userData || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateItems = async (templateId: string): Promise<TemplateItem[]> => {
    const { data, error } = await supabase
      .from('checklist_template_items')
      .select('id, section, section_es, task, task_es, owner_label_es, sort_order, due_anchor, due_days_offset')
      .eq('template_id', templateId)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  };

  const handleTemplateSelect = async (template: Template) => {
    try {
      const items = await fetchTemplateItems(template.id);
      setSelectedTemplate({ ...template, items });
    } catch (error) {
      console.error('Error fetching template items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos de la plantilla.",
        variant: "destructive",
      });
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate?.items) return;

    setApplying(true);
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) throw new Error('User not authenticated');

      // Group items by section and create checklist items
      const checklistItems = selectedTemplate.items.map((item, index) => ({
        project_id: projectId,
        title: item.task_es,
        description: item.owner_label_es || null,
        section: item.section_es,
        sort_order: index,
        created_by: userId,
      }));

      const { error } = await supabase
        .from('project_checklist_items')
        .insert(checklistItems);

      if (error) throw error;

      toast({
        title: "Plantilla aplicada",
        description: `Se han añadido ${checklistItems.length} elementos desde la plantilla "${selectedTemplate.name_es}".`,
      });

      onTemplateApplied();
      onOpenChange(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: "No se pudo aplicar la plantilla.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const groupItemsBySection = (items: TemplateItem[]) => {
    const grouped: Record<string, TemplateItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.section_es]) {
        grouped[item.section_es] = [];
      }
      grouped[item.section_es].push(item);
    });
    return grouped;
  };

  const TemplateCard = ({ template }: { template: Template }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => handleTemplateSelect(template)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{template.name_es}</CardTitle>
          {template.is_system_template ? (
            <Badge variant="secondary" className="text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Sistema
            </Badge>
          ) : template.workspace_id ? (
            <Badge variant="outline" className="text-xs">
              Workspace
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              Personal
            </Badge>
          )}
        </div>
        {template.description_es && (
          <p className="text-sm text-muted-foreground">{template.description_es}</p>
        )}
      </CardHeader>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Crear checklist desde plantilla
          </DialogTitle>
          <DialogDescription>
            Selecciona una plantilla para crear automáticamente elementos en tu checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Template Selection */}
          <div className="flex-1">
            <Tabs defaultValue="system" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="system">Plantillas del sistema</TabsTrigger>
                <TabsTrigger value="user">Mis plantillas</TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {loading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Cargando plantillas...
                    </div>
                  ) : systemTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No hay plantillas del sistema disponibles.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {systemTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="user" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {loading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Cargando plantillas...
                    </div>
                  ) : userTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No tienes plantillas personales.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Template Preview */}
          <div className="flex-1">
            <div className="border rounded-lg h-full">
              <div className="p-4 border-b">
                <h3 className="font-medium">Vista previa</h3>
              </div>
              <ScrollArea className="h-[400px] p-4">
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-lg">{selectedTemplate.name_es}</h4>
                      {selectedTemplate.description_es && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedTemplate.description_es}
                        </p>
                      )}
                    </div>
                    
                    {selectedTemplate.items && selectedTemplate.items.length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(groupItemsBySection(selectedTemplate.items)).map(([section, items]) => (
                          <div key={section}>
                            <h5 className="font-medium text-sm text-primary mb-2">
                              {section}
                            </h5>
                            <div className="space-y-2 ml-4">
                              {items.map((item) => (
                                <div key={item.id} className="flex items-start gap-2">
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="text-sm">{item.task_es}</span>
                                    {item.owner_label_es && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Responsable: {item.owner_label_es}
                                      </div>
                                    )}
                                  </div>
                                  {item.due_anchor && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {item.due_days_offset !== 0 ? 
                                        `${item.due_days_offset > 0 ? '+' : ''}${item.due_days_offset}d` : 
                                        'Día clave'
                                      }
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <Separator className="mt-3" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Esta plantilla no tiene elementos definidos.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Selecciona una plantilla para ver su contenido.
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={applyTemplate} 
            disabled={!selectedTemplate || applying}
          >
            {applying ? "Aplicando..." : "Aplicar plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}