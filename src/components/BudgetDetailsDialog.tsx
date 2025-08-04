import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Users, 
  Car, 
  UtensilsCrossed, 
  BedDouble, 
  CreditCard, 
  FileText,
  Download,
  Upload,
  Calculator,
  Music,
  Lightbulb,
  Utensils,
  Bed,
  DollarSign,
  File
} from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  venue: string;
  budget_status: string;
  show_status: string;
  internal_notes: string;
  created_at: string;
  artist_id: string;
  event_date: string;
  event_time: string;
  fee: number;
  profiles?: { full_name: string };
}

interface BudgetItem {
  id: string;
  budget_id: string;
  category: string;
  subcategory: string;
  name: string;
  quantity: number;
  unit_price: number;
  iva_percentage: number;
  is_attendee: boolean;
  billing_status: 'pendiente' | 'pagado' | 'facturado' | 'cancelado';
  invoice_link: string;
  observations: string;
}

interface BudgetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onUpdate: () => void;
  onDelete?: () => void;
}

const budgetCategories = {
  'equipo_artistico': {
    title: 'Equipo Artístico',
    icon: Music,
    subcategories: ['artista_principal', 'banda', 'coristas', 'bailarines', 'otros']
  },
  'menores_edad': {
    title: 'Menores de Edad',
    icon: Users,
    subcategories: ['menor_artista', 'menor_staff']
  },
  'equipo_tecnico': {
    title: 'Equipo Técnico/Producción',
    icon: Lightbulb,
    subcategories: ['tour_manager', 'tecnico_sonido', 'tecnico_luces', 'stage_manager', 'produccion_local', 'runner']
  },
  'transporte': {
    title: 'Transporte',
    icon: Car,
    subcategories: ['avion', 'furgoneta', 'tren', 'ave', 'coche', 'equipaje_extra', 'seguro_medico']
  },
  'dietas': {
    title: 'Dietas',
    icon: Utensils,
    subcategories: ['dieta_completa', 'media_dieta', 'desayuno']
  },
  'hospedaje': {
    title: 'Hospedaje',
    icon: Bed,
    subcategories: ['habitacion', 'habitacion_extra', 'apartamento']
  },
  'otros_gastos': {
    title: 'Otros Gastos',
    icon: DollarSign,
    subcategories: ['alquiler_material', 'promocion', 'visas', 'imprevistos']
  },
  'porcentajes': {
    title: 'Porcentajes',
    icon: Calculator,
    subcategories: ['booking', 'management', 'otros_fees']
  }
};

