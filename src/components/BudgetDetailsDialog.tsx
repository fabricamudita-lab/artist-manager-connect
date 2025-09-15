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
  GripVertical,
  PieChart as PieChartIcon
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
  const [editingBudgetAmount, setEditingBudgetAmount] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState<number>(budget.fee || 0);
  const [expandedQuantity, setExpandedQuantity] = useState<string | null>(null);

  useEffect(() => {
    if (open && budget) {
      setBudgetData(budget);
      setBudgetAmount(budget.fee || 0);
      fetchBudgetItems();
      fetchBudgetCategories();
    }
  }, [open, budget]);

  const saveBudgetAmount = async () => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ fee: budgetAmount })
        .eq('id', budget.id);

      if (error) throw error;
      
      setEditingBudgetAmount(false);
      setBudgetData(prev => ({ ...prev, fee: budgetAmount }));
      onUpdate();
      
      toast({
        title: "¡Éxito!",
        description: "Presupuesto actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating budget amount:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el presupuesto",
        variant: "destructive"
      });
    }
  };

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
    const subtotal = item.unit_price * (item.quantity || 1);
    const iva = subtotal * (item.iva_percentage / 100);
    const irpf = subtotal * ((item.irpf_percentage || 15) / 100);
    return subtotal + iva - irpf;
  };

  const calculateGrandTotals = () => {
    const totals = items.reduce(
      (acc, item) => {
        const subtotal = item.unit_price * (item.quantity || 1);
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

  // Funciones para el gráfico y resumen
  const getCategoryChartData = () => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'];
    
    return budgetCategories.map((category, index) => {
      const categoryItems = getCategoryItems(category.id);
      const total = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
      
      return {
        name: category.name,
        value: total,
        color: colors[index % colors.length]
      };
    }).filter(item => item.value > 0);
  };

  const getCategorySummaryData = () => {
    return budgetCategories.map(category => {
      const categoryItems = getCategoryItems(category.id);
      const total = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
      
      return {
        id: category.id,
        name: category.name,
        icon: category.icon_name,
        count: categoryItems.length,
        total: total
      };
    }).filter(item => item.count > 0);
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
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Calculator className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <DialogTitle className="text-3xl font-bold text-white">{budgetData.name}</DialogTitle>
                        
                        {/* Presupuesto editable */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">Presupuesto:</span>
                          {editingBudgetAmount ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={budgetAmount}
                                onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)}
                                className="h-8 w-24 text-sm bg-white/10 border-white/20 text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveBudgetAmount();
                                  } else if (e.key === 'Escape') {
                                    setEditingBudgetAmount(false);
                                    setBudgetAmount(budget.fee || 0);
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={saveBudgetAmount}
                                className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingBudgetAmount(false);
                                  setBudgetAmount(budget.fee || 0);
                                }}
                                className="h-6 w-6 p-0 bg-white/10 border-white/20 hover:bg-white/20"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingBudgetAmount(true)}
                              className="text-white hover:text-blue-300 transition-colors"
                              aria-label="Editar presupuesto"
                            >
                              {budgetAmount > 0 ? `€${budgetAmount.toFixed(2)}` : 'Sin definir'}
                              <Pencil className="w-3 h-3 ml-1 inline" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 text-lg">PRESUPUESTO NACIONAL</p>
                    </div>
                  </div>
                  
                  {/* 4-Block Financial Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {(() => {
                      const totals = calculateGrandTotals();
                      const difference = budgetAmount > 0 ? totals.total - budgetAmount : 0;
                      const percentageDiff = budgetAmount > 0 ? ((difference / budgetAmount) * 100) : 0;
                      
                      return (
                        <>
                          {/* 1. SUBTOTAL */}
                          <div 
                            className="text-center p-4 bg-blue-50/10 rounded-xl border border-blue-500/20 backdrop-blur-sm hover:bg-blue-50/15 transition-all"
                            title="Base imponible sin impuestos"
                          >
                            <div className="text-xs font-medium text-blue-300 uppercase tracking-wider mb-1">
                              SUBTOTAL
                            </div>
                            <div className="text-xl font-bold text-blue-200">
                              €{totals.neto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-blue-400">
                              Base imponible
                            </div>
                          </div>

                          {/* 2. IVA/IRPF APILADOS */}
                          <div className="space-y-2">
                            {/* IVA */}
                            <div 
                              className="text-center p-2 bg-green-50/10 rounded-lg border border-green-500/20 backdrop-blur-sm hover:bg-green-50/15 transition-all"
                              title="Impuesto sobre el valor añadido"
                            >
                              <div className="text-xs font-medium text-green-300 uppercase tracking-wider mb-0.5">
                                + IVA
                              </div>
                              <div className="text-lg font-bold text-green-200">
                                €{totals.iva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-green-400">
                                Impuesto sobre el valor añadido
                              </div>
                            </div>
                            
                            {/* IRPF */}
                            <div 
                              className="text-center p-2 bg-red-50/10 rounded-lg border border-red-500/20 backdrop-blur-sm hover:bg-red-50/15 transition-all"
                              title="Retención fiscal"
                            >
                              <div className="text-xs font-medium text-red-300 uppercase tracking-wider mb-0.5">
                                - IRPF
                              </div>
                              <div className="text-lg font-bold text-red-200">
                                €{totals.irpf.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-red-400">
                                Retención fiscal
                              </div>
                            </div>
                          </div>

                          {/* 3. TOTAL FINAL */}
                          <div 
                            className="text-center p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border-2 border-primary/30 backdrop-blur-sm hover:from-primary/25 hover:to-primary/15 transition-all"
                            title="Importe final con IVA e IRPF aplicados"
                          >
                            <div className="text-xs font-semibold text-primary-foreground uppercase tracking-wider mb-1">
                              TOTAL FINAL
                            </div>
                            <div className="text-xl font-black text-white">
                              €{totals.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-primary-foreground/80">
                              {items.length} elemento{items.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* 4. DIFERENCIA VS PRESUPUESTO */}
                          <div 
                            className={`text-center p-4 rounded-xl border backdrop-blur-sm transition-all ${
                              budgetAmount === 0 
                                ? 'bg-gray-50/10 border-gray-500/20 hover:bg-gray-50/15'
                                : percentageDiff > 0 
                                  ? 'bg-red-50/10 border-red-500/20 hover:bg-red-50/15'
                                  : percentageDiff < 0 
                                    ? 'bg-green-50/10 border-green-500/20 hover:bg-green-50/15'
                                    : 'bg-gray-50/10 border-gray-500/20 hover:bg-gray-50/15'
                            }`}
                            title={budgetAmount > 0 ? `Diferencia: ${difference >= 0 ? '+' : ''}€${Math.abs(difference).toFixed(2)}` : 'Añade un presupuesto para ver la diferencia'}
                          >
                            <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                              budgetAmount === 0 
                                ? 'text-gray-300'
                                : percentageDiff > 0 
                                  ? 'text-red-300'
                                  : percentageDiff < 0 
                                    ? 'text-green-300'
                                    : 'text-gray-300'
                            }`}>
                              DIFERENCIA
                            </div>
                            <div className={`text-xl font-bold ${
                              budgetAmount === 0 
                                ? 'text-gray-200'
                                : percentageDiff > 0 
                                  ? 'text-red-200'
                                  : percentageDiff < 0 
                                    ? 'text-green-200'
                                    : 'text-gray-200'
                            }`}>
                              {budgetAmount === 0 ? '—' : `${percentageDiff >= 0 ? '+' : ''}${percentageDiff.toFixed(1)}%`}
                            </div>
                            <div className={`text-xs ${
                              budgetAmount === 0 
                                ? 'text-gray-400'
                                : percentageDiff > 0 
                                  ? 'text-red-400'
                                  : percentageDiff < 0 
                                    ? 'text-green-400'
                                    : 'text-gray-400'
                            }`}>
                              {budgetAmount === 0 
                                ? 'Añade un presupuesto'
                                : `Δ €${Math.abs(difference).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vs presupuesto`
                              }
                            </div>
                          </div>
                        </>
                      );
                    })()}
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
                  <TabsTrigger value="resumen" className="flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" />
                    Resumen
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vista General
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
                                     <TableHead className="font-bold text-black w-[140px] text-right">Precio Unit. (€)</TableHead>
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
                                             className="h-8 text-sm border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                             autoFocus
                                           />
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
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
                                      
                                       {/* Precio Unitario con botón + para cantidad */}
                                       <TableCell className="p-2 text-right">
                                         {editingItem === item.id ? (
                                           <div className="flex items-center gap-1">
                                             <Input
                                               type="number"
                                               step="0.01"
                                               value={editingItemValues.unit_price || item.unit_price}
                                               onChange={(e) => setEditingItemValues(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                                               className="h-8 text-sm text-right border-blue-300 focus:border-blue-500 text-gray-900 bg-white flex-1"
                                             />
                                             {(expandedQuantity === item.id || (item.quantity && item.quantity > 1)) && (
                                               <>
                                                 <span className="text-gray-500 text-sm">×</span>
                                                 <Input
                                                   type="number"
                                                   min="1"
                                                   value={editingItemValues.quantity || item.quantity || 1}
                                                   onChange={(e) => setEditingItemValues(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                                   className="h-8 w-16 text-sm text-center border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                                 />
                                               </>
                                             )}
                                             <Button
                                               size="sm"
                                               variant="ghost"
                                               onClick={() => setExpandedQuantity(expandedQuantity === item.id ? null : item.id)}
                                               className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                             >
                                               <Plus className="w-3 h-3" />
                                             </Button>
                                           </div>
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-end cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900 gap-1"
                                             onClick={() => startEditingItem(item)}
                                           >
                                             <span>€{item.unit_price.toFixed(2)}</span>
                                             {item.quantity && item.quantity > 1 && (
                                               <span className="text-gray-500 text-sm">× {item.quantity}</span>
                                             )}
                                             <Button
                                               size="sm"
                                               variant="ghost"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setExpandedQuantity(expandedQuantity === item.id ? null : item.id);
                                               }}
                                               className="h-4 w-4 p-0 text-blue-600 hover:text-blue-800 ml-1"
                                             >
                                               <Plus className="w-2 h-2" />
                                             </Button>
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
                                             className="h-8 text-sm text-center border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                           />
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
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
                                             className="h-8 text-sm text-center border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                           />
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
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

              <TabsContent value="resumen" className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico circular */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Desglose por Categoría</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getCategoryChartData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                            >
                              {getCategoryChartData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [`€${Number(value).toFixed(2)}`, name]}
                              labelFormatter={(label) => `Categoría: ${label}`}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))'
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabla resumen */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumen por Categoría</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-center">Nº Elementos</TableHead>
                            <TableHead className="text-right">Total (€)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCategorySummaryData().map((category) => {
                            const IconComponent = iconMap[category.icon as keyof typeof iconMap] || DollarSign;
                            return (
                              <TableRow key={category.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4 text-primary" />
                                    {category.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {category.count}
                                </TableCell>
                                <TableCell className="text-right">
                                  €{category.total.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="overview" className="flex-1 overflow-auto p-6">
                <div className="space-y-6">
                  {/* Gráfico circular de categorías */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        Desglose por Categoría
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getCategoryChartData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                            >
                              {getCategoryChartData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [`€${value.toFixed(2)}`, 'Importe']}
                              labelFormatter={(label) => `${label}`}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))'
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabla detallada de elementos */}
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

            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}