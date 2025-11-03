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
  ArrowLeft,
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
  PieChart as PieChartIcon,
  CalendarIcon,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FolderOpen,
  ExternalLink
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import EnhancedBudgetItemsView from '@/components/EnhancedBudgetItemsView';
import LiquidarFacturasDialog from '@/components/LiquidarFacturasDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  parent_folder_id?: string;
  event_date: string;
  event_time: string;
  fee: number;
  profiles?: { full_name: string };
  projects?: { id: string; name: string };
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
  billing_status: 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada' | 'cancelado';
  invoice_link?: string;
  observations?: string;
  category_id?: string;
  fecha_emision?: string;
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

// Helper functions for billing status mapping
const mapDbToFrontend = (dbStatus: string): 'pendiente' | 'factura_solicitada' | 'factura_recibida' | 'pagada' | 'cancelado' => {
  switch (dbStatus) {
    case 'pendiente': return 'pendiente';
    case 'pagado': return 'pagada';
    case 'facturado': return 'factura_recibida';
    case 'factura_solicitada': return 'factura_solicitada';
    case 'cancelado': return 'cancelado';
    default: return 'pendiente';
  }
};

const mapFrontendToDb = (frontendStatus: string): 'pendiente' | 'pagado' | 'facturado' | 'cancelado' | 'factura_solicitada' => {
  switch (frontendStatus) {
    case 'pendiente': return 'pendiente';
    case 'pagada': return 'pagado';
    case 'factura_recibida': return 'facturado';
    case 'factura_solicitada': return 'factura_solicitada';
    case 'cancelado': return 'cancelado';
    default: return 'pendiente';
  }
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
  
  // Element movement states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOverElement, setDragOverElement] = useState<string | null>(null);
  const [editingItemValues, setEditingItemValues] = useState<Partial<BudgetItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'fecha_emision' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingBudgetAmount, setEditingBudgetAmount] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState<number>(budget.fee || 0);
  const [expandedQuantity, setExpandedQuantity] = useState<string | null>(null);
  const [showLiquidarDialog, setShowLiquidarDialog] = useState(false);

  useEffect(() => {
    if (open && budget) {
      setBudgetData(budget);
      setBudgetAmount(budget.fee || 0);
      fetchBudgetItems();
      fetchBudgetCategories();
      
      // Set up real-time subscription for budget items
      const channel = supabase
        .channel('budget-items-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'budget_items',
            filter: `budget_id=eq.${budget.id}`
          },
          (payload) => {
            console.log('Real-time budget items change:', payload);
            // Refresh items to update charts and tables
            fetchBudgetItems();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'budget_categories'
          },
          (payload) => {
            console.log('Real-time budget categories change:', payload);
            // Refresh categories to update order and data
            fetchBudgetCategories();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
      setOpenCategories(new Set((data || []).map(c => c.id)));
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
      setOpenCategories(new Set((data || []).map(c => c.id)));
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
        billing_status: mapDbToFrontend(item.billing_status || 'pendiente')
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

  const getFilteredAndSortedItems = (categoryId: string) => {
    let categoryItems = getCategoryItems(categoryId);
    
    // Apply search filter
    if (searchTerm) {
      categoryItems = categoryItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_price.toString().includes(searchTerm) ||
        (item.unit_price * item.quantity).toString().includes(searchTerm)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      categoryItems = categoryItems.filter(item => item.billing_status === statusFilter);
    }
    
    // Apply sorting
    categoryItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'amount':
          aValue = calculateTotal(a);
          bValue = calculateTotal(b);
          break;
        case 'fecha_emision':
          aValue = a.fecha_emision ? new Date(a.fecha_emision).getTime() : 0;
          bValue = b.fecha_emision ? new Date(b.fecha_emision).getTime() : 0;
          break;
        case 'status':
          aValue = a.billing_status;
          bValue = b.billing_status;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return categoryItems;
  };

  // Funciones para el gráfico y resumen
  const getCategoryChartData = () => {
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red  
      '#10b981', // emerald
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#f97316', // orange
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#ec4899', // pink
      '#6366f1'  // indigo
    ];
    
    // Sort categories by their original order from fetchBudgetCategories
    const sortedCategories = [...budgetCategories].sort((a, b) => {
      // Use creation date as tie-breaker to maintain consistency
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
    const chartData = sortedCategories.map((category, index) => {
      const categoryItems = getCategoryItems(category.id);
      const total = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
      
      return {
        name: category.name,
        value: total,
        color: colors[index % colors.length],
        count: categoryItems.length
      };
    }).filter(item => item.value > 0); // Only show categories with value
    
    return chartData;
  };

  const getCategorySummaryData = () => {
    // Sort categories by their original order from fetchBudgetCategories
    const sortedCategories = [...budgetCategories].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
    return sortedCategories.map(category => {
      const categoryItems = getCategoryItems(category.id);
      const total = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
      
      return {
        id: category.id,
        name: category.name,
        icon: category.icon_name,
        count: categoryItems.length,
        total: total
      };
    }); // Show all categories, even empty ones
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
          observations: '',
          fecha_emision: null
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
    console.log('🔧 Starting edit for item:', item.name, 'billing_status:', item.billing_status);
    setEditingItem(item.id);
    // Ensure all values are properly set with current item data
    setEditingItemValues({
      ...item,
      billing_status: item.billing_status || 'pendiente'
    });
    console.log('✅ Edit values set:', { billing_status: item.billing_status || 'pendiente' });
  };

  const saveItemEdits = async () => {
    if (!editingItem || !editingItemValues) return;

    console.log('💾 Saving item edits:', {
      editingItem,
      editingItemValues,
      originalValues: items.find(item => item.id === editingItem)
    });

    try {
      // Exclude relational fields that don't exist in the table
      const { budget_categories, ...itemData } = editingItemValues;
      
      const updateData = {
        ...itemData,
        // Map frontend values to database values
        billing_status: (editingItemValues.billing_status === 'pagada' ? 'pagado' :
                        editingItemValues.billing_status === 'factura_recibida' ? 'facturado' :
                        editingItemValues.billing_status === 'factura_solicitada' ? 'pendiente' :
                        'pendiente') as 'pendiente' | 'pagado' | 'facturado' | 'cancelado'
      };
      
      console.log('📝 Update data to send:', updateData);
      
      const { data, error } = await supabase
        .from('budget_items')
        .update(updateData)
        .eq('id', editingItem)
        .select();

      console.log('🔄 Supabase update response:', { data, error });

      if (error) {
        console.error('❌ Supabase error details:', error);
        throw error;
      }
      
      setEditingItem(null);
      setEditingItemValues({});
      await fetchBudgetItems();
      
      toast({
        title: "¡Éxito!",
        description: "Elemento actualizado correctamente"
      });
    } catch (error) {
      console.error('❌ Error updating item:', error);
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

  const updateCategoryName = async (categoryId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('budget_categories')
        .update({ name: newName })
        .eq('id', categoryId);

      if (error) throw error;
      
      await fetchBudgetCategories();
      setEditingCategory(null);
      setNewCategoryName('');
      
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

  const addNewCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({
          name: 'Nueva Categoría',
          icon_name: 'DollarSign',
          created_by: user?.id,
          sort_order: budgetCategories.length
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchBudgetCategories();
      setEditingCategory(data.id);
      setNewCategoryName(data.name);
      
      toast({
        title: "¡Éxito!",
        description: "Nueva categoría creada"
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

  const reorderCategories = async (draggedId: string, targetId: string) => {
    try {
      const draggedIndex = budgetCategories.findIndex(cat => cat.id === draggedId);
      const targetIndex = budgetCategories.findIndex(cat => cat.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      // Create new array with reordered categories
      const newCategories = [...budgetCategories];
      const [removed] = newCategories.splice(draggedIndex, 1);
      newCategories.splice(targetIndex, 0, removed);

      // Update sort_order for all affected categories
      const updates = newCategories.map((category, index) => ({
        id: category.id,
        sort_order: index
      }));

      // Update in database
      for (const update of updates) {
        const { error } = await supabase
          .from('budget_categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      // Refresh categories to get updated order
      await fetchBudgetCategories();
      
      toast({
        title: "Orden actualizado",
        description: "Las categorías se han reordenado exitosamente"
      });
    } catch (error) {
      console.error('Error reordering categories:', error);
      toast({
        title: "Error",
        description: "No se pudo reordenar las categorías",
        variant: "destructive"
      });
    }
  };

  // Función para generar PDF del presupuesto
  const downloadPDF = () => {
    const doc = new jsPDF();
    const totals = calculateGrandTotals();
    
    // Título
    doc.setFontSize(20);
    doc.text(budgetData.name, 14, 22);
    
    // Información del presupuesto
    doc.setFontSize(10);
    doc.text(`Presupuestado: €${budgetAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 14, 32);
    doc.text(`Total final: €${totals.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 14, 38);
    
    // Tabla de elementos
    const tableData = items.map(item => [
      item.name,
      item.category,
      item.quantity.toString(),
      `€${item.unit_price.toFixed(2)}`,
      `${item.iva_percentage}%`,
      `${item.irpf_percentage || 15}%`,
      `€${calculateTotal(item).toFixed(2)}`,
      item.billing_status
    ]);
    
    autoTable(doc, {
      head: [['Nombre', 'Categoría', 'Cant.', 'Precio Unit.', 'IVA', 'IRPF', 'Total', 'Estado']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 0, 0] }
    });
    
    doc.save(`${budgetData.name}.pdf`);
    
    toast({
      title: "PDF descargado",
      description: "El presupuesto se ha descargado correctamente",
    });
  };

  // Función para generar Excel del presupuesto
  const downloadExcel = () => {
    const totals = calculateGrandTotals();
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Nombre,Categoría,Cantidad,Precio Unitario,IVA %,IRPF %,Total,Estado,Fecha Emisión,Enlace Factura\n";
    
    items.forEach(item => {
      const row = [
        `"${item.name}"`,
        `"${item.category}"`,
        item.quantity,
        item.unit_price.toFixed(2),
        item.iva_percentage,
        item.irpf_percentage || 15,
        calculateTotal(item).toFixed(2),
        item.billing_status,
        item.fecha_emision || '',
        `"${item.invoice_link || ''}"`
      ].join(',');
      csvContent += row + "\n";
    });
    
    // Añadir totales
    csvContent += "\n";
    csvContent += `Total Neto,,,,,,,${totals.neto.toFixed(2)}\n`;
    csvContent += `Total IVA,,,,,,,${totals.iva.toFixed(2)}\n`;
    csvContent += `Total IRPF,,,,,,,${totals.irpf.toFixed(2)}\n`;
    csvContent += `TOTAL FINAL,,,,,,,${totals.total.toFixed(2)}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${budgetData.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Excel descargado",
      description: "El presupuesto se ha exportado a CSV",
    });
  };

  // Función para descargar todas las facturas
  const downloadAllInvoices = async () => {
    const itemsWithInvoices = items.filter(item => item.invoice_link);
    
    if (itemsWithInvoices.length === 0) {
      toast({
        title: "Sin facturas",
        description: "No hay facturas para descargar",
        variant: "destructive",
      });
      return;
    }
    
    itemsWithInvoices.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.invoice_link, '_blank');
      }, index * 500);
    });
    
    toast({
      title: "Descargando facturas",
      description: `Se abrirán ${itemsWithInvoices.length} facturas`,
    });
  };

  // Función para descargar facturas seleccionadas
  const downloadSelectedInvoices = () => {
    const selectedItemsWithInvoices = items.filter(item => 
      selectedItems.has(item.id) && item.invoice_link
    );
    
    if (selectedItemsWithInvoices.length === 0) {
      toast({
        title: "Sin facturas",
        description: "Ningún elemento seleccionado tiene factura",
        variant: "destructive",
      });
      return;
    }
    
    selectedItemsWithInvoices.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.invoice_link, '_blank');
      }, index * 500);
    });
    
    toast({
      title: "Descargando facturas",
      description: `Se abrirán ${selectedItemsWithInvoices.length} facturas`,
    });
  };

  // Element movement functions
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllItemsInCategory = (categoryId: string) => {
    const categoryItems = getCategoryItems(categoryId);
    const newSelection = new Set(selectedItems);
    categoryItems.forEach(item => newSelection.add(item.id));
    setSelectedItems(newSelection);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const moveSelectedItems = async (targetCategoryId: string) => {
    if (selectedItems.size === 0) return;

    console.log('🔄 moveSelectedItems called with:', {
      targetCategoryId,
      selectedItems: Array.from(selectedItems),
      budgetCategories: budgetCategories.map(c => ({ id: c.id, name: c.name }))
    });

    try {
      // Update items in batch
      const updates = Array.from(selectedItems).map(async (itemId) => {
        const currentItem = items.find(item => item.id === itemId);
        if (!currentItem) {
          console.log('❌ Item not found:', itemId);
          return null;
        }

        const targetCategory = budgetCategories.find(c => c.id === targetCategoryId);
        console.log('📝 Updating item:', {
          itemId,
          currentItem: currentItem.name,
          targetCategoryId,
          targetCategoryName: targetCategory?.name,
          currentCategoryId: currentItem.category_id,
          currentCategory: currentItem.category
        });

        const { data, error } = await supabase
          .from('budget_items')
          .update({ 
            category_id: targetCategoryId,
            category: targetCategory?.name || 'Sin categoría' 
          })
          .eq('id', itemId)
          .select();

        if (error) {
          console.error('❌ Error updating item:', itemId, error);
          return { success: false, error, itemId };
        }

        console.log('✅ Successfully updated item:', itemId, data);
        return { success: true, data, itemId };
      });

      const results = await Promise.all(updates.filter(Boolean));
      console.log('✅ All update results:', results);

      // Check if there were any errors
      const errors = results.filter(r => r && !r.success);
      if (errors.length > 0) {
        console.error('❌ Some updates failed:', errors);
        throw new Error(`Failed to update ${errors.length} items`);
      }

      // Update local state
      const updatedItems = items.map(item => {
        if (selectedItems.has(item.id)) {
          const targetCategory = budgetCategories.find(c => c.id === targetCategoryId);
          return { 
            ...item, 
            category_id: targetCategoryId,
            category: targetCategory?.name || 'Sin categoría' 
          };
        }
        return item;
      });

      setItems(updatedItems);
      setSelectedItems(new Set());

      toast({
        title: "Elementos movidos",
        description: `${selectedItems.size} elemento(s) movidos exitosamente`,
      });
    } catch (error) {
      console.error('❌ Error moving items:', error);
      toast({
        title: "Error",
        description: "No se pudieron mover los elementos",
        variant: "destructive",
      });
    }
  };

  const updateSelectedItemsBillingStatus = async (billingStatus: string) => {
    if (selectedItems.size === 0) return;

    console.log('🔄 updateSelectedItemsBillingStatus called with:', {
      billingStatus,
      selectedItems: Array.from(selectedItems)
    });

    try {
      // Update items in batch
      const updates = Array.from(selectedItems).map(async (itemId) => {
        const { error } = await supabase
          .from('budget_items')
          .update({ billing_status: mapFrontendToDb(billingStatus) as any })
          .eq('id', itemId);
        
        if (error) {
          console.error('Error updating item billing status:', itemId, error);
          throw error;
        }
      });

      await Promise.all(updates);
      
      // Fetch fresh data to ensure consistency
      await fetchBudgetItems();
      
      // Clear selection
      setSelectedItems(new Set());

      const statusLabels = {
        'pendiente': 'Pendiente',
        'factura_solicitada': 'Factura solicitada',
        'factura_recibida': 'Factura recibida',
        'pagada': 'Pagada',
        'pagado': 'Pagada',
        'facturado': 'Factura recibida',
        'cancelado': 'Cancelado'
      };

      toast({
        title: "Estado de facturación actualizado",
        description: `${selectedItems.size} elemento(s) cambiados a "${statusLabels[billingStatus as keyof typeof statusLabels] || billingStatus}"`,
      });
    } catch (error) {
      console.error('Error updating billing status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de facturación",
        variant: "destructive"
      });
    }
  };

  const moveItemToCategory = async (itemId: string, targetCategoryId: string) => {
    try {
      const targetCategory = budgetCategories.find(c => c.id === targetCategoryId);
      
      await supabase
        .from('budget_items')
        .update({ category: targetCategory?.name || 'Sin categoría' })
        .eq('id', itemId);

      const updatedItems = items.map(item => 
        item.id === itemId 
          ? { ...item, category: targetCategory?.name || 'Sin categoría' }
          : item
      );

      setItems(updatedItems);

      toast({
        title: "Elemento movido",
        description: `Elemento movido a ${targetCategory?.name}`,
      });
    } catch (error) {
      console.error('Error moving item:', error);
      toast({
        title: "Error",
        description: "No se pudo mover el elemento",
        variant: "destructive",
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
          {/* Compact Header */}
          <div className="bg-black text-white p-4 flex-shrink-0 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-bold text-white">{budgetData.name}</DialogTitle>
                    {budgetData.parent_folder_id && budgetData.projects && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/10"
                        onClick={() => window.open(`/projects?folder=${budgetData.parent_folder_id}`, '_blank')}
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {budgetData.projects.name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">PRESUPUESTO NACIONAL</p>
                </div>
              </div>
              
              {/* Presupuesto editable compacto */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-400">Presupuestado:</div>
                  {editingBudgetAmount ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)}
                        className="h-7 w-20 text-sm bg-white/10 border-white/20 text-white"
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
                      className="text-white hover:text-blue-300 transition-colors font-medium"
                      aria-label="Editar presupuesto"
                    >
                      {budgetAmount > 0 ? `€${budgetAmount.toFixed(2)}` : 'Sin definir'}
                      <Pencil className="w-3 h-3 ml-1 inline" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Botón de Descargas */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={downloadPDF}>
                        <FileText className="w-4 h-4 mr-2" />
                        Descargar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Descargar Excel (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={downloadAllInvoices}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar todas las facturas
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={downloadSelectedInvoices}
                        disabled={selectedItems.size === 0}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar facturas seleccionadas ({selectedItems.size})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsFullscreen(!isFullscreen)} 
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 w-8 p-0"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Compact Financial Summary */}
            <div className="mt-4">
              {(() => {
                const totals = calculateGrandTotals();
                const difference = budgetAmount > 0 ? totals.total - budgetAmount : 0;
                const percentageDiff = budgetAmount > 0 ? ((difference / budgetAmount) * 100) : 0;
                
                return (
                  <div className="grid grid-cols-5 gap-2">
                    {/* Presupuesto (neto) */}
                    <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-card/50 rounded-lg border border-border">
                      <div className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-1">PRESUPUESTO</div>
                      <div className="text-xl font-bold text-foreground">
                        €{budgetAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Costes finales (neto) */}
                    <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-card/50 rounded-lg border border-border">
                      <div className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-1">COSTES FINALES</div>
                      <div className="text-xl font-bold text-foreground">
                        €{totals.neto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Total (con IVA & IRPF) */}
                    <div className="flex flex-col justify-center items-center h-[80px] p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">TOTAL FINAL</div>
                      <div className="text-xl font-bold text-primary">
                        €{totals.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] mt-0.5">
                        <span className="text-green-600">+€{totals.iva.toFixed(0)} IVA</span>
                        <span className="text-red-600">-€{totals.irpf.toFixed(0)} IRPF</span>
                      </div>
                    </div>

                    {/* Beneficio (neto) */}
                    <div className={`flex flex-col justify-center items-center h-[80px] p-3 rounded-lg border ${
                      budgetAmount === 0 
                        ? 'bg-muted/30 border-border'
                        : difference > 0 
                          ? 'bg-green-500/10 border-green-500/20'
                          : difference < 0 
                            ? 'bg-destructive/10 border-destructive/20'
                            : 'bg-muted/30 border-border'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                        budgetAmount === 0 
                          ? 'text-muted-foreground'
                          : difference > 0 
                            ? 'text-green-600'
                            : difference < 0 
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                      }`}>
                        BENEFICIO
                      </div>
                      <div className={`text-xl font-bold ${
                        budgetAmount === 0 
                          ? 'text-muted-foreground'
                          : difference > 0 
                            ? 'text-green-600'
                            : difference < 0 
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                      }`}>
                        {budgetAmount === 0 ? '—' : `€${Math.abs(difference).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
                      </div>
                    </div>

                    {/* Diferencia (%) */}
                    <div className={`flex flex-col justify-center items-center h-[80px] p-3 rounded-lg border ${
                      budgetAmount === 0 
                        ? 'bg-muted/30 border-border'
                        : percentageDiff < 0 
                          ? 'bg-green-500/10 border-green-500/20'
                          : percentageDiff > 0 
                            ? 'bg-destructive/10 border-destructive/20'
                            : 'bg-muted/30 border-border'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                        budgetAmount === 0 
                          ? 'text-muted-foreground'
                          : percentageDiff < 0 
                            ? 'text-green-600'
                            : percentageDiff > 0 
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                      }`}>
                        DIFERENCIA
                      </div>
                      <div className={`text-xl font-bold ${
                        budgetAmount === 0 
                          ? 'text-muted-foreground'
                          : percentageDiff < 0 
                            ? 'text-green-600'
                            : percentageDiff > 0 
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                      }`}>
                        {budgetAmount === 0 ? '—' : `${percentageDiff.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Location info compacto */}
            {(budgetData.city || budgetData.venue) && (
              <div className="flex gap-2 mt-3 text-xs text-white/70">
                {budgetData.city && (
                  <span className="px-2 py-1 bg-white/10 rounded-md">📍 {budgetData.city}</span>
                )}
                {budgetData.venue && (
                  <span className="px-2 py-1 bg-white/10 rounded-md">🏛️ {budgetData.venue}</span>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="items" className="h-full flex flex-col">
              <div className="border-b bg-background px-4 py-2 flex-shrink-0">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="items" className="flex items-center gap-2 text-sm">
                    <Calculator className="w-4 h-4" />
                    Elementos
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4" />
                    Vista General
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="items" className="flex-1 overflow-hidden p-0 m-0">
                <div className="h-full flex flex-col bg-gradient-to-b from-black to-gray-900">
                   {/* Category Management Header - Compact */}
                  <div className="bg-black text-white p-3 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold">Gestión de Elementos y Categorías</h2>
                       <div className="flex gap-2">
                         <Button
                           onClick={() => setShowLiquidarDialog(true)}
                           size="sm"
                           variant="outline"
                           className="bg-green-600/20 hover:bg-green-600/30 text-green-200 border-green-400/20 text-xs"
                         >
                           <CheckCircle className="w-3 h-3 mr-1" />
                           Liquidar Facturas
                         </Button>
                         <Button
                           onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                           size="sm"
                           variant="outline"
                           className="bg-gray-600/20 hover:bg-gray-600/30 text-gray-200 border-gray-400/20 text-xs"
                         >
                           <Settings className="w-3 h-3 mr-1" />
                           Categorías
                         </Button>
                         {items.length === 0 && (
                           <Button
                             onClick={createTestData}
                             size="sm"
                             variant="outline"
                             className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-200 border-yellow-400/20 text-xs"
                           >
                             🧪 Datos prueba
                           </Button>
                         )}
                       </div>
                    </div>
                   </div>
                   
                   {/* Category Management Interface */}
                   {showCategoryManagement && (
                     <div className="bg-gray-800 text-white p-4 border-b border-gray-600">
                       <h3 className="text-md font-bold mb-3">Gestión de Categorías</h3>
                        <div className="space-y-3">
                          {budgetCategories.map((category, index) => (
                            <div 
                              key={category.id}
                              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-move
                                ${draggedCategory === category.id 
                                  ? 'bg-gray-600 opacity-60 shadow-lg transform scale-105' 
                                  : dragOverCategory === category.id 
                                    ? 'bg-gray-600 shadow-md border-2 border-blue-400' 
                                    : 'bg-gray-700 hover:bg-gray-650'
                                }`}
                              draggable
                              onDragStart={(e) => {
                                setDraggedCategory(category.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (draggedCategory && draggedCategory !== category.id) {
                                  setDragOverCategory(category.id);
                                }
                              }}
                              onDragLeave={(e) => {
                                // Only clear if leaving the entire item, not just child elements
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                  setDragOverCategory(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedCategory && dragOverCategory && draggedCategory !== dragOverCategory) {
                                  reorderCategories(draggedCategory, dragOverCategory);
                                }
                                setDraggedCategory(null);
                                setDragOverCategory(null);
                              }}
                              onDragEnd={() => {
                                setDraggedCategory(null);
                                setDragOverCategory(null);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <GripVertical 
                                  className={`w-5 h-5 transition-colors duration-200 ${
                                    draggedCategory === category.id 
                                      ? 'text-blue-400 cursor-grabbing' 
                                      : 'text-gray-400 hover:text-gray-200 cursor-grab'
                                  }`} 
                                />
                               {iconMap[category.icon_name as keyof typeof iconMap] && 
                                 React.createElement(iconMap[category.icon_name as keyof typeof iconMap], { 
                                   className: "w-4 h-4" 
                                 })
                               }
                               {editingCategory === category.id ? (
                                 <Input
                                   value={newCategoryName}
                                   onChange={(e) => setNewCategoryName(e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       // Save category name
                                       updateCategoryName(category.id, newCategoryName);
                                     } else if (e.key === 'Escape') {
                                       setEditingCategory(null);
                                       setNewCategoryName('');
                                     }
                                   }}
                                   className="bg-gray-600 border-gray-500 text-white"
                                   autoFocus
                                 />
                               ) : (
                                 <span 
                                   className="cursor-pointer hover:text-blue-300"
                                   onClick={() => {
                                     setEditingCategory(category.id);
                                     setNewCategoryName(category.name);
                                   }}
                                 >
                                   {category.name}
                                 </span>
                               )}
                             </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-300">
                              {getCategoryItems(category.id).length} elementos
                            </span>
                            {getCategoryItems(category.id).length > 0 && (
                              <Button
                                onClick={() => selectAllItemsInCategory(category.id)}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-600"
                              >
                                Seleccionar todos
                              </Button>
                            )}
                               {editingCategory === category.id ? (
                                 <div className="flex gap-1">
                                   <Button
                                     onClick={() => updateCategoryName(category.id, newCategoryName)}
                                     size="sm"
                                     className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                   >
                                     <Save className="w-3 h-3" />
                                   </Button>
                                   <Button
                                     onClick={() => {
                                       setEditingCategory(null);
                                       setNewCategoryName('');
                                     }}
                                     size="sm"
                                     variant="outline"
                                     className="h-6 w-6 p-0"
                                   >
                                     <X className="w-3 h-3" />
                                   </Button>
                                 </div>
                               ) : (
                                 <Button
                                   onClick={() => {
                                     setEditingCategory(category.id);
                                     setNewCategoryName(category.name);
                                   }}
                                   size="sm"
                                   variant="ghost"
                                   className="h-6 w-6 p-0 hover:bg-gray-600"
                                 >
                                   <Pencil className="w-3 h-3" />
                                 </Button>
                               )}
                             </div>
                           </div>
                         ))}
                         <Button
                           onClick={addNewCategory}
                           variant="outline"
                           className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                         >
                           <Plus className="w-4 h-4 mr-2" />
                           Agregar Nueva Categoría
                         </Button>
                       </div>
                     </div>
                   )}
                   
                    {/* Bulk actions bar */}
                    {selectedItems.size > 0 && (
                      <div className="bg-blue-600 text-white p-3 border-b border-blue-700">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {selectedItems.size} elemento(s) seleccionado(s)
                          </span>
                           <div className="flex gap-2">
                              <Select 
                                onValueChange={(categoryId) => moveSelectedItems(categoryId)}
                              >
                                <SelectTrigger className="bg-blue-700 hover:bg-blue-800 text-white border-blue-500 w-48">
                                  <div className="flex items-center">
                                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Mover a categoría..." />
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {budgetCategories.map((category) => {
                                    const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                                    return (
                                      <SelectItem key={category.id} value={category.id}>
                                        <div className="flex items-center gap-2">
                                          <IconComponent className="w-4 h-4" />
                                          {category.name}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <Select 
                                onValueChange={(billingStatus) => updateSelectedItemsBillingStatus(billingStatus)}
                              >
                                <SelectTrigger className="bg-blue-700 hover:bg-blue-800 text-white border-blue-500 w-56">
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Cambiar estado facturación..." />
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendiente">Pendiente</SelectItem>
                                  <SelectItem value="factura_solicitada">Factura solicitada</SelectItem>
                                  <SelectItem value="factura_recibida">Factura recibida</SelectItem>
                                  <SelectItem value="pagada">Pagada</SelectItem>
                                </SelectContent>
                              </Select>
                            <Button
                              onClick={clearSelection}
                              size="sm"
                              variant="ghost"
                              className="text-white hover:bg-blue-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Categories Section */}
                   <div className="flex-1 overflow-auto">
                    {budgetCategories.map((category) => {
                      const categoryItems = getCategoryItems(category.id);
                      const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                      
                      return (
                        <div key={category.id} className="mb-6">
                          {/* Category Header */}
                          <div 
                            className="bg-black text-white p-4 flex items-center justify-between border-b border-gray-700 cursor-pointer hover:bg-gray-900 transition-colors"
                            onClick={() => {
                              setOpenCategories(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(category.id)) {
                                  newSet.delete(category.id);
                                } else {
                                  newSet.add(category.id);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="transform transition-transform duration-200" style={{ transform: openCategories.has(category.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                <ArrowRightLeft className="w-4 h-4 rotate-90" />
                              </div>
                              <IconComponent className="w-5 h-5" />
                              <h3 className="text-lg font-bold tracking-wider">{category.name.toUpperCase()}</h3>
                              <span className="text-sm text-white/60">({categoryItems.length} elementos)</span>
                            </div>
                            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-4 text-sm">
                                <div className="text-right">
                                  <div className="text-xs text-white/50 mb-1">Neto</div>
                                  <div className="font-semibold">
                                    €{categoryItems.reduce((sum, item) => {
                                      const unitPrice = Number(item.unit_price) || 0;
                                      const quantity = Number(item.quantity) || 1;
                                      return sum + (unitPrice * quantity);
                                    }, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-white/50 mb-1">Total</div>
                                  <div className="font-semibold">
                                    €{categoryItems.reduce((sum, item) => {
                                      const unitPrice = Number(item.unit_price) || 0;
                                      const quantity = Number(item.quantity) || 1;
                                      const subtotal = unitPrice * quantity;
                                      const ivaPercent = Number(item.iva_percentage) || 0;
                                      const irpfPercent = Number(item.irpf_percentage) || 0;
                                      const iva = subtotal * (ivaPercent / 100);
                                      const irpf = subtotal * (irpfPercent / 100);
                                      return sum + (subtotal + iva - irpf);
                                    }, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addNewItem(category.id);
                                }}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar
                              </Button>
                            </div>
                          </div>
                          
                          {/* Excel-style Table */}
                          {openCategories.has(category.id) && (
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
                                      <TableHead className="font-bold text-black w-[50px] text-center">
                                        <input
                                          type="checkbox"
                                          className="rounded"
                                          checked={categoryItems.length > 0 && categoryItems.every(item => selectedItems.has(item.id))}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              selectAllItemsInCategory(category.id);
                                            } else {
                                              const newSelection = new Set(selectedItems);
                                              categoryItems.forEach(item => newSelection.delete(item.id));
                                              setSelectedItems(newSelection);
                                            }
                                          }}
                                        />
                                      </TableHead>
                                      <TableHead className="font-bold text-black w-[200px]">Nombre</TableHead>
                                      <TableHead className="font-bold text-black w-[130px] text-center">Fecha Emisión</TableHead>
                                      <TableHead className="font-bold text-black w-[140px] text-right">Precio Unit. (€)</TableHead>
                                      <TableHead className="font-bold text-black w-[80px] text-center">IVA (%)</TableHead>
                                      <TableHead className="font-bold text-black w-[80px] text-center">IRPF (%)</TableHead>
                                      <TableHead className="font-bold text-black w-[120px] text-right">Total (€)</TableHead>
                                      <TableHead className="font-bold text-black w-[150px] text-center">Estado de facturación</TableHead>
                                      <TableHead className="font-bold text-black w-[150px] text-center">Enlace Factura</TableHead>
                                      <TableHead className="font-bold text-black w-[100px] text-center">Acciones</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                <TableBody>
                                   {categoryItems.map((item, index) => (
                                     <TableRow 
                                       key={item.id} 
                                       className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-b border-gray-200 ${
                                         selectedItems.has(item.id) ? 'bg-blue-100 border-blue-300' : ''
                                       } ${draggedElement === item.id ? 'opacity-50' : ''} ${
                                         dragOverElement === item.id ? 'border-t-2 border-t-blue-500' : ''
                                       }`}
                                       draggable
                                       onDragStart={(e) => {
                                         setDraggedElement(item.id);
                                         e.dataTransfer.effectAllowed = 'move';
                                         e.dataTransfer.setData('text/plain', item.id);
                                       }}
                                       onDragOver={(e) => {
                                         e.preventDefault();
                                         e.dataTransfer.dropEffect = 'move';
                                         setDragOverElement(item.id);
                                       }}
                                       onDragLeave={() => {
                                         setDragOverElement(null);
                                       }}
                                       onDrop={(e) => {
                                         e.preventDefault();
                                         setDragOverElement(null);
                                         setDraggedElement(null);
                                       }}
                                       onDragEnd={() => {
                                         setDraggedElement(null);
                                         setDragOverElement(null);
                                       }}
                                     >
                                        {/* Checkbox */}
                                        <TableCell className="p-2 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <input
                                              type="checkbox"
                                              className="rounded"
                                              checked={selectedItems.has(item.id)}
                                              onChange={() => toggleItemSelection(item.id)}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab hover:text-gray-600" />
                                          </div>
                                        </TableCell>

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
                                      
                                        {/* Fecha de emisión */}
                                       <TableCell className="p-2 text-center">
                                         {editingItem === item.id ? (
                                           <Popover>
                                             <PopoverTrigger asChild>
                                               <Button
                                                 variant="outline"
                                                 className={cn(
                                                   "h-8 w-[120px] justify-start text-left font-normal text-sm",
                                                   !editingItemValues.fecha_emision && "text-muted-foreground"
                                                 )}
                                               >
                                                 <CalendarIcon className="mr-2 h-3 w-3" />
                                                 {editingItemValues.fecha_emision ? format(new Date(editingItemValues.fecha_emision), "dd/MM/yyyy") : <span>Fecha</span>}
                                               </Button>
                                             </PopoverTrigger>
                                             <PopoverContent className="w-auto p-0" align="start">
                                               <Calendar
                                                 mode="single"
                                                 selected={editingItemValues.fecha_emision ? new Date(editingItemValues.fecha_emision) : undefined}
                                                 onSelect={(date) => setEditingItemValues(prev => ({ ...prev, fecha_emision: date ? format(date, 'yyyy-MM-dd') : undefined }))}
                                                 initialFocus
                                                 className="pointer-events-auto"
                                               />
                                             </PopoverContent>
                                           </Popover>
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
                                             onClick={() => startEditingItem(item)}
                                           >
                                             {item.fecha_emision ? format(new Date(item.fecha_emision), "dd/MM/yyyy") : "-"}
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

                                       {/* Estado de facturación */}
                                       <TableCell className="p-2 text-center">
                                         {editingItem === item.id ? (
                                            <Select
                                              value={editingItemValues.billing_status || item.billing_status || 'pendiente'}
                                              onValueChange={(value) => setEditingItemValues(prev => ({ ...prev, billing_status: value as any }))}
                                            >
                                              <SelectTrigger className="h-8 text-sm border-blue-300 focus:border-blue-500">
                                                <SelectValue placeholder="Seleccionar estado" />
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

                                       {/* Enlace Factura */}
                                       <TableCell className="p-2 text-center">
                                         {editingItem === item.id ? (
                                           <Input
                                             type="text"
                                             value={editingItemValues.invoice_link || item.invoice_link || ''}
                                             onChange={(e) => setEditingItemValues(prev => ({ ...prev, invoice_link: e.target.value }))}
                                             placeholder="URL de factura"
                                             className="h-8 text-sm border-blue-300 focus:border-blue-500 text-gray-900 bg-white"
                                           />
                                         ) : (
                                           <div 
                                             className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded"
                                             onClick={() => startEditingItem(item)}
                                           >
                                             {item.invoice_link ? (
                                               <a 
                                                 href={item.invoice_link} 
                                                 target="_blank" 
                                                 rel="noopener noreferrer"
                                                 className="text-blue-600 hover:text-blue-800 underline text-sm"
                                                 onClick={(e) => e.stopPropagation()}
                                               >
                                                 Ver factura
                                               </a>
                                             ) : (
                                               <span className="text-gray-400 text-sm">-</span>
                                             )}
                                           </div>
                                         )}
                                       </TableCell>
                                        
                                         {/* Acciones */}
                                        <TableCell className="p-2 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                             {editingItem === item.id ? (
                                               <>
                                                 <Button
                                                   onClick={saveItemEdits}
                                                   size="sm"
                                                   className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700 text-white"
                                                   title="Guardar cambios"
                                                 >
                                                   <Save className="w-3 h-3 text-white" />
                                                 </Button>
                                                  <Button
                                                    onClick={() => {
                                                      setEditingItem(null);
                                                      setEditingItemValues({});
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 w-6 p-0 hover:bg-gray-100 border-gray-300"
                                                    title="Cancelar edición"
                                                 >
                                                   <ArrowLeft className="w-3 h-3 text-gray-600" />
                                                 </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button
                                                  onClick={() => startEditingItem(item)}
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 w-6 p-0 hover:bg-blue-100 text-blue-600"
                                                  title="Editar elemento"
                                                >
                                                  <Edit className="w-3 h-3" />
                                                </Button>
                                                {selectedItems.has(item.id) && (
                                                  <Button
                                                    onClick={() => deleteItem(item.id)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                                                    title="Eliminar elemento"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                )}
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>


              <TabsContent value="overview" className="flex-1 overflow-auto p-0 m-0">
                <div className="h-full p-6">
                  {/* Grid con gráfico y resumen por categorías - MOVED TO TOP */}
                  <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                formatter={(value: number, name: string, props: any) => {
                                  const total = getCategoryChartData().reduce((sum, item) => sum + item.value, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                  return [
                                    `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
                                    `${props.payload.name} (${percentage}%)`
                                  ];
                                }}
                                labelFormatter={(label) => ''}
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  color: 'hsl(var(--foreground))',
                                  fontSize: '14px'
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tabla resumen por categorías */}
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
                                    <Badge variant="outline" className="text-sm">
                                      {category.count}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    <span className={category.total > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                                      €{category.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {/* Total row */}
                            {(() => {
                              const summaryData = getCategorySummaryData();
                              const totalElements = summaryData.reduce((sum, cat) => sum + cat.count, 0);
                              const totalAmount = summaryData.reduce((sum, cat) => sum + cat.total, 0);
                              
                              return (
                                <TableRow className="border-t-2 border-primary/20 bg-muted/30 font-semibold">
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calculator className="h-4 w-4 text-primary" />
                                      <span className="font-bold">TOTAL</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="bg-primary text-primary-foreground">
                                      {totalElements}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary">
                                    €{totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                  </div>
                  
                  {/* Enhanced Budget Items View - MOVED BELOW CHARTS */}
                  <div className="mb-8">
                    <EnhancedBudgetItemsView budgetId={budget.id} />
                  </div>

                  {/* Tabla detallada de elementos */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Vista General de Elementos</CardTitle>
                      
                      {/* Unified Search and Filter */}
                      <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        {/* Search Bar */}
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Buscar por concepto o importe..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        {/* Unified Filter Menu */}
                        <div className="w-80">
                          <Select 
                            value={`${statusFilter}-${sortBy}-${sortOrder}`} 
                            onValueChange={(value) => {
                              const [status, sort, order] = value.split('-');
                              setStatusFilter(status as any);
                              setSortBy(sort as any);
                              setSortOrder(order as any);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Filtros y ordenación" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b">Estados</div>
                              <SelectItem value="all-name-asc">Todos los estados</SelectItem>
                              <SelectItem value="pendiente-name-asc">Pendiente</SelectItem>
                              <SelectItem value="factura_solicitada-name-asc">Factura solicitada</SelectItem>
                              <SelectItem value="factura_recibida-name-asc">Factura recibida</SelectItem>
                              <SelectItem value="pagada-name-asc">Pagada</SelectItem>
                              
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b border-t mt-1">Ordenar por importe</div>
                              <SelectItem value="all-amount-asc">Importe: menor a mayor</SelectItem>
                              <SelectItem value="all-amount-desc">Importe: mayor a menor</SelectItem>
                              
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b border-t mt-1">Ordenar por fecha emisión</div>
                              <SelectItem value="all-fecha_emision-asc">Fecha: más antiguo primero</SelectItem>
                              <SelectItem value="all-fecha_emision-desc">Fecha: más reciente primero</SelectItem>
                              
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b border-t mt-1">Orden alfabético</div>
                              <SelectItem value="all-name-asc">Concepto: A-Z</SelectItem>
                              <SelectItem value="all-name-desc">Concepto: Z-A</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px]">Concepto</TableHead>
                              <TableHead className="w-[120px] text-center">Categoría</TableHead>
                              <TableHead className="w-[80px] text-center">Cantidad</TableHead>
                              <TableHead className="w-[100px] text-right">Precio Unit.</TableHead>
                              <TableHead className="w-[130px] text-center">Fecha Emisión</TableHead>
                              <TableHead className="w-[140px] text-center">Estado</TableHead>
                              <TableHead className="w-[100px] text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              // Get all items from all categories and apply filters
                              let allItems: BudgetItem[] = [];
                              budgetCategories.forEach(category => {
                                allItems = [...allItems, ...getFilteredAndSortedItems(category.id)];
                              });
                              
                              return allItems.map((item, index) => {
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
                                    
                                    <TableCell className="text-center">
                                      {editingItem === item.id ? (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className={cn(
                                                "w-[120px] justify-start text-left font-normal",
                                                !editingItemValues.fecha_emision && "text-muted-foreground"
                                              )}
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {editingItemValues.fecha_emision ? format(new Date(editingItemValues.fecha_emision), "dd/MM/yyyy") : <span>Fecha</span>}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="single"
                                              selected={editingItemValues.fecha_emision ? new Date(editingItemValues.fecha_emision) : undefined}
                                              onSelect={(date) => setEditingItemValues(prev => ({ ...prev, fecha_emision: date ? format(date, 'yyyy-MM-dd') : undefined }))}
                                              initialFocus
                                              className="pointer-events-auto"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      ) : (
                                        <div 
                                          className="h-8 flex items-center justify-center cursor-pointer hover:bg-blue-100 px-2 rounded text-gray-900"
                                          onClick={() => startEditingItem(item)}
                                        >
                                          {item.fecha_emision ? format(new Date(item.fecha_emision), "dd/MM/yyyy") : "-"}
                                        </div>
                                      )}
                                    </TableCell>
                                    
                                    <TableCell className="text-center">
                                      {editingItem === item.id ? (
                                        <Select
                                          value={editingItemValues.billing_status || item.billing_status || 'pendiente'}
                                          onValueChange={(value) => setEditingItemValues(prev => ({ ...prev, billing_status: value as any }))}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Seleccionar estado" />
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
                                          <Badge 
                                            variant={
                                              item.billing_status === 'pagada' ? 'default' :
                                              item.billing_status === 'factura_recibida' ? 'secondary' :
                                              item.billing_status === 'factura_solicitada' ? 'outline' :
                                              'destructive'
                                            }
                                          >
                                            {item.billing_status === 'pendiente' ? 'Pendiente' :
                                             item.billing_status === 'factura_solicitada' ? 'Factura solicitada' :
                                             item.billing_status === 'factura_recibida' ? 'Factura recibida' :
                                             'Pagada'}
                                          </Badge>
                                        </div>
                                      )}
                                    </TableCell>
                                    
                                    <TableCell className="text-right font-bold text-green-700">
                                      €{total.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              });
                            })()}
                          </TableBody>
                        </Table>
                        
                        {(() => {
                          let allItems: BudgetItem[] = [];
                          budgetCategories.forEach(category => {
                            allItems = [...allItems, ...getFilteredAndSortedItems(category.id)];
                          });
                          return allItems.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                              {searchTerm || statusFilter !== 'all' ? 'No se encontraron elementos con los filtros aplicados' : 'No hay elementos en este presupuesto'}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Action Buttons for Editing */}
                      {editingItem && (
                        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                          <Button
                            onClick={saveItemEdits}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingItem(null);
                              setEditingItemValues({});
                            }}
                            size="sm"
                            variant="outline"
                            title="Cancelar edición"
                          >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                     </CardContent>
                   </Card>
                 </div>
               </TabsContent>

            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Liquidar Facturas Dialog */}
      <LiquidarFacturasDialog
        open={showLiquidarDialog}
        onOpenChange={setShowLiquidarDialog}
        budgetId={budget.id}
        onSuccess={() => {
          fetchBudgetItems();
          toast({
            title: "Éxito",
            description: "Facturas liquidadas correctamente",
          });
        }}
      />
    </Dialog>
  );
}