export default function BudgetDetailsDialog({ open, onOpenChange, budget, onUpdate, onDelete }: BudgetDetailsDialogProps) {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetData, setBudgetData] = useState(budget);
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    category: '',
    subcategory: '',
    name: '',
    quantity: 1,
    unit_price: 0,
    iva_percentage: 21,
    is_attendee: false,
    billing_status: 'pendiente' as const,
    invoice_link: '',
    observations: ''
  });

  useEffect(() => {
    if (open && budget) {
      setBudgetData(budget);
      fetchBudgetItems();
    }
  }, [open, budget]);

  const fetchBudgetItems = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budget.id)
        .order('category', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching budget items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos del presupuesto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (category: string) => {
    // Permitir agregar elemento sin nombre (se podrá editar después)

    try {
      const { error } = await supabase
        .from('budget_items')
        .insert({
          budget_id: budget.id,
          category,
          subcategory: newItem.subcategory || '',
          name: newItem.name || 'Nuevo elemento',
          quantity: newItem.quantity || 1,
          unit_price: newItem.unit_price || 0,
          iva_percentage: newItem.iva_percentage || 21,
          is_attendee: newItem.is_attendee || false,
          billing_status: (newItem.billing_status as 'pendiente' | 'pagado' | 'facturado' | 'cancelado') || 'pendiente',
          invoice_link: newItem.invoice_link || '',
          observations: newItem.observations || ''
        });

      if (error) throw error;

      // Reset form
      setNewItem({
        category: '',
        subcategory: '',
        name: '',
        quantity: 1,
        unit_price: 0,
        iva_percentage: 21,
        is_attendee: false,
        billing_status: 'pendiente' as const,
        invoice_link: '',
        observations: ''
      });

      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Elemento agregado correctamente"
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el elemento",
        variant: "destructive"
      });
    }
  };

  const updateItem = async (item: BudgetItem) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .update({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          iva_percentage: item.iva_percentage,
          is_attendee: item.is_attendee,
          billing_status: item.billing_status as 'pendiente' | 'pagado' | 'facturado' | 'cancelado',
          invoice_link: item.invoice_link,
          observations: item.observations
        })
        .eq('id', item.id);

      if (error) throw error;

      setEditingItem(null);
      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Elemento actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el elemento",
        variant: "destructive"
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Elemento eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento",
        variant: "destructive"
      });
    }
  };

  const calculateTotal = (item: BudgetItem) => {
    const subtotal = item.quantity * item.unit_price;
    const iva = subtotal * (item.iva_percentage / 100);
    return subtotal + iva;
  };

  const getCategoryItems = (categoryKey: string) => {
    return items.filter(item => item.category === categoryKey);
  };

  const getBillingStatusColor = (status: string) => {
    switch (status) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'facturado': return 'bg-blue-100 text-blue-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const saveAsTemplate = () => {
    if (!budget || items.length === 0) {
      toast({
        title: "Error",
        description: "No hay elementos en el presupuesto para guardar como plantilla",
        variant: "destructive"
      });
      return;
    }
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = async (name: string, description?: string) => {
    if (!budget || !user) return;

    try {
      const { data: templateData, error: templateError } = await supabase
        .from("budget_templates")
        .insert({
          name: name,
          description: description || `Plantilla basada en ${budget.name}`,
          created_by: user.id
        })
        .select()
        .single();

      if (templateError) throw templateError;

      const templateItems = items.map(item => ({
        template_id: templateData.id,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        unit_price: item.unit_price,
        quantity: item.quantity,
        iva_percentage: item.iva_percentage,
        is_attendee: item.is_attendee,
        observations: item.observations
      }));

      const { error: itemsError } = await supabase
        .from("budget_template_items")
        .insert(templateItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Éxito",
        description: "Plantilla guardada exitosamente"
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Error al guardar la plantilla",
        variant: "destructive"
      });
    }
  };

  const updateBudget = async () => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          name: budgetData.name,
          city: budgetData.city,
          country: budgetData.country,
          venue: budgetData.venue,
          event_date: budgetData.event_date,
          event_time: budgetData.event_time,
          fee: budgetData.fee,
        })
        .eq('id', budgetData.id);

      if (error) throw error;

      setEditingBudget(false);
      onUpdate();
      toast({
        title: "¡Éxito!",
        description: "Presupuesto actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el presupuesto",
        variant: "destructive"
      });
    }
  };

  const deleteBudget = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este presupuesto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetData.id);

      if (error) throw error;

      onDelete?.();
      onOpenChange(false);
      toast({
        title: "¡Éxito!",
        description: "Presupuesto eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el presupuesto",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editingBudget ? (
                <div className="space-y-4">
                  <div>
                    <Label>Nombre del evento</Label>
                    <Input
                      value={budgetData.name}
                      onChange={(e) => setBudgetData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Ciudad</Label>
                      <Input
                        value={budgetData.city}
                        onChange={(e) => setBudgetData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>País</Label>
                      <Input
                        value={budgetData.country}
                        onChange={(e) => setBudgetData(prev => ({ ...prev, country: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Lugar</Label>
                    <Input
                      value={budgetData.venue}
                      onChange={(e) => setBudgetData(prev => ({ ...prev, venue: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={budgetData.event_date?.split('T')[0] || ''}
                        onChange={(e) => setBudgetData(prev => ({ ...prev, event_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Hora</Label>
                      <Input
                        type="time"
                        value={budgetData.event_time || ''}
                        onChange={(e) => setBudgetData(prev => ({ ...prev, event_time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Fee (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={budgetData.fee}
                        onChange={(e) => setBudgetData(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={updateBudget}>
                      <Save className="w-4 h-4 mr-1" />
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingBudget(false);
                      setBudgetData(budget);
                    }}>
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl">{budgetData.name}</DialogTitle>
                    <Button size="sm" variant="outline" onClick={() => setEditingBudget(true)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline">{budgetData.type}</Badge>
                    <Badge variant="outline">{budgetData.city}, {budgetData.country}</Badge>
                    {budgetData.event_date && (
                      <Badge variant="outline">
                        {new Date(budgetData.event_date).toLocaleDateString()}
                        {budgetData.event_time && ` - ${budgetData.event_time}`}
                      </Badge>
                    )}
                    {budgetData.fee > 0 && (
                      <Badge variant="outline" className="text-green-600">
                        Fee: €{budgetData.fee.toLocaleString()}
                      </Badge>
                    )}
                    <Badge className={
                      budgetData.show_status === 'confirmado' ? 'bg-green-100 text-green-800' :
                      budgetData.show_status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {budgetData.show_status}
                    </Badge>
                  </div>
                </>
              )}
            </div>
            {!editingBudget && (
              <Button size="sm" variant="destructive" onClick={deleteBudget}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Elementos</TabsTrigger>
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="attachments">Archivos</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-6">
            {Object.entries(budgetCategories).map(([categoryKey, category]) => {
              const categoryItems = getCategoryItems(categoryKey);
              const Icon = category.icon;
              
              return (
                <Card key={categoryKey}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      {category.title}
                      <Badge variant="outline" className="ml-auto">
                        {categoryItems.length} elementos
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Existing items */}
                    {categoryItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        {editingItem === item.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="md:col-span-2">
                                <Label>Nombre</Label>
                                <Input
                                  value={item.name}
                                  onChange={(e) => setItems(prev => 
                                    prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i)
                                  )}
                                />
                              </div>
                              <div>
                                <Label>Cantidad</Label>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => setItems(prev => 
                                    prev.map(i => i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 0 } : i)
                                  )}
                                />
                              </div>
                              <div>
                                <Label>Precio unitario (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => setItems(prev => 
                                    prev.map(i => i.id === item.id ? { ...i, unit_price: parseFloat(e.target.value) || 0 } : i)
                                  )}
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label>IVA (%)</Label>
                                <Input
                                  type="number"
                                  value={item.iva_percentage}
                                  onChange={(e) => setItems(prev => 
                                    prev.map(i => i.id === item.id ? { ...i, iva_percentage: parseFloat(e.target.value) || 0 } : i)
                                  )}
                                />
                              </div>
                              <div>
                                <Label>Estado facturación</Label>
                                <Select 
                                  value={item.billing_status} 
                                  onValueChange={(value) => setItems(prev => 
                                    prev.map(i => i.id === item.id ? { ...i, billing_status: value as 'pendiente' | 'pagado' | 'facturado' | 'cancelado' } : i)
                                  )}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendiente">Pendiente</SelectItem>
                                    <SelectItem value="facturado">Facturado</SelectItem>
                                    <SelectItem value="pagado">Pagado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center space-x-2 pt-6">
                                <Checkbox
                                  id={`attendee-${item.id}`}
                                  checked={item.is_attendee}
                                  onCheckedChange={(checked) => setItems(prev => 
                                    prev.map(i => i.id === item.id ? { ...i, is_attendee: !!checked } : i)
                                  )}
                                />
                                <label htmlFor={`attendee-${item.id}`} className="text-sm">
                                  Asistente
                                </label>
                              </div>
                            </div>

                            <div>
                              <Label>Observaciones</Label>
                              <Textarea
                                value={item.observations}
                                onChange={(e) => setItems(prev => 
                                  prev.map(i => i.id === item.id ? { ...i, observations: e.target.value } : i)
                                )}
                                rows={2}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateItem(item)}>
                                <Save className="w-4 h-4 mr-1" />
                                Guardar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <span className="font-medium">{item.name}</span>
                                {item.is_attendee && (
                                  <Badge variant="outline" className="text-xs">✓ Asistente</Badge>
                                )}
                                <Badge className={getBillingStatusColor(item.billing_status)}>
                                  {item.billing_status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.quantity}x {item.unit_price}€ + {item.iva_percentage}% IVA = {calculateTotal(item).toFixed(2)}€
                              </div>
                              {item.observations && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {item.observations}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingItem(item.id)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => deleteItem(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add new item form */}
                    <Card className="border-dashed">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <Label>Nombre del elemento</Label>
                              <Input
                                placeholder="Nombre del elemento..."
                                value={newItem.name || ''}
                                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Subcategoría</Label>
                              <Select 
                                value={newItem.subcategory || ''} 
                                onValueChange={(value) => setNewItem(prev => ({ ...prev, subcategory: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {category.subcategories.map(sub => (
                                    <SelectItem key={sub} value={sub}>
                                      {sub.replace('_', ' ').toUpperCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => addItem(categoryKey)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar Elemento
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resumen Detallado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Concepto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Coste</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">IVA %</TableHead>
                        <TableHead className="text-right">€ + IVA</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                        const categoryItems = getCategoryItems(categoryKey);
                        if (categoryItems.length === 0) return null;
                        
                        return categoryItems.map((item, index) => (
                          <TableRow key={`${categoryKey}-${index}`}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <category.icon className="w-4 h-4" />
                                {category.title}
                                {item.subcategory && ` - ${item.subcategory}`}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{(item.unit_price || 0).toFixed(2)}€</TableCell>
                            <TableCell className="text-center">{item.quantity || 1}</TableCell>
                            <TableCell className="text-right">
                              {((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}€
                            </TableCell>
                            <TableCell className="text-center">{item.iva_percentage || 21}%</TableCell>
                            <TableCell className="text-right font-semibold">
                              {calculateTotal(item).toFixed(2)}€
                            </TableCell>
                            <TableCell>
                              <Badge className={getBillingStatusColor(item.billing_status || "pendiente")}>
                                {item.billing_status || "pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={item.observations}>
                              {item.observations}
                            </TableCell>
                          </TableRow>
                        ));
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-6 space-y-3">
                  <Separator />
                  {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                    const categoryItems = getCategoryItems(categoryKey);
                    if (categoryItems.length === 0) return null;
                    
                    const categoryTotal = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
                    
                    return (
                      <div key={categoryKey} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <category.icon className="w-4 h-4" />
                          <span>{category.title}</span>
                        </div>
                        <span className="font-medium">{categoryTotal.toFixed(2)}€</span>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>TOTAL GASTOS:</span>
                    <span>{items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}€</span>
                  </div>
                  
                   {budgetData.fee > 0 && (
                     <>
                       <Separator />
                       <div className="space-y-2">
                         <div className="flex justify-between items-center text-lg font-bold text-green-600">
                           <span>FEE:</span>
                           <span>+{budgetData.fee.toFixed(2)}€</span>
                         </div>
                         <div className="flex justify-between items-center text-xl font-bold">
                           <span>BENEFICIO/PÉRDIDA:</span>
                           <span className={budgetData.fee - items.reduce((sum, item) => sum + calculateTotal(item), 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                             {budgetData.fee >= 0 ? '+' : ''}{(budgetData.fee - items.reduce((sum, item) => sum + calculateTotal(item), 0)).toFixed(2)}€
                           </span>
                         </div>
                       </div>
                     </>
                   )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="w-5 h-5" />
                  Archivos Adjuntos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Arrastra archivos aquí o haz clic para seleccionar
                  </p>
                  <Button variant="outline">
                    Seleccionar archivos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveAsTemplate}>
              <Save className="w-4 h-4 mr-1" />
              Guardar como Plantilla
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <SaveTemplateDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          onSave={handleSaveTemplate}
          budgetName={budgetData?.name}
        />
      </DialogContent>
    </Dialog>
  );
}
