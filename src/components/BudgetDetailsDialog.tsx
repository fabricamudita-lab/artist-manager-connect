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
  ChevronUp
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
        .order('name');

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
        .insert(defaultCategories.map(cat => ({
          ...cat,
          created_by: user?.id
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
          created_by: user?.id
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

  const addItem = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .insert({
          budget_id: budget.id,
          category_id: categoryId,
          category: '', // Keep empty for legacy compatibility
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
        });

      if (error) throw error;
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
          irpf_percentage: item.irpf_percentage,
          is_attendee: item.is_attendee,
          billing_status: item.billing_status,
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
    const irpf = subtotal * ((item.irpf_percentage || 15) / 100);
    return subtotal + iva - irpf;
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

  const uploadFactura = async (file: File, itemId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para subir archivos",
        variant: "destructive"
      });
      return;
    }

    setUploadingFactura(itemId);
    
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${budget.id}/${itemId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('facturas')
        .getPublicUrl(fileName);

      // Update the budget item with the invoice link
      const { error: updateError } = await supabase
        .from('budget_items')
        .update({ invoice_link: publicUrl })
        .eq('id', itemId);

      if (updateError) throw updateError;

      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Factura subida y vinculada correctamente"
      });
    } catch (error) {
      console.error('Error uploading factura:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la factura",
        variant: "destructive"
      });
    } finally {
      setUploadingFactura(null);
    }
  };

  const removeFactura = async (itemId: string, invoiceUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = invoiceUrl.split('/facturas/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('facturas').remove([filePath]);
      }

      // Remove the link from the budget item
      const { error } = await supabase
        .from('budget_items')
        .update({ invoice_link: null })
        .eq('id', itemId);

      if (error) throw error;

      await fetchBudgetItems();
      toast({
        title: "¡Éxito!",
        description: "Factura eliminada correctamente"
      });
    } catch (error) {
      console.error('Error removing factura:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la factura",
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
                      <div>
                        <DialogTitle className="text-3xl font-bold text-white">{budgetData.name}</DialogTitle>
                        <p className="text-gray-400 text-lg mt-1">PRESUPUESTO NACIONAL</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {budgetCategories.map((category) => {
                            const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                            const categoryItems = getCategoryItems(category.id);
                            
                            return (
                              <div key={category.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                <div className="flex items-center gap-2">
                                  <IconComponent className="w-4 h-4 text-white/70" />
                                  <span className="text-sm text-white">{category.name}</span>
                                  <span className="text-xs text-white/60">({categoryItems.length})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
                                    onClick={() => setEditingCategory(category.id)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => {
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
                            </div>
                            <Button
                              onClick={() => addItem(category.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar
                            </Button>
                          </div>
                          
                          {/* Category Items */}
                          <div className="bg-gray-50 border-b border-gray-300">
                            {categoryItems.length === 0 ? (
                              <div className="p-8 text-center text-gray-500 bg-white">
                                <p>No hay elementos en esta categoría</p>
                                <Button
                                  onClick={() => addItem(category.id)}
                                  variant="ghost"
                                  className="mt-2 text-gray-600 hover:text-gray-900"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Agregar elemento a {category.name}
                                </Button>
                              </div>
                            ) : (
                              categoryItems.map((item, index) => (
                                <div 
                                  key={item.id} 
                                  className={`p-4 border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                                >
                                  {editingItem === item.id ? (
                                    <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Nombre</Label>
                                          <Input
                                            value={item.name}
                                            onChange={(e) => setItems(prev => 
                                              prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i)
                                            )}
                                            placeholder="Nombre del elemento"
                                            className="mt-1 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Precio unitario (€)</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => setItems(prev => 
                                              prev.map(i => i.id === item.id ? { ...i, unit_price: parseFloat(e.target.value) || 0 } : i)
                                            )}
                                            placeholder="0.00"
                                            className="mt-1 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-3">
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Cantidad</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => setItems(prev => 
                                              prev.map(i => i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i)
                                            )}
                                            className="mt-1 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">IVA (%)</Label>
                                          <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={item.iva_percentage}
                                            onChange={(e) => setItems(prev => 
                                              prev.map(i => i.id === item.id ? { ...i, iva_percentage: parseFloat(e.target.value) || 0 } : i)
                                            )}
                                            className="mt-1 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">IRPF (%)</Label>
                                          <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={item.irpf_percentage || 15}
                                            onChange={(e) => setItems(prev => 
                                              prev.map(i => i.id === item.id ? { ...i, irpf_percentage: parseFloat(e.target.value) || 15 } : i)
                                            )}
                                            className="mt-1 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                          onClick={() => updateItem(item)}
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          <Save className="w-4 h-4 mr-1" />
                                          Guardar
                                        </Button>
                                        <Button
                                          onClick={() => setEditingItem(null)}
                                          size="sm"
                                          variant="outline"
                                          className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Cancelar
                                        </Button>
                                        <Button
                                          onClick={() => deleteItem(item.id)}
                                          size="sm"
                                          variant="destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-1" />
                                          Eliminar
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setEditingItem(item.id)}>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                                        <p className="text-sm text-gray-600">
                                          {item.quantity} × €{item.unit_price.toFixed(2)} = €{(item.quantity * item.unit_price).toFixed(2)}
                                          {item.iva_percentage > 0 && ` + IVA (${item.iva_percentage}%)`}
                                          {item.irpf_percentage > 0 && ` - IRPF (${item.irpf_percentage}%)`}
                                        </p>
                                        {item.observations && (
                                          <p className="text-xs text-gray-500 mt-1">{item.observations}</p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900">
                                          €{calculateTotal(item).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500">Total</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
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
                      <CardTitle>Totales por Categoría</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {budgetCategories.map((category) => {
                          const categoryItems = getCategoryItems(category.id);
                          const total = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
                          const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
                          
                          return (
                            <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <IconComponent className="w-5 h-5 text-primary" />
                                <div>
                                  <div className="font-medium">{category.name}</div>
                                  <div className="text-sm text-muted-foreground">{categoryItems.length} elementos</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">€{total.toFixed(2)}</div>
                              </div>
                            </div>
                          );
                        })}
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