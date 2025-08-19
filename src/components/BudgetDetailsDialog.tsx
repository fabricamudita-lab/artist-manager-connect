import React, { useState, useEffect } from 'react';
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
  File,
  Maximize2,
  Minimize2
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
  irpf_percentage: number;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    category: '',
    subcategory: '',
    name: '',
    quantity: 1,
    unit_price: 0,
    iva_percentage: 21,
    irpf_percentage: 15,
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
      // Ensure irpf_percentage has a default value for existing records
      const itemsWithDefaults = (data || []).map(item => ({
        ...item,
        irpf_percentage: item.irpf_percentage ?? 15
      }));
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
          irpf_percentage: newItem.irpf_percentage || 15,
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
        irpf_percentage: 15,
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
          irpf_percentage: item.irpf_percentage,
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
      <DialogContent className={`${isFullscreen ? 'max-w-screen w-screen max-h-screen h-screen' : 'max-w-[95vw] w-full max-h-[95vh] h-full'} overflow-hidden p-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-black text-white p-6 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {editingBudget ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/90">Nombre del evento</Label>
                      <Input
                        value={budgetData.name}
                        onChange={(e) => setBudgetData(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white/90">Ciudad</Label>
                        <Input
                          value={budgetData.city}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, city: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                        />
                      </div>
                      <div>
                        <Label className="text-white/90">País</Label>
                        <Input
                          value={budgetData.country}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, country: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-white/90">Lugar</Label>
                      <Input
                        value={budgetData.venue}
                        onChange={(e) => setBudgetData(prev => ({ ...prev, venue: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-white/90">Fecha</Label>
                        <Input
                          type="date"
                          value={budgetData.event_date?.split('T')[0] || ''}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, event_date: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white/90">Hora</Label>
                        <Input
                          type="time"
                          value={budgetData.event_time || ''}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, event_time: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white/90">Fee (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={budgetData.fee}
                          onChange={(e) => setBudgetData(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={updateBudget} className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                        <Save className="w-4 h-4 mr-1" />
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingBudget(false);
                        setBudgetData(budget);
                      }} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Calculator className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-3xl font-playfair font-bold text-white">{budgetData.name}</DialogTitle>
                        <p className="text-white/90 text-lg">
                          {budgetData.city}, {budgetData.country} • {budgetData.venue}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                        {budgetData.type}
                      </Badge>
                      {budgetData.event_date && (
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                          {new Date(budgetData.event_date).toLocaleDateString('es-ES')}
                          {budgetData.event_time && ` - ${budgetData.event_time}`}
                        </Badge>
                      )}
                      {budgetData.fee > 0 && (
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                          Fee: €{budgetData.fee.toLocaleString()}
                        </Badge>
                      )}
                      <Badge className={`${
                        budgetData.show_status === 'confirmado' ? 'bg-green-500/20 text-green-200 border-green-400/20' :
                        budgetData.show_status === 'pendiente' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/20' :
                        'bg-red-500/20 text-red-200 border-red-400/20'
                      }`}>
                        {budgetData.show_status}
                      </Badge>
                    </div>
                  </>
                )}
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
                {!editingBudget && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditingBudget(true)} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={saveAsTemplate} className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                      <FileText className="w-4 h-4 mr-1" />
                      Plantilla
                    </Button>
                    <Button size="sm" variant="destructive" onClick={deleteBudget} className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/20">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="items" className="h-full flex flex-col">
              <div className="border-b bg-background px-6 py-3 flex-shrink-0">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="items" className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Elementos
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Resumen
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    Archivos
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="items" className="flex-1 overflow-hidden p-6 space-y-6">
                {/* Professional Budget Table */}
                <div className="card-moodita overflow-hidden h-full flex flex-col">
                  {/* Table Header */}
                  <div className="bg-black text-white p-4 flex-shrink-0">
                    <div className="text-center">
                      <h2 className="text-lg font-bold">{budgetData.name}</h2>
                      <p className="text-white/90 text-sm">
                        {budgetData.event_date && new Date(budgetData.event_date).toLocaleDateString('es-ES')} ({budgetData.city})
                      </p>
                      <p className="text-white/70 text-xs mt-1">PRESUPUESTO {budgetData.budget_status?.toUpperCase()}</p>
                    </div>
                  </div>

                  {/* Scrollable Table Content */}
                  <div className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                    <Table className="text-sm">
                      <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm border-b-2">
                        <TableRow>
                          <TableHead className="w-12 text-center font-semibold">✓</TableHead>
                          <TableHead className="min-w-[200px] font-semibold">Nombre</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Concepto</TableHead>
                          <TableHead className="w-24 text-center font-semibold">Coste</TableHead>
                          <TableHead className="w-16 text-center font-semibold">Unid.</TableHead>
                          <TableHead className="w-20 text-center font-semibold">Cantidad</TableHead>
                          <TableHead className="w-20 text-center font-semibold">% IVA</TableHead>
                          <TableHead className="w-20 text-center font-semibold">IVA</TableHead>
                          <TableHead className="w-20 text-center font-semibold">%IRPF</TableHead>
                          <TableHead className="w-20 text-center font-semibold">IRPF</TableHead>
                          <TableHead className="w-24 text-center font-semibold">Total</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Comentarios</TableHead>
                          <TableHead className="w-24 text-center font-semibold">Estado</TableHead>
                          <TableHead className="w-24 text-center font-semibold">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      
                      <TableBody>
                        {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                          const categoryItems = getCategoryItems(categoryKey);
                          const IconComponent = category.icon;
                          
                          return (
                            <React.Fragment key={categoryKey}>
                              {/* Category Header */}
                              <TableRow className="bg-black hover:bg-black">
                                <TableCell colSpan={14} className="font-bold text-white text-center py-3">
                                  <div className="flex items-center justify-center gap-3">
                                    <IconComponent className="w-5 h-5" />
                                    {category.title.toUpperCase()}
                                  </div>
                                </TableCell>
                              </TableRow>
                              
                              {/* Category Items */}
                              {categoryItems.map((item, index) => (
                                <TableRow 
                                  key={item.id} 
                                  className={`hover:bg-muted/30 transition-colors border-b ${
                                    editingItem === item.id ? 'bg-blue-50' : index % 2 === 0 ? "bg-background" : "bg-muted/20"
                                  }`}
                                >
                                  <TableCell className="text-center">
                                    <Checkbox 
                                      checked={true}
                                      className="h-4 w-4"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {editingItem === item.id ? (
                                      <Input
                                        value={item.name}
                                        onChange={(e) => setItems(prev => 
                                          prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i)
                                        )}
                                        className="h-8"
                                      />
                                    ) : (
                                      <div className="font-medium">{item.name}</div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingItem === item.id ? (
                                      <Input
                                        value={item.subcategory || ''}
                                        onChange={(e) => setItems(prev => 
                                          prev.map(i => i.id === item.id ? { ...i, subcategory: e.target.value } : i)
                                        )}
                                        className="h-8"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground">{item.subcategory || category.title}</span>
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
                                        className="h-8 w-20"
                                      />
                                    ) : (
                                      <span className="font-medium">€{item.unit_price}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center text-muted-foreground">
                                    €
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {editingItem === item.id ? (
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => setItems(prev => 
                                          prev.map(i => i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i)
                                        )}
                                        className="h-8 w-16"
                                      />
                                    ) : (
                                      <span className="font-medium">{item.quantity}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {editingItem === item.id ? (
                                      <Input
                                        type="number"
                                        value={item.iva_percentage}
                                        onChange={(e) => setItems(prev => 
                                          prev.map(i => i.id === item.id ? { ...i, iva_percentage: parseFloat(e.target.value) || 21 } : i)
                                        )}
                                        className="h-8 w-16"
                                      />
                                    ) : (
                                      <span>{item.iva_percentage}%</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="text-accent font-medium">
                                      €{((item.unit_price * item.quantity) * (item.iva_percentage / 100)).toFixed(2)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {editingItem === item.id ? (
                                      <Input
                                        type="number"
                                        value={item.irpf_percentage || 15}
                                        onChange={(e) => setItems(prev => 
                                          prev.map(i => i.id === item.id ? { ...i, irpf_percentage: parseFloat(e.target.value) || 15 } : i)
                                        )}
                                        className="h-8 w-16"
                                      />
                                    ) : (
                                      <span>{item.irpf_percentage || 15}%</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="text-red-600 font-medium">
                                      €{((item.unit_price * item.quantity) * ((item.irpf_percentage || 15) / 100)).toFixed(2)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="badge-success">
                                      €{calculateTotal(item).toFixed(2)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {editingItem === item.id ? (
                                      <Input
                                        value={item.observations}
                                        onChange={(e) => setItems(prev => 
                                          prev.map(i => i.id === item.id ? { ...i, observations: e.target.value } : i)
                                        )}
                                        className="h-8"
                                        placeholder="Comentarios..."
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-sm">{item.observations || '-'}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge 
                                      variant="outline" 
                                      className={getBillingStatusColor(item.billing_status)}
                                    >
                                      {item.billing_status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex gap-1 justify-center">
                                      {editingItem === item.id ? (
                                        <>
                                          <Button 
                                            size="sm" 
                                            onClick={() => {
                                              updateItem(item);
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Save className="w-3 h-3" />
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => setEditingItem(null)}
                                            className="h-8 w-8 p-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          onClick={() => setEditingItem(item.id)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                      )}
                                      <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={() => deleteItem(item.id)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              
                              {/* Add Item Button */}
                              <TableRow className="hover:bg-muted/30">
                                <TableCell colSpan={14} className="p-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addItem(categoryKey)}
                                    className="w-full border-dashed hover:bg-primary/5 hover:border-primary text-sm"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Agregar elemento a {category.title}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary Footer */}
                  <div className="bg-muted/30 p-4 border-t flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {items.length} elementos en el presupuesto
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          Total: <span className="text-primary">€{items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Subtotal: €{items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} + 
                          IVA: €{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.iva_percentage / 100)), 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Summary Cards */}
                  <Card className="card-moodita">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Resumen Financiero
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">€{items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA Total:</span>
                        <span className="font-medium text-accent">€{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.iva_percentage / 100)), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IRPF Total:</span>
                        <span className="font-medium text-red-600">-€{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * ((item.irpf_percentage || 15) / 100)), 0).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary">€{items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Breakdown */}
                  <Card className="card-moodita">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Desglose por Categorías
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                          const categoryItems = getCategoryItems(categoryKey);
                          const categoryTotal = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
                          const IconComponent = category.icon;
                          
                          if (categoryItems.length === 0) return null;
                          
                          return (
                            <div key={categoryKey} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <IconComponent className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{category.title}</div>
                                  <div className="text-sm text-muted-foreground">{categoryItems.length} elementos</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">€{categoryTotal.toFixed(2)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="attachments" className="flex-1 overflow-auto p-6">
                <Card className="card-moodita">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Archivos y Documentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">Arrastra archivos aquí o haz clic para subir</p>
                      <p className="text-sm text-muted-foreground">PDF, DOCX, XLSX, imágenes</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Template Dialog */}
      <SaveTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onSave={handleSaveTemplate}
      />
    </Dialog>
  );
}
