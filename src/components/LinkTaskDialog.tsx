import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Link, FileText, DollarSign, FileSignature, MessageSquare, ClipboardCheck, StickyNote } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LinkTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  projectId: string;
}

interface LinkableItem {
  id: string;
  title: string;
  type: string;
  status?: string;
  created_at?: string;
  description?: string;
}

const CATEGORIES = [
  { id: 'presupuestos', label: 'Presupuestos', icon: DollarSign, table: 'budgets', titleField: 'name' },
  { id: 'documentos', label: 'Documentos', icon: FileText, table: 'documents', titleField: 'name' },
  { id: 'contratos', label: 'Contratos', icon: FileSignature, table: 'contracts', titleField: 'name' },
  { id: 'solicitudes', label: 'Solicitudes', icon: MessageSquare, table: 'solicitudes', titleField: 'nombre_solicitante' },
  { id: 'aprobaciones', label: 'Aprobaciones', icon: ClipboardCheck, table: 'approvals', titleField: 'title' },
  { id: 'notas', label: 'Notas', icon: StickyNote, table: 'notes', titleField: 'title' }
];

export const LinkTaskDialog = ({ open, onOpenChange, taskId, taskTitle, projectId }: LinkTaskDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('presupuestos');
  const [items, setItems] = useState<Record<string, LinkableItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [linkedItems, setLinkedItems] = useState<LinkableItem[]>([]);

  // Load items for each category
  useEffect(() => {
    if (!open) return;

    const loadCategoryItems = async () => {
      setLoading(true);
      const itemsByCategory: Record<string, LinkableItem[]> = {};

      for (const category of CATEGORIES) {
        try {
          const { data, error } = await supabase
            .from(category.table)
            .select('*')
            .eq('project_id', projectId);

          if (error) throw error;

          itemsByCategory[category.id] = data?.map(item => ({
            id: item.id,
            title: item[category.titleField] || 'Sin título',
            type: category.label,
            status: item.status || item.estado,
            created_at: item.created_at || item.fecha_creacion,
            description: item.description || item.observaciones
          })) || [];
        } catch (error) {
          console.error(`Error loading ${category.label}:`, error);
          itemsByCategory[category.id] = [];
        }
      }

      setItems(itemsByCategory);
      setLoading(false);
    };

    loadCategoryItems();
  }, [open, projectId]);

  // Load existing links
  useEffect(() => {
    if (!open) return;

    const loadLinkedItems = async () => {
      try {
        const { data, error } = await supabase
          .from('task_links')
          .select('*')
          .eq('task_id', taskId);

        if (error) throw error;

        // TODO: Fetch actual linked items details
        setLinkedItems([]);
      } catch (error) {
        console.error('Error loading linked items:', error);
      }
    };

    loadLinkedItems();
  }, [open, taskId]);

  const handleLinkItem = async (item: LinkableItem) => {
    try {
      const { error } = await supabase
        .from('task_links')
        .insert({
          task_id: taskId,
          linked_item_id: item.id,
          linked_item_type: activeCategory,
          linked_item_title: item.title
        });

      if (error) throw error;

      toast({
        title: "Elemento vinculado",
        description: `${item.title} ha sido vinculado a la tarea "${taskTitle}".`,
      });

      setLinkedItems(prev => [...prev, item]);
    } catch (error) {
      console.error('Error linking item:', error);
      toast({
        title: "Error",
        description: "No se pudo vincular el elemento.",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkItem = async (item: LinkableItem) => {
    try {
      const { error } = await supabase
        .from('task_links')
        .delete()
        .eq('task_id', taskId)
        .eq('linked_item_id', item.id);

      if (error) throw error;

      toast({
        title: "Vinculación eliminada",
        description: `${item.title} ya no está vinculado a la tarea.`,
      });

      setLinkedItems(prev => prev.filter(linked => linked.id !== item.id));
    } catch (error) {
      console.error('Error unlinking item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la vinculación.",
        variant: "destructive",
      });
    }
  };

  const filteredItems = items[activeCategory]?.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const isLinked = (item: LinkableItem) => linkedItems.some(linked => linked.id === item.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Vincular con "{taskTitle}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar elementos para vincular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                const count = items[category.id]?.length || 0;
                
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="text-xs flex items-center gap-1"
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{category.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] text-xs">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CATEGORIES.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cargando {category.label.toLowerCase()}...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 
                        `No se encontraron ${category.label.toLowerCase()} que coincidan con "${searchTerm}"` :
                        `No hay ${category.label.toLowerCase()} disponibles en este proyecto`
                      }
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map((item) => {
                        const linked = isLinked(item);
                        
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.title}</h4>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {item.status && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.status}
                                  </Badge>
                                )}
                                {item.created_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant={linked ? "destructive" : "default"}
                              onClick={() => linked ? handleUnlinkItem(item) : handleLinkItem(item)}
                              className="ml-3 flex-shrink-0"
                            >
                              {linked ? "Desvincular" : "Vincular"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          {/* Linked items summary */}
          {linkedItems.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Elementos vinculados ({linkedItems.length})</h4>
              <div className="flex flex-wrap gap-2">
                {linkedItems.map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-xs">
                    {item.type}: {item.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};