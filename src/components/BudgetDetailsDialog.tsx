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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
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
  'equipo_tecnico': {
    title: 'Equipo Técnico',
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
  'promocion': {
    title: 'Promoción',
    icon: FileText,
    subcategories: ['marketing', 'publicidad', 'merchandising', 'contenido']
  },
  'comisiones': {
    title: 'Comisiones',
    icon: Calculator,
    subcategories: ['booking', 'management', 'otros_fees']
  },
  'otros_gastos': {
    title: 'Otros Gastos',
    icon: DollarSign,
    subcategories: ['alquiler_material', 'visas', 'imprevistos', 'varios']
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
            {/* Professional Budget Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 border-b p-4">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-gray-900">{budgetData.name}</h2>
                  <p className="text-sm text-gray-600">
                    {budgetData.event_date && new Date(budgetData.event_date).toLocaleDateString('es-ES')} ({budgetData.city})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PRESUPUESTO NACIONAL / INTERNACIONAL</p>
                </div>
              </div>

              {/* Main budget table */}
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-gray-100">
                    <TableRow className="border-b">
                      <TableHead className="w-12 text-center font-bold bg-gray-800 text-white">SELECT</TableHead>
                      <TableHead className="font-bold bg-gray-800 text-white">NOMBRE / CONCEPTO</TableHead>
                      <TableHead className="w-20 text-center font-bold bg-gray-800 text-white">COSTE</TableHead>
                      <TableHead className="w-12 text-center font-bold bg-gray-800 text-white">T</TableHead>
                      <TableHead className="w-20 text-center font-bold bg-gray-800 text-white">TOTAL</TableHead>
                      <TableHead className="w-16 text-center font-bold bg-gray-800 text-white">IVA</TableHead>
                      <TableHead className="w-20 text-center font-bold bg-gray-800 text-white">€ + IVA</TableHead>
                      <TableHead className="w-24 text-center font-bold bg-gray-800 text-white">COMENTARIOS</TableHead>
                      <TableHead className="w-16 text-center font-bold bg-gray-800 text-white">Nº FRA</TableHead>
                      <TableHead className="w-12 text-center font-bold bg-gray-800 text-white">N / I</TableHead>
                      <TableHead className="w-20 text-center font-bold bg-gray-800 text-white">Quinteto</TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                      const categoryItems = getCategoryItems(categoryKey);
                      const categoryTotal = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
                      
                      return (
                        <>
                          {/* Category Header */}
                          <TableRow key={`${categoryKey}-header`} className="bg-gray-800">
                            <TableCell colSpan={11} className="font-bold text-white text-center py-2">
                              {category.title.toUpperCase()}
                            </TableCell>
                          </TableRow>
                          
                          {/* Category Items */}
                          {categoryItems.map((item, index) => (
                            <TableRow 
                              key={item.id} 
                              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            >
                              <TableCell className="text-center">
                                <Checkbox 
                                  checked={true}
                                  className="h-3 w-3"
                                />
                              </TableCell>
                              <TableCell>
                                {editingItem === item.id ? (
                                  <Input
                                    value={item.name}
                                    onChange={(e) => setItems(prev => 
                                      prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i)
                                    )}
                                    className="h-6 text-xs"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>{item.name}</span>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => setEditingItem(item.id)}
                                      className="h-4 w-4 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {editingItem === item.id ? (
                                  <Input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => setItems(prev => 
                                      prev.map(i => i.id === item.id ? { ...i, unit_price: parseFloat(e.target.value) || 0 } : i)
                                    )}
                                    className="h-6 text-xs w-16"
                                  />
                                ) : (
                                  `${item.unit_price}€`
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {editingItem === item.id ? (
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => setItems(prev => 
                                      prev.map(i => i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i)
                                    )}
                                    className="h-6 text-xs w-12"
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {(item.unit_price * item.quantity).toFixed(0)}€
                              </TableCell>
                              <TableCell className="text-center">
                                {editingItem === item.id ? (
                                  <Input
                                    type="number"
                                    value={item.iva_percentage}
                                    onChange={(e) => setItems(prev => 
                                      prev.map(i => i.id === item.id ? { ...i, iva_percentage: parseFloat(e.target.value) || 21 } : i)
                                    )}
                                    className="h-6 text-xs w-12"
                                  />
                                ) : (
                                  `${item.iva_percentage}%`
                                )}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {calculateTotal(item).toFixed(0)}€
                              </TableCell>
                              <TableCell className="text-center">
                                {editingItem === item.id ? (
                                  <Input
                                    value={item.observations}
                                    onChange={(e) => setItems(prev => 
                                      prev.map(i => i.id === item.id ? { ...i, observations: e.target.value } : i)
                                    )}
                                    className="h-6 text-xs"
                                  />
                                ) : (
                                  <span className="text-xs">{item.observations}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Badge 
                                    variant={item.billing_status === 'pagado' ? 'default' : 'outline'}
                                    className="text-xs h-4"
                                  >
                                    {item.billing_status === 'pagado' ? 'FRA' : ''}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-xs">
                                  {item.billing_status === 'pagado' ? '-100' : 
                                   item.billing_status === 'pendiente' ? '-100' : ''}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs h-4 ${
                                    item.billing_status === 'pagado' ? 'bg-green-100 text-green-800' :
                                    item.billing_status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {item.billing_status === 'pagado' ? 'Pagada' :
                                   item.billing_status === 'pendiente' ? 'Pendiente' :
                                   'Solicitada'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          
                          {editingItem && (
                            <TableRow className="bg-blue-50">
                              <TableCell colSpan={11} className="text-center">
                                <div className="flex gap-2 justify-center">
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      const item = items.find(i => i.id === editingItem);
                                      if (item) updateItem(item);
                                    }}
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                    Guardar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setEditingItem(null)}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Cancelar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => {
                                      if (editingItem) {
                                        deleteItem(editingItem);
                                        setEditingItem(null);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Eliminar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {/* Category Total */}
                          {categoryItems.length > 0 && (
                            <TableRow className="bg-gray-100 font-medium">
                              <TableCell></TableCell>
                              <TableCell className="font-bold">SUBTOTAL {category.title.toUpperCase()}</TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-center font-bold">
                                {categoryItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(0)}€
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-center font-bold">
                                {categoryTotal.toFixed(0)}€
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          )}
                          
                          {/* Add new item row */}
                          <TableRow className="bg-yellow-50 border-b-2">
                            <TableCell colSpan={11}>
                              <div className="flex items-center gap-2 py-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => addItem(categoryKey)}
                                  className="h-6 text-xs"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Agregar elemento a {category.title}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                    
                    {/* Grand Total */}
                    <TableRow className="bg-gray-800 font-bold text-white">
                      <TableCell></TableCell>
                      <TableCell className="font-bold">COSTE NETO</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-center">
                        {items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(0)}€
                      </TableCell>
                      <TableCell className="text-center">21%</TableCell>
                      <TableCell className="text-center font-bold">
                        {items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(0)}€
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-600 text-white">MARGEN</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                          900€
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              {/* Bottom Summary */}
              <div className="bg-gray-50 p-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>DIETES EXTRA</span>
                      <span>1</span>
                      <span>550€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NITS EXTRA</span>
                      <span>0</span>
                      <span>0€</span>
                    </div>
                    <div className="flex justify-between font-bold bg-gray-800 text-white px-2 py-1">
                      <span>CALCULADORA XPRESS</span>
                      <span>550€</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>COSTE REAL</span>
                      <span className="font-bold">
                        {(items.reduce((sum, item) => sum + calculateTotal(item), 0) + 550).toFixed(0)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>CACHE</span>
                      <span className="font-bold">{budgetData.fee?.toLocaleString() || 0}€</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span>IMPREVISTOS</span>
                        <span>0€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Buy Out</span>
                        <span>0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SoldOut</span>
                        <span>0€</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>TOTAL</span>
                        <span>820€</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="bg-green-100 p-2 rounded">
                      <div className="flex justify-between">
                        <span>INGRESOS MERCH</span>
                        <span>0€</span>
                      </div>
                    </div>
                    <div className="bg-gray-800 text-white p-2 rounded text-center">
                      <div className="font-bold">SoldOut</div>
                      <div>YES ☐</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Diagrama Circular */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Distribución de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(budgetCategories).map(([categoryKey, category]) => {
                              const categoryItems = getCategoryItems(categoryKey);
                              const categoryTotal = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
                              
                              return {
                                name: category.title,
                                value: categoryTotal,
                                categoryKey
                              };
                            }).filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => 
                              percent > 5 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.entries(budgetCategories).map(([categoryKey, category], index) => {
                              const colors = [
                                '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
                                '#ef4444', '#8b5cf6', '#6366f1', '#84cc16'
                              ];
                              return (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              );
                            })}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value.toFixed(2)}€`, 'Importe']}
                            labelFormatter={(label) => `${label}`}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-muted-foreground">
                      No hay datos para mostrar el gráfico
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen por Categorías */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Resumen por Categorías
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                      const categoryItems = getCategoryItems(categoryKey);
                      if (categoryItems.length === 0) return null;
                      
                      const categoryTotal = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
                      const totalBudget = items.reduce((sum, item) => sum + calculateTotal(item), 0);
                      const percentage = totalBudget > 0 ? (categoryTotal / totalBudget) * 100 : 0;
                      
                      return (
                        <div key={categoryKey} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <category.icon className="w-4 h-4 text-primary" />
                              <span className="font-medium">{category.title}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{categoryTotal.toFixed(2)}€</div>
                              <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-3 pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>TOTAL GASTOS:</span>
                        <span>{items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}€</span>
                      </div>
                      
                      {budgetData.fee > 0 && (
                        <>
                          <div className="flex justify-between items-center text-lg font-bold text-green-600">
                            <span>FEE:</span>
                            <span>+{budgetData.fee.toFixed(2)}€</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center text-xl font-bold">
                            <span>BENEFICIO/PÉRDIDA:</span>
                            <span className={budgetData.fee - items.reduce((sum, item) => sum + calculateTotal(item), 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {budgetData.fee >= 0 ? '+' : ''}{(budgetData.fee - items.reduce((sum, item) => sum + calculateTotal(item), 0)).toFixed(2)}€
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabla detallada */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Detalle de Elementos</CardTitle>
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
