import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
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
import { InvoicePreviewDialog } from './InvoicePreviewDialog';
import { ConfirmationDialog } from './ui/confirmation-dialog';
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
  File,
  Maximize2,
  Minimize2,
  Eye,
  ArrowRight,
  Settings,
  Pencil,
  ChevronUp,
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
  billing_status: 'pendiente' | 'pagado' | 'facturado' | 'cancelado';
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
  const { profile, user } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetData, setBudgetData] = useState(budget);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploadingFactura, setUploadingFactura] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<{ url: string; name: string } | null>(null);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [editingItemValues, setEditingItemValues] = useState<Partial<BudgetItem>>({});
  const [newItem, setNewItem] = useState<{ categoryId: string; editing: boolean } | null>(null);
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

      console.log('Budget categories result:', { data, error });
      if (error) throw error;
      
      // If no categories exist, create default ones
      if (!data || data.length === 0) {
        console.log('No categories found, creating default ones...');
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
      console.log('Creating default categories...');
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
      console.log('Default categories created:', data);
      setBudgetCategories(data || []);
      
      // After creating categories, update existing items
      await updateExistingItemsWithCategories(data || []);
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  const updateExistingItemsWithCategories = async (categories: BudgetCategory[]) => {
    try {
      console.log('Updating existing items with categories...');
      const legacyMapping: Record<string, string> = {
        'equipo_artistico': 'Promoción',
        'rider_artistico': 'Promoción',
        'porcentajes': 'Comisiones',
        'equipo_tecnico': 'Comisiones',
        'transporte': 'Otros Gastos',
        'hospedaje': 'Otros Gastos',
        'otros_gastos': 'Otros Gastos',
        'varios': 'Otros Gastos'
      };

      for (const item of items) {
        if (item.category && !item.category_id) {
          const targetCategoryName = legacyMapping[item.category] || 'Otros Gastos';
          const targetCategory = categories.find(c => c.name === targetCategoryName);
          
          if (targetCategory) {
            console.log(`Updating item ${item.name} to category ${targetCategory.name}`);
            await supabase
              .from('budget_items')
              .update({ category_id: targetCategory.id })
              .eq('id', item.id);
          }
        }
      }
      
      // Refetch items to show the updated data
      await fetchBudgetItems();
    } catch (error) {
      console.error('Error updating existing items:', error);
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

      console.log('Budget items query result:', { data, error });
      if (error) throw error;
      const itemsWithDefaults = (data || []).map(item => ({
        ...item,
        irpf_percentage: item.irpf_percentage ?? 15
      }));
      console.log('Items with defaults:', itemsWithDefaults);
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

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('budget_categories')
        .insert([{
          name: newCategoryName.trim(),
          icon_name: 'DollarSign',
          created_by: user?.id,
          sort_order: budgetCategories.length
        }]);

      if (error) throw error;
      
      await fetchBudgetCategories();
      setNewCategoryName('');
      toast({
        title: "¡Éxito!",
        description: "Categoría creada correctamente"
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la categoría",
        variant: "destructive"
      });
    }
  };

  const updateCategoryOrder = async (categories: BudgetCategory[]) => {
    try {
      const updates = categories.map((category, index) => ({
        id: category.id,
        sort_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('budget_categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating category order:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedCategory(categoryId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', categoryId);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(categoryId);
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    
    if (!draggedCategory || draggedCategory === targetCategoryId) {
      setDraggedCategory(null);
      setDragOverCategory(null);
      return;
    }

    const draggedIndex = budgetCategories.findIndex(cat => cat.id === draggedCategory);
    const targetIndex = budgetCategories.findIndex(cat => cat.id === targetCategoryId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCategories = [...budgetCategories];
    const [draggedItem] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    setBudgetCategories(newCategories);
    await updateCategoryOrder(newCategories);

    setDraggedCategory(null);
    setDragOverCategory(null);

    toast({
      title: "¡Éxito!",
      description: "Orden de categorías actualizado"
    });
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      await fetchBudgetCategories();
      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Categoría eliminada correctamente"
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive"
      });
    }
  };

  const calculateTotal = (item: BudgetItem) => {
    const subtotal = item.quantity * item.unit_price;
    const iva = subtotal * (item.iva_percentage / 100);
    const irpf = subtotal * ((item.irpf_percentage || 15) / 100);
    return subtotal + iva - irpf;
  };

  const calculateGrandTotals = () => {
    const totals = items.reduce(
      (acc, item) => {
        const subtotal = item.quantity * item.unit_price;
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

  const startEditingItem = (item: BudgetItem) => {
    setEditingItem(item.id);
    setEditingItemValues(item);
  };

  const saveItemEdits = async () => {
    if (!editingItem || !editingItemValues) return;

    try {
      const { error } = await supabase
        .from('budget_items')
        .update(editingItemValues)
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

  const cancelItemEdits = () => {
    setEditingItem(null);
    setEditingItemValues({});
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
      setEditingItemValues(data);
      
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

  const updateItemCategory = async (itemId: string, newCategoryId: string) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .update({ category_id: newCategoryId })
        .eq('id', itemId);

      if (error) throw error;
      
      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Categoría actualizada correctamente"
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive"
      });
    }
  };

  const getCategoryItems = (categoryId: string) => {
    console.log('Getting items for category:', categoryId);
    console.log('All items:', items);
    console.log('All categories:', budgetCategories);
    
    const filteredItems = items.filter(item => {
      if (item.category_id === categoryId) {
        console.log('Item matched by category_id:', item);
        return true;
      }
      // Fallback to legacy category mapping
      const category = budgetCategories.find(c => c.id === categoryId);
      if (category && item.category) {
        const legacyMapping: Record<string, string[]> = {
          'Promoción': ['equipo_artistico', 'rider_artistico'],
          'Comisiones': ['porcentajes', 'equipo_tecnico'],
          'Otros Gastos': ['transporte', 'hospedaje', 'otros_gastos', 'varios']
        };
        const matches = legacyMapping[category.name]?.includes(item.category) || false;
        if (matches) {
          console.log('Item matched by legacy mapping:', item, 'for category:', category.name);
        }
        return matches;
      }
      return false;
    });
    
    console.log('Filtered items for category', categoryId, ':', filteredItems);
    return filteredItems;
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

  const getFilteredAndSortedItems = () => {
    let filteredItems = items;

    // Filter by search term
    if (searchTerm.trim()) {
      filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.observations?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.budget_categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort items
    return filteredItems.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'amount':
          const totalA = calculateTotal(a);
          const totalB = calculateTotal(b);
          comparison = totalA - totalB;
          break;
        case 'status':
          comparison = a.billing_status.localeCompare(b.billing_status);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pagado':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'facturado':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
                {editingBudget ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Calculator className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={budgetData.name}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, name: e.target.value }))}
                          className="text-3xl font-bold bg-white/10 border-white/20 text-white placeholder-white/50"
                          placeholder="Nombre del presupuesto"
                        />
                        <p className="text-gray-400 text-lg mt-1">PRESUPUESTO NACIONAL</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-white/80 text-sm">Ciudad</Label>
                        <Input
                          value={budgetData.city || ''}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, city: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder-white/50"
                          placeholder="Ciudad"
                        />
                      </div>
                      <div>
                        <Label className="text-white/80 text-sm">Venue</Label>
                        <Input
                          value={budgetData.venue || ''}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, venue: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder-white/50"
                          placeholder="Venue"
                        />
                      </div>
                      <div>
                        <Label className="text-white/80 text-sm">Fee (€)</Label>
                        <Input
                          type="number"
                          value={budgetData.fee || 0}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                          className="bg-white/10 border-white/20 text-white placeholder-white/50"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={updateBudget}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar cambios
                      </Button>
                      <Button
                        onClick={() => {
                          setBudgetData(budget);
                          setEditingBudget(false);
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
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
                      {budgetData.fee && (
                        <span className="px-3 py-1 bg-white/10 rounded-full">
                          💰 €{budgetData.fee}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="px-3 py-1 bg-yellow-600 text-black text-xs font-medium rounded-full">
                    {budgetData.budget_status}
                  </div>
                </div>
              </div>
              {!editingBudget && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsFullscreen(!isFullscreen)} 
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingBudget(true)} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={deleteBudget} className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/20">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
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
                      <Button
                        onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {showCategoryManagement ? 'Ocultar' : 'Gestionar'} Categorías
                      </Button>
                    </div>
                    
                    {/* Category Management Section */}
                    {showCategoryManagement && (
                      <div className="mt-4 p-4 bg-white/10 rounded-lg">
                        <h3 className="text-sm font-medium mb-3 text-white/80">Categorías Disponibles</h3>
                        <p className="text-xs text-white/60 mb-3">🎯 Arrastra las categorías para reordenarlas</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {budgetCategories.map((category) => {
                            const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                            const categoryItems = getCategoryItems(category.id);
                            
                            return (
                              <div 
                                key={category.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, category.id)}
                                onDragOver={(e) => handleDragOver(e, category.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, category.id)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-move transition-all duration-200 ${
                                  draggedCategory === category.id 
                                    ? 'bg-white/20 border-white/40 opacity-50 scale-95 shadow-lg' 
                                    : dragOverCategory === category.id
                                    ? 'bg-white/15 border-white/30 scale-105 animate-pulse shadow-md'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-[1.02]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-3 h-3 text-white/40" />
                                  <IconComponent className="w-4 h-4 text-white/70" />
                                  <span className="text-sm text-white">{category.name}</span>
                                  <span className="text-xs text-white/60">({categoryItems.length})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCategory(category.id);
                                    }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (categoryItems.length > 0) {
                                        if (window.confirm(`¿Eliminar categoría "${category.name}"? Se eliminarán también ${categoryItems.length} elementos.`)) {
                                          deleteCategory(category.id);
                                        }
                                      } else {
                                        deleteCategory(category.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Add New Category */}
                          <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-dashed border-white/20">
                            <Input
                              placeholder="Nueva categoría"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="flex-1 h-6 text-xs bg-white/10 border-white/20 text-white placeholder-white/50"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && newCategoryName.trim()) {
                                  addCategory();
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={addCategory}
                              disabled={!newCategoryName.trim()}
                              className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
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
                                    <TableHead className="font-bold text-black w-[100px] text-center">Cantidad</TableHead>
                                    <TableHead className="font-bold text-black w-[120px] text-right">Precio Unit. (€)</TableHead>
                                    <TableHead className="font-bold text-black w-[80px] text-center">IVA (%)</TableHead>
                                    <TableHead className="font-bold text-black w-[80px] text-center">IRPF (%)</TableHead>
                                    <TableHead className="font-bold text-black w-[120px] text-right">Total (€)</TableHead>
                                    <TableHead className="font-bold text-black w-[120px] text-center">Categoría</TableHead>
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
                                      
                                      {/* Cantidad */}
                                      <TableCell className="p-2 text-center">
                                        {editingItem === item.id ? (
                                          <Input
                                            type="number"
                                            min="1"
                                            value={editingItemValues.quantity || item.quantity}
                                            onChange={(e) => setEditingItemValues(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                            className="h-8 text-sm text-center border-blue-300 focus:border-blue-500"
                                          />
                                        ) : (
                                          <div 
                                            className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded"
                                            onClick={() => startEditingItem(item)}
                                          >
                                            {item.quantity}
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
                                      
                                      {/* Categoría */}
                                      <TableCell className="p-2 text-center">
                                        <Select
                                          value={item.category_id || category.id}
                                          onValueChange={(newCategoryId) => updateItemCategory(item.id, newCategoryId)}
                                        >
                                          <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {budgetCategories.map((cat) => (
                                              <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
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
                                                onClick={cancelItemEdits}
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
                      <CardTitle className="flex items-center justify-between">
                        Todos los Elementos del Presupuesto
                        <div className="flex items-center gap-4">
                          {/* Search */}
                          <div className="relative">
                            <Input
                              placeholder="Buscar elementos..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-64 pr-4"
                            />
                          </div>
                          
                          {/* Sort Controls */}
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Ordenar por:</Label>
                            <Select value={sortBy} onValueChange={(value: 'name' | 'amount' | 'status') => setSortBy(value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="name">Nombre</SelectItem>
                                <SelectItem value="amount">Monto</SelectItem>
                                <SelectItem value="status">Estado</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                              className="px-2"
                            >
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </Button>
                          </div>
                        </div>
                      </CardTitle>
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
                              <TableHead className="w-[80px] text-center">IVA</TableHead>
                              <TableHead className="w-[80px] text-center">IRPF</TableHead>
                              <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                              <TableHead className="w-[120px] text-right">Total</TableHead>
                              <TableHead className="w-[100px] text-center">Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredAndSortedItems().map((item, index) => {
                              const subtotal = item.quantity * item.unit_price;
                              const iva = subtotal * (item.iva_percentage / 100);
                              const irpf = subtotal * ((item.irpf_percentage || 15) / 100);
                              const total = calculateTotal(item);
                              
                              return (
                                <TableRow 
                                  key={item.id}
                                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                                >
                                  <TableCell>
                                    <div>
                                      <div className="font-medium text-gray-900">{item.name}</div>
                                      {item.observations && (
                                        <div className="text-sm text-gray-500 mt-1">{item.observations}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {item.budget_categories?.icon_name && (() => {
                                        const IconComponent = iconMap[item.budget_categories.icon_name as keyof typeof iconMap] || DollarSign;
                                        return <IconComponent className="w-4 h-4 text-gray-600" />;
                                      })()}
                                      <span className="text-sm">{item.budget_categories?.name || 'Sin categoría'}</span>
                                    </div>
                                  </TableCell>
                                  
                                  <TableCell className="text-center font-medium">
                                    {item.quantity}
                                  </TableCell>
                                  
                                  <TableCell className="text-right">
                                    €{item.unit_price.toFixed(2)}
                                  </TableCell>
                                  
                                  <TableCell className="text-center">
                                    {item.iva_percentage}%
                                  </TableCell>
                                  
                                  <TableCell className="text-center">
                                    {item.irpf_percentage || 15}%
                                  </TableCell>
                                  
                                  <TableCell className="text-right">
                                    €{subtotal.toFixed(2)}
                                  </TableCell>
                                  
                                  <TableCell className="text-right font-bold text-green-700">
                                    €{total.toFixed(2)}
                                  </TableCell>
                                  
                                  <TableCell className="text-center">
                                    <Badge 
                                      variant="outline" 
                                      className={`${getStatusColor(item.billing_status)} text-xs font-medium`}
                                    >
                                      {item.billing_status.charAt(0).toUpperCase() + item.billing_status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        
                        {getFilteredAndSortedItems().length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            {searchTerm ? 
                              `No se encontraron elementos que coincidan con "${searchTerm}"` : 
                              'No hay elementos en este presupuesto'
                            }
                          </div>
                        )}
                      </div>
                      
                      {/* Summary Footer */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-gray-900">
                              {getFilteredAndSortedItems().length}
                            </div>
                            <div className="text-sm text-gray-600">Elementos mostrados</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              €{getFilteredAndSortedItems().reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">Subtotal</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              +€{getFilteredAndSortedItems().reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.iva_percentage / 100)), 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">IVA Total</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-primary">
                              €{getFilteredAndSortedItems().reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">Total Final</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="flex-1 overflow-auto p-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumen Final</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div>
                          <div className="text-2xl font-bold">
                            €{items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">Subtotal</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            +€{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.iva_percentage / 100)), 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">IVA</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            -€{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * ((item.irpf_percentage || 15) / 100)), 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">IRPF</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-primary">
                            €{items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Final</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Dialogs */}
        {showTemplateDialog && (
          <SaveTemplateDialog
            open={showTemplateDialog}
            onOpenChange={setShowTemplateDialog}
            onSave={(name, description) => {
              // Handle save logic here
              console.log('Saving template:', name, description);
            }}
            budgetName={budgetData.name}
          />
        )}

        {previewInvoice && (
          <InvoicePreviewDialog
            open={!!previewInvoice}
            onOpenChange={() => setPreviewInvoice(null)}
            invoiceUrl={previewInvoice.url}
            invoiceName={previewInvoice.name}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}