import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Calculator,
  Music,
  DollarSign,
  CreditCard,
  Users,
  Car,
  UtensilsCrossed,
  BedDouble,
  FileText,
  Lightbulb,
  Utensils,
  Bed,
  Maximize2,
  Minimize2,
  Eye,
  Settings,
  Pencil,
  GripVertical
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
  subcategory?: string;
  name: string;
  quantity: number;
  unit_price: number;
  iva_percentage: number;
  irpf_percentage: number;
  is_attendee: boolean;
  billing_status: 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada';
  invoice_link?: string;
  observations?: string;
  category_id?: string;
  budget_categories?: {
    id: string;
    name: string;
    icon_name: string;
  };
}

interface BudgetCategory {
  id: string;
  name: string;
  icon_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

interface BudgetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onUpdate: () => void;
  onDelete?: () => void;
}

const iconMap = {
  Music: Music,
  Calculator: Calculator,
  DollarSign: DollarSign,
  Users: Users,
  Car: Car,
  UtensilsCrossed: UtensilsCrossed,
  BedDouble: BedDouble,
  CreditCard: CreditCard,
  FileText: FileText,
  Lightbulb: Lightbulb,
  Utensils: Utensils,
  Bed: Bed
};

export default function BudgetDetailsDialog({ open, onOpenChange, budget, onUpdate, onDelete }: BudgetDetailsDialogProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetData, setBudgetData] = useState(budget);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [editingItemValues, setEditingItemValues] = useState<Partial<BudgetItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (open && budget) {
      setBudgetData(budget);
      fetchBudgetItems();
      fetchBudgetCategories();
    }
  }, [open, budget]);

  const fetchBudgetCategories = async () => {
    try {
      console.log('Fetching budget categories for user:', user?.id);
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('created_by', user?.id)
        .order('sort_order');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        await createDefaultCategories();
        return;
      }
      
      setBudgetCategories(data || []);
    } catch (error) {
      console.error('Error fetching budget categories:', error);
    }
  };

  const createDefaultCategories = async () => {
    try {
      const defaultCategories = [
        { name: 'Promoción', icon_name: 'Music' },
        { name: 'Comisiones', icon_name: 'DollarSign' },
        { name: 'Otros Gastos', icon_name: 'CreditCard' }
      ];

      const { data, error } = await supabase
        .from('budget_categories')
        .insert(defaultCategories.map((cat, index) => ({
          ...cat,
          created_by: user?.id,
          sort_order: index
        })))
        .select();

      if (error) throw error;
      setBudgetCategories(data || []);
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  const fetchBudgetItems = async () => {
    try {
      console.log('Fetching budget items for budget:', budget.id);
      const { data, error } = await supabase
        .from('budget_items')
        .select(`
          *,
          budget_categories(id, name, icon_name)
        `)
        .eq('budget_id', budget.id)
        .order('name');

      if (error) throw error;
      const itemsWithDefaults = (data || []).map(item => ({
        ...item,
        irpf_percentage: item.irpf_percentage ?? 15,
        billing_status: item.billing_status === 'pagado' ? 'pagada' : 
                       item.billing_status === 'facturado' ? 'factura_recibida' :
                       item.billing_status === 'cancelado' ? 'pendiente' :
                       (item.billing_status as 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada') || 'pendiente'
      }));
      console.log('✅ Items fetched:', itemsWithDefaults.length, itemsWithDefaults);
      setItems(itemsWithDefaults);
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

  const calculateTotal = (item: BudgetItem) => {
    const subtotal = item.unit_price; // Removed quantity since we no longer use it
    const iva = subtotal * (item.iva_percentage / 100);
    const irpf = subtotal * ((item.irpf_percentage || 15) / 100);
    return subtotal + iva - irpf;
  };

  const calculateGrandTotals = () => {
    const totals = items.reduce(
      (acc, item) => {
        const subtotal = item.unit_price; // Removed quantity since we no longer use it
        const iva = subtotal * (item.iva_percentage / 100);
        const irpf = subtotal * ((item.irpf_percentage || 15) / 100);
        
        acc.neto += subtotal;
        acc.iva += iva;
        acc.irpf += irpf;
        acc.total += subtotal + iva - irpf;
        
        return acc;
      },
      { neto: 0, iva: 0, irpf: 0, total: 0 }
    );
    
    return totals;
  };

  const getCategoryItems = (categoryId: string) => {
    console.log('🔍 Getting items for category:', categoryId);
    
    if (!items || items.length === 0) {
      console.log('⚠️ No items found in state');
      return [];
    }
    
    const filteredItems = items.filter(item => {
      // Primera prioridad: category_id exacto
      if (item.category_id === categoryId) {
        console.log('✅ Item matched by category_id:', item.name);
        return true;
      }
      
      // Para elementos sin categoría, mostrar en la primera categoría
      if (!item.category_id && budgetCategories.length > 0 && categoryId === budgetCategories[0]?.id) {
        console.log('⚡ Item without category assigned to first category:', item.name);
        return true;
      }
      
      return false;
    });
    
    console.log('📋 Filtered items for category', categoryId, ':', filteredItems.length);
    return filteredItems;
  };

  const createTestData = async () => {
    try {
      console.log('🧪 Creating test data for budget:', budget.id);
      
      // Esperar a que las categorías estén cargadas
      if (budgetCategories.length === 0) {
        await createDefaultCategories();
        // Dar tiempo para que se actualice el estado
        setTimeout(() => {
          createTestDataWithCategories();
        }, 1000);
        return;
      }
      
      await createTestDataWithCategories();
    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        title: "Error",
        description: "No se pudieron crear los datos de prueba",
        variant: "destructive"
      });
    }
  };

  const createTestDataWithCategories = async () => {
    try {
      const testItems = [
        {
          budget_id: budget.id,
          category_id: budgetCategories[0]?.id || null,
          name: 'Honorarios artista',
          quantity: 1,
          unit_price: 2000,
          iva_percentage: 21,
          irpf_percentage: 15,
          is_attendee: false,
          billing_status: 'pendiente' as const,
          category: '',
          subcategory: '',
          observations: 'Elemento de prueba'
        },
        {
          budget_id: budget.id,
          category_id: budgetCategories[0]?.id || null,
          name: 'Producción técnica',
          quantity: 1,
          unit_price: 500,
          iva_percentage: 21,
          irpf_percentage: 15,
          is_attendee: false,
          billing_status: 'pendiente' as const,
          category: '',
          subcategory: '',
          observations: 'Elemento de prueba'
        }
      ];

      const { error } = await supabase
        .from('budget_items')
        .insert(testItems);

      if (error) throw error;
      
      await fetchBudgetItems();
      toast({
        title: "¡Datos de prueba creados!",
        description: "Se han añadido elementos de ejemplo al presupuesto"
      });
    } catch (error) {
      console.error('Error creating test items:', error);
    }
  };

  const addNewItem = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .insert({
          budget_id: budget.id,
          category_id: categoryId,
          category: '',
          subcategory: '',
          name: 'Nuevo elemento',
          quantity: 1,
          unit_price: 0,
          iva_percentage: 21,
          irpf_percentage: 15,
          is_attendee: false,
          billing_status: 'pendiente',
          invoice_link: '',
          observations: ''
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchBudgetItems();
      setEditingItem(data.id);
      setEditingItemValues({
        ...data,
        billing_status: data.billing_status === 'pagado' ? 'pagada' : 
                       data.billing_status === 'facturado' ? 'factura_recibida' :
                       data.billing_status === 'cancelado' ? 'pendiente' :
                       (data.billing_status as 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada') || 'pendiente'
      });
      
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

  const startEditingItem = (item: BudgetItem) => {
    setEditingItem(item.id);
    setEditingItemValues(item);
  };

  const saveItemEdits = async () => {
    if (!editingItem || !editingItemValues) return;

    try {
      const updateData = {
        ...editingItemValues,
        billing_status: editingItemValues.billing_status === 'pagada' ? 'pagado' as const :
                       editingItemValues.billing_status === 'factura_recibida' ? 'facturado' as const :
                       editingItemValues.billing_status === 'factura_solicitada' ? 'pendiente' as const :
                       'pendiente' as const
      };
      
      const { error } = await supabase
        .from('budget_items')
        .update(updateData)
        .eq('id', editingItem);

      if (error) throw error;
      
      setEditingItem(null);
      setEditingItemValues({});
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

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-black text-white border-gray-800">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isFullscreen ? 'max-w-screen w-screen max-h-screen h-screen' : 'max-w-[95vw] w-full max-h-[95vh] h-full'} p-0 bg-black text-white border-gray-800`}>
        <div className="flex flex-col h-full overflow-hidden bg-black">
          {/* Header */}
          <div className="bg-black text-white p-6 flex-shrink-0 border-b border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Calculator className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-3xl font-bold text-white">{budgetData.name}</DialogTitle>
                      <p className="text-gray-400 text-lg mt-1">PRESUPUESTO NACIONAL</p>
                      
                      {/* Totales en tiempo real */}
                      <div className="flex gap-6 mt-3 text-sm">
                        {(() => {
                          const totals = calculateGrandTotals();
                          return (
                            <>
                              <div className="px-3 py-1 bg-green-600/20 rounded-full border border-green-500/30">
                                <span className="text-green-200 font-medium">Neto: €{totals.neto.toFixed(2)}</span>
                              </div>
                              <div className="px-3 py-1 bg-blue-600/20 rounded-full border border-blue-500/30">
                                <span className="text-blue-200 font-medium">Neto + IVA - IRPF: €{(totals.neto + totals.iva - totals.irpf).toFixed(2)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-white/80">
                    {budgetData.city && (
                      <span className="px-3 py-1 bg-white/10 rounded-full">
                        📍 {budgetData.city}
                      </span>
                    )}
                    {budgetData.venue && (
                      <span className="px-3 py-1 bg-white/10 rounded-full">
                        🏛️ {budgetData.venue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsFullscreen(!isFullscreen)} 
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="items" className="h-full flex flex-col">
              <div className="border-b bg-background px-6 py-3 flex-shrink-0">
                <TabsList className="grid w-full max-w-lg grid-cols-3">
                  <TabsTrigger value="items" className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Elementos
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vista General
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Resumen
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="items" className="flex-1 overflow-hidden p-0 m-0">
                <div className="h-full flex flex-col bg-gradient-to-b from-black to-gray-900">
                  {/* Category Management Header */}
                  <div className="bg-black text-white p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold">Gestión de Elementos y Categorías</h2>
                      <div className="flex gap-2">
                        {items.length === 0 && (
                          <Button
                            onClick={createTestData}
                            size="sm"
                            variant="outline"
                            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-200 border-yellow-400/20"
                          >
                            🧪 Crear datos de prueba
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Categories Section */}
                  <div className="flex-1 overflow-auto">
                    {budgetCategories.map((category) => {
                      const categoryItems = getCategoryItems(category.id);
                      const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                      
                      return (
                        <div key={category.id} className="mb-6">
                          {/* Category Header */}
                          <div className="bg-black text-white p-4 flex items-center justify-between border-b border-gray-700">
                            <div className="flex items-center gap-3">
                              <IconComponent className="w-5 h-5" />
                              <h3 className="text-lg font-bold tracking-wider">{category.name.toUpperCase()}</h3>
                              <span className="text-sm text-white/60">({categoryItems.length} elementos)</span>
                            </div>
                            <Button
                              onClick={() => addNewItem(category.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar
                            </Button>
                          </div>
                          
                          {/* Excel-style Table */}
                          <div className="bg-white border-b border-gray-300 overflow-x-auto">
                            {categoryItems.length === 0 ? (
                              <div className="p-8 text-center text-gray-500 bg-white">
                                <p>No hay elementos en esta categoría</p>
                                <Button
                                  onClick={() => addNewItem(category.id)}
                                  variant="ghost"
                                  className="mt-2 text-gray-600 hover:text-gray-900"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Agregar elemento a {category.name}
                                </Button>
                              </div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-100 hover:bg-gray-100">
                                    <TableHead className="font-bold text-black w-[200px]">Nombre</TableHead>
                                    <TableHead className="font-bold text-black w-[150px] text-center">Estado de facturación</TableHead>
                                    <TableHead className="font-bold text-black w-[120px] text-right">Precio Unit. (€)</TableHead>
                                    <TableHead className="font-bold text-black w-[80px] text-center">IVA (%)</TableHead>
                                    <TableHead className="font-bold text-black w-[80px] text-center">IRPF (%)</TableHead>
                                    <TableHead className="font-bold text-black w-[120px] text-right">Total (€)</TableHead>
                                    <TableHead className="font-bold text-black w-[100px] text-center">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {categoryItems.map((item, index) => (
                                    <TableRow 
                                      key={item.id} 
                                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-b border-gray-200`}
                                    >
                                      {/* Nombre */}
                                      <TableCell className="p-2">
                                        {editingItem === item.id ? (
                                          <Input
                                            value={editingItemValues.name || item.name}
                                            onChange={(e) => setEditingItemValues(prev => ({ ...prev, name: e.target.value }))}
                                            className="h-8 text-sm border-blue-300 focus:border-blue-500"
                                            autoFocus
                                          />
                                        ) : (
                                          <div 
                                            className="h-8 flex items-center cursor-pointer hover:bg-blue-100 px-2 rounded"
                                            onClick={() => startEditingItem(item)}
                                          >
                                            {item.name}
                                          </div>
                                        )}
                                      </TableCell>
                                      
                                      {/* Estado de facturación */}
                                      <TableCell className="p-2 text-center">
                                        {editingItem === item.id ? (
                                          <Select
                                            value={editingItemValues.billing_status || item.billing_status}
                                            onValueChange={(value) => setEditingItemValues(prev => ({ ...prev, billing_status: value as any }))}
                                          >
                                            <SelectTrigger className="h-8 text-sm border-blue-300 focus:border-blue-500">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="pendiente">Pendiente</SelectItem>
                                              <SelectItem value="factura_solicitada">Factura solicitada</SelectItem>
                                              <SelectItem value="factura_recibida">Factura recibida</SelectItem>
                                              <SelectItem value="pagada">Pagada</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <div 
                                            className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded"
                                            onClick={() => startEditingItem(item)}
                                          >
                                            <Badge variant={
                                              item.billing_status === 'pagada' ? 'default' :
                                              item.billing_status === 'factura_recibida' ? 'secondary' :
                                              item.billing_status === 'factura_solicitada' ? 'outline' : 'destructive'
                                            }>
                                              {item.billing_status === 'pendiente' ? 'Pendiente' :
                                               item.billing_status === 'factura_solicitada' ? 'Factura solicitada' :
                                               item.billing_status === 'factura_recibida' ? 'Factura recibida' :
                                               item.billing_status === 'pagada' ? 'Pagada' : item.billing_status}
                                            </Badge>
                                          </div>
                                        )}
                                      </TableCell>
                                      
                                      {/* Precio Unitario */}
                                      <TableCell className="p-2 text-right">
                                        {editingItem === item.id ? (
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={editingItemValues.unit_price || item.unit_price}
                                            onChange={(e) => setEditingItemValues(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                                            className="h-8 text-sm text-right border-blue-300 focus:border-blue-500"
                                          />
                                        ) : (
                                          <div 
                                            className="h-8 flex items-center justify-end cursor-pointer hover:bg-blue-100 px-2 rounded"
                                            onClick={() => startEditingItem(item)}
                                          >
                                            €{item.unit_price.toFixed(2)}
                                          </div>
                                        )}
                                      </TableCell>
                                      
                                      {/* IVA */}
                                      <TableCell className="p-2 text-center">
                                        {editingItem === item.id ? (
                                          <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={editingItemValues.iva_percentage || item.iva_percentage}
                                            onChange={(e) => setEditingItemValues(prev => ({ ...prev, iva_percentage: parseFloat(e.target.value) || 0 }))}
                                            className="h-8 text-sm text-center border-blue-300 focus:border-blue-500"
                                          />
                                        ) : (
                                          <div 
                                            className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded"
                                            onClick={() => startEditingItem(item)}
                                          >
                                            {item.iva_percentage}%
                                          </div>
                                        )}
                                      </TableCell>
                                      
                                      {/* IRPF */}
                                      <TableCell className="p-2 text-center">
                                        {editingItem === item.id ? (
                                          <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={editingItemValues.irpf_percentage || item.irpf_percentage || 15}
                                            onChange={(e) => setEditingItemValues(prev => ({ ...prev, irpf_percentage: parseFloat(e.target.value) || 15 }))}
                                            className="h-8 text-sm text-center border-blue-300 focus:border-blue-500"
                                          />
                                        ) : (
                                          <div 
                                            className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded"
                                            onClick={() => startEditingItem(item)}
                                          >
                                            {item.irpf_percentage || 15}%
                                          </div>
                                        )}
                                      </TableCell>
                                      
                                      {/* Total */}
                                      <TableCell className="p-2 text-right">
                                        <div className="h-8 flex items-center justify-end px-2 font-medium text-green-700">
                                          €{calculateTotal(editingItem === item.id ? { ...item, ...editingItemValues } : item).toFixed(2)}
                                        </div>
                                      </TableCell>
                                      
                                      {/* Acciones */}
                                      <TableCell className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          {editingItem === item.id ? (
                                            <>
                                              <Button
                                                onClick={saveItemEdits}
                                                size="sm"
                                                className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                              >
                                                <Save className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                onClick={() => {
                                                  setEditingItem(null);
                                                  setEditingItemValues({});
                                                }}
                                                size="sm"
                                                variant="outline"
                                                className="h-6 w-6 p-0"
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </>
                                          ) : (
                                            <>
                                              <Button
                                                onClick={() => startEditingItem(item)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 hover:bg-blue-100"
                                              >
                                                <Edit className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                onClick={() => deleteItem(item.id)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="overview" className="flex-1 overflow-auto p-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Vista General de Elementos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">Concepto</TableHead>
                              <TableHead className="w-[120px] text-center">Categoría</TableHead>
                              <TableHead className="w-[80px] text-center">Cantidad</TableHead>
                              <TableHead className="w-[120px] text-right">Precio Unit.</TableHead>
                              <TableHead className="w-[120px] text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item, index) => {
                              const total = calculateTotal(item);
                              
                              return (
                                <TableRow 
                                  key={item.id}
                                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                                >
                                  <TableCell>
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    {item.observations && (
                                      <div className="text-sm text-gray-500 mt-1">{item.observations}</div>
                                    )}
                                  </TableCell>
                                  
                                  <TableCell className="text-center">
                                    <span className="text-sm">{item.budget_categories?.name || 'Sin categoría'}</span>
                                  </TableCell>
                                  
                                  <TableCell className="text-center font-medium">
                                    {item.quantity}
                                  </TableCell>
                                  
                                  <TableCell className="text-right">
                                    €{item.unit_price.toFixed(2)}
                                  </TableCell>
                                  
                                  <TableCell className="text-right font-bold text-green-700">
                                    €{total.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        
                        {items.length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            No hay elementos en este presupuesto
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="flex-1 overflow-auto p-6">
                <div className="min-h-full flex items-center justify-center">
                  <Card className="w-full max-w-4xl mx-auto shadow-2xl border-2">
                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                        Resumen del Presupuesto
                      </CardTitle>
                      <div className="text-lg text-gray-600">
                        {budgetData.name}
                      </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <div className="space-y-8">
                        {/* Breakdown Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-200">
                            <div className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-2">
                              Subtotal
                            </div>
                            <div className="text-3xl font-bold text-blue-800">
                              €{items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-blue-600 mt-1">
                              Base imponible
                            </div>
                          </div>

                          <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
                            <div className="text-sm font-medium text-green-600 uppercase tracking-wider mb-2">
                              + IVA
                            </div>
                            <div className="text-3xl font-bold text-green-800">
                              €{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.iva_percentage / 100)), 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-green-600 mt-1">
                              Impuesto sobre el valor añadido
                            </div>
                          </div>

                          <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-200">
                            <div className="text-sm font-medium text-red-600 uppercase tracking-wider mb-2">
                              - IRPF
                            </div>
                            <div className="text-3xl font-bold text-red-800">
                              €{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * ((item.irpf_percentage || 15) / 100)), 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-red-600 mt-1">
                              Retención fiscal
                            </div>
                          </div>
                        </div>

                        {/* Separator */}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-gray-300"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500 font-medium">TOTAL FINAL</span>
                          </div>
                        </div>

                        {/* Total Final */}
                        <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border-2 border-primary/20 shadow-lg">
                          <div className="text-lg font-semibold text-primary/80 uppercase tracking-wider mb-3">
                            Importe Total
                          </div>
                          <div className="text-6xl font-black text-primary mb-3">
                            €{items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-primary/70 font-medium">
                            {items.length} elemento{items.length !== 1 ? 's' : ''} incluido{items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}