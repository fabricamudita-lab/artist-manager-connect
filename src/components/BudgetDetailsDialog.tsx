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

const defaultBudgetCategories = {
  'equipo_artistico': {
    title: 'Promoción',
    icon: Music,
    subcategories: ['artista_principal', 'banda', 'coristas', 'bailarines', 'otros']
  },
  'equipo_tecnico': {
    title: 'Comisiones',
    icon: Calculator,
    subcategories: ['tour_manager', 'tecnico_sonido', 'tecnico_luces', 'stage_manager', 'produccion_local', 'runner']
  },
  'transporte': {
    title: 'Otros Gastos',
    icon: DollarSign,
    subcategories: ['avion', 'furgoneta', 'tren', 'ave', 'coche', 'equipaje_extra', 'seguro_medico']
  },
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
  const [budgetCategories, setBudgetCategories] = useState(defaultBudgetCategories);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; categoryKey: string; step: number }>({ show: false, categoryKey: '', step: 1 });
  const [confirmModify, setConfirmModify] = useState<{ show: boolean; categoryKey: string; newTitle: string; hasItems: boolean }>({ show: false, categoryKey: '', newTitle: '', hasItems: false });
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);
  const [targetCategory, setTargetCategory] = useState('');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

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
    try {
      const { error } = await supabase
        .from('budget_items')
        .insert({
          budget_id: budget.id,
          category,
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

  const getCategoryItems = (categoryKey: string) => {
    return items.filter(item => item.category === categoryKey);
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

  const moveItemToCategory = async () => {
    if (!selectedItem || !targetCategory) return;

    try {
      const { error } = await supabase
        .from('budget_items')
        .update({ category: targetCategory })
        .eq('id', selectedItem.id);

      if (error) throw error;
      
      await fetchBudgetItems();
      setSelectedItem(null);
      setTargetCategory('');
      
      toast({
        title: "¡Éxito!",
        description: "Elemento movido correctamente"
      });
    } catch (error) {
      console.error('Error moving item:', error);
      toast({
        title: "Error",
        description: "No se pudo mover el elemento",
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

  const downloadPDF = () => {
    try {
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let currentY = margin;

      // Helper function to add text with automatic line breaking
      const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * (fontSize * 0.35));
      };

      // Helper function to add right-aligned text
      const addRightText = (text: string, y: number, fontSize: number = 10) => {
        pdf.setFontSize(fontSize);
        const textWidth = pdf.getTextWidth(text);
        pdf.text(text, pageWidth - margin - textWidth, y);
        return y + (fontSize * 0.35);
      };

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      currentY = addText(budgetData.name.toUpperCase(), margin, currentY, contentWidth, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      currentY = addText('PRESUPUESTO NACIONAL', margin, currentY + 5, contentWidth, 12);

      // Date and basic info
      currentY += 10;
      pdf.setFontSize(10);
      const downloadDate = new Date().toLocaleDateString('es-ES');
      currentY = addText(`Fecha de descarga: ${downloadDate}`, margin, currentY, contentWidth);
      
      if (budgetData.city) {
        currentY = addText(`Ciudad: ${budgetData.city}`, margin, currentY + 5, contentWidth);
      }
      if (budgetData.venue) {
        currentY = addText(`Venue: ${budgetData.venue}`, margin, currentY + 5, contentWidth);
      }
      if (budgetData.event_date) {
        const eventDate = new Date(budgetData.event_date).toLocaleDateString('es-ES');
        currentY = addText(`Fecha del evento: ${eventDate}`, margin, currentY + 5, contentWidth);
      }
      if (budgetData.fee) {
        currentY = addText(`Fee: €${budgetData.fee}`, margin, currentY + 5, contentWidth);
      }

      currentY += 15;

      // Categories and items
      Object.entries(budgetCategories).forEach(([categoryKey, category]) => {
        const categoryItems = getCategoryItems(categoryKey);
        
        if (categoryItems.length > 0) {
          // Check if we need a new page
          if (currentY > pageHeight - 50) {
            pdf.addPage();
            currentY = margin;
          }

          // Category header
          pdf.setFillColor(0, 0, 0);
          pdf.rect(margin, currentY - 5, contentWidth, 10, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          currentY = addText(category.title.toUpperCase(), margin + 2, currentY, contentWidth - 4, 12);
          
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
          currentY += 5;

          // Items
          categoryItems.forEach((item) => {
            if (currentY > pageHeight - 35) {
              pdf.addPage();
              currentY = margin;
            }

            const subtotal = item.quantity * item.unit_price;
            const iva = subtotal * (item.iva_percentage / 100);
            const irpf = subtotal * ((item.irpf_percentage || 15) / 100);
            const total = subtotal + iva - irpf;

            // Item name (left-aligned)
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            currentY = addText(`• ${item.name}`, margin + 5, currentY, contentWidth * 0.7, 11);
            
            // Total amount (right-aligned)
            pdf.setFont('helvetica', 'bold');
            addRightText(`€${total.toFixed(2)}`, currentY - 4, 11);

            // Details in smaller text (left-aligned)
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            const detailText = `${item.quantity} × €${item.unit_price} = €${subtotal.toFixed(2)} + IVA (${item.iva_percentage}%) - IRPF (${item.irpf_percentage || 15}%)`;
            currentY = addText(detailText, margin + 8, currentY + 2, contentWidth * 0.7, 9);
            
            if (item.observations) {
              currentY = addText(`Observaciones: ${item.observations}`, margin + 8, currentY + 2, contentWidth * 0.7, 9);
            }
            
            currentY += 8;
          });

          currentY += 5;
        }
      });

      // Totals summary
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin;
      }

      const grandSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const grandIva = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.iva_percentage / 100)), 0);
      const grandIrpf = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * ((item.irpf_percentage || 15) / 100)), 0);
      const grandTotal = grandSubtotal + grandIva - grandIrpf;

      currentY += 15;
      
      // Summary header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, currentY - 5, contentWidth, 50, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY = addText('RESUMEN TOTAL', margin + 5, currentY, contentWidth - 10, 14);
      
      currentY += 5;
      
      // Summary items with right alignment
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const summaryY = currentY;
      addText(`Subtotal:`, margin + 5, summaryY, contentWidth - 10, 11);
      addRightText(`€${grandSubtotal.toFixed(2)}`, summaryY, 11);
      
      addText(`IVA Total:`, margin + 5, summaryY + 6, contentWidth - 10, 11);
      addRightText(`€${grandIva.toFixed(2)}`, summaryY + 6, 11);
      
      addText(`IRPF Total:`, margin + 5, summaryY + 12, contentWidth - 10, 11);
      addRightText(`-€${grandIrpf.toFixed(2)}`, summaryY + 12, 11);
      
      // Final total with emphasis
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      addText(`TOTAL FINAL:`, margin + 5, summaryY + 22, contentWidth - 10, 14);
      addRightText(`€${grandTotal.toFixed(2)}`, summaryY + 22, 14);

      // Footer
      const fileName = `Presupuesto_${budgetData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${downloadDate.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "¡Éxito!",
        description: "Presupuesto descargado correctamente",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
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
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={downloadPDF}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border-blue-400/20"
                  >
                    <Download className="w-4 h-4" />
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
                <TabsList className="grid w-full max-w-2xl grid-cols-5">
                  <TabsTrigger value="items" className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Elementos
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vista General
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Categorías
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

              <TabsContent value="items" className="flex-1 overflow-hidden p-0 m-0">
                {/* Professional Budget Layout */}
                <div className="h-full flex flex-col bg-gradient-to-b from-black to-gray-900">
                  {/* Categories Section */}
                  <div className="flex-1 overflow-auto">
                    {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                      const categoryItems = getCategoryItems(categoryKey);
                      const IconComponent = category.icon;
                      
                      return (
                        <div key={categoryKey} className="mb-6">
                          {/* Category Header */}
                          <div className="bg-black text-white p-4 flex items-center justify-between border-b border-gray-700">
                            <div className="flex items-center gap-3">
                              <IconComponent className="w-5 h-5" />
                              <h3 className="text-lg font-bold tracking-wider">{category.title.toUpperCase()}</h3>
                            </div>
                          </div>
                          
                          {/* Category Items */}
                          <div className="bg-gray-50 border-b border-gray-300">
                            {categoryItems.length === 0 ? (
                              <div className="p-8 text-center text-gray-500 bg-white">
                                <p>No hay elementos en esta categoría</p>
                                <Button
                                  onClick={() => addItem(categoryKey)}
                                  variant="ghost"
                                  className="mt-2 text-gray-600 hover:text-gray-900"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Agregar elemento a {category.title}
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
                                       <div>
                                         <Label className="text-sm font-medium text-gray-700">Comentarios</Label>
                                         <Input
                                           value={item.observations || ''}
                                           onChange={(e) => setItems(prev => 
                                             prev.map(i => i.id === item.id ? { ...i, observations: e.target.value } : i)
                                           )}
                                           placeholder="Observaciones opcionales..."
                                           className="mt-1 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                         />
                                       </div>
                                       <div>
                                         <Label className="text-sm font-medium text-gray-700">Factura</Label>
                                         <div className="mt-1 space-y-2">
                                           {item.invoice_link ? (
                                             <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                               <FileText className="w-4 h-4 text-green-600" />
                                               <span className="text-sm text-green-700 flex-1">Factura subida</span>
                                               <Button
                                                 size="sm"
                                                 variant="outline"
                                                 className="h-7 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewInvoice({ 
                                                      url: item.invoice_link, 
                                                      name: `${item.name}_factura` 
                                                    });
                                                  }}
                                               >
                                                 Ver
                                               </Button>
                                               <Button
                                                 size="sm"
                                                 variant="outline"
                                                 className="h-7 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   removeFactura(item.id, item.invoice_link);
                                                 }}
                                               >
                                                 Eliminar
                                               </Button>
                                             </div>
                                           ) : (
                                             <div className="relative">
                                               <input
                                                 type="file"
                                                 accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                 onChange={(e) => {
                                                   const file = e.target.files?.[0];
                                                   if (file) {
                                                     uploadFactura(file, item.id);
                                                   }
                                                   e.target.value = '';
                                                 }}
                                                 disabled={uploadingFactura === item.id}
                                               />
                                               <div className="flex items-center gap-2 p-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 transition-colors">
                                                 <Upload className="w-4 h-4 text-gray-400" />
                                                 <span className="text-sm text-gray-500">
                                                   {uploadingFactura === item.id ? 'Subiendo...' : 'Ningún archivo seleccionado'}
                                                 </span>
                                                 <Button
                                                   size="sm"
                                                   variant="outline"
                                                   className="h-7 px-2 text-xs pointer-events-none"
                                                   disabled={uploadingFactura === item.id}
                                                 >
                                                   {uploadingFactura === item.id ? (
                                                     <>
                                                       <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                                       Subiendo...
                                                     </>
                                                   ) : (
                                                     <>
                                                       <Upload className="w-3 h-3 mr-1" />
                                                       Subir factura
                                                     </>
                                                   )}
                                                 </Button>
                                               </div>
                                             </div>
                                           )}
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
                                        {/* Factura Status */}
                                        <div className="mt-2 flex items-center gap-2">
                                          {item.invoice_link ? (
                                            <div className="flex items-center gap-2">
                                              <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                ✓ Factura subida
                                              </span>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   setPreviewInvoice({ 
                                                     url: item.invoice_link, 
                                                     name: `${item.name}_factura` 
                                                   });
                                                 }}
                                              >
                                                Ver factura
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-xs text-red-600 hover:text-red-800"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeFactura(item.id, item.invoice_link);
                                                }}
                                              >
                                                Eliminar
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-500">Facturar al acabar</span>
                                              <div className="relative">
                                                <input
                                                  type="file"
                                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                      uploadFactura(file, item.id);
                                                    }
                                                    e.target.value = '';
                                                  }}
                                                  disabled={uploadingFactura === item.id}
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 relative z-10 pointer-events-none"
                                                  disabled={uploadingFactura === item.id}
                                                >
                                                  {uploadingFactura === item.id ? (
                                                    <>
                                                      <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                                                      Subiendo...
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Upload className="w-3 h-3 mr-1" />
                                                      Subir factura
                                                    </>
                                                  )}
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-lg text-gray-900">
                                          €{calculateTotal(item).toFixed(2)}
                                        </span>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            onClick={() => setEditingItem(item.id)}
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 hover:bg-blue-100"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            onClick={() => deleteItem(item.id)}
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                            {/* Add Item Button */}
                            <div className="p-4 border-b border-gray-200 bg-white">
                              <Button
                                onClick={() => addItem(categoryKey)}
                                variant="outline"
                                className="w-full border-dashed hover:bg-primary/5 hover:border-primary text-sm text-gray-600"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar elemento a {category.title}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Total Section */}
                    <div className="bg-black text-white p-6 sticky bottom-0">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                          {items.length} elementos en el presupuesto
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">
                            Total: <span className="text-green-400">€{items.reduce((sum, item) => sum + calculateTotal(item), 0).toFixed(2)}</span>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            Subtotal: €{items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} + 
                            IVA: €{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.iva_percentage / 100)), 0).toFixed(2)} - 
                            IRPF: €{items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * ((item.irpf_percentage || 15) / 100)), 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="overview" className="flex-1 overflow-auto p-6">
                <div className="space-y-4">
                  {/* Search/Filter */}
                  <div className="mb-6">
                    <Input
                      placeholder="Buscar elementos..."
                      className="max-w-md"
                      onChange={(e) => {
                        const searchValue = e.target.value.toLowerCase();
                        // Simple search highlighting could be added here
                      }}
                    />
                  </div>

                  {/* Compact view of all categories */}
                  {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                    const categoryItems = getCategoryItems(categoryKey);
                    
                    if (categoryItems.length === 0) return null;
                    
                    const categoryTotal = categoryItems.reduce((sum, item) => sum + calculateTotal(item), 0);
                    const IconComponent = category.icon;
                    
                    return (
                      <Card key={categoryKey} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <IconComponent className="w-4 h-4 text-primary" />
                              </div>
                              {category.title}
                            </CardTitle>
                            <div className="text-right">
                              <div className="font-bold text-lg">€{categoryTotal.toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">{categoryItems.length} elementos</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid gap-2">
                            {categoryItems.map((item) => {
                              const total = calculateTotal(item);
                              return (
                                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{item.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {item.quantity} × €{item.unit_price} 
                                      {item.observations && (
                                        <span className="ml-2 italic">({item.observations})</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-4">
                                    <div className="font-medium">€{total.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      +IVA {item.iva_percentage}% -IRPF {item.irpf_percentage || 15}%
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Quick totals at bottom */}
                  <Card className="mt-6 bg-muted/30">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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

              <TabsContent value="categories" className="flex-1 overflow-auto p-6">
                <div className="space-y-6">
                  {/* Main section - Move items between categories */}
                  <Card className="card-moodita">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowRight className="w-5 h-5" />
                        Cambiar elementos de categoría
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Selecciona un elemento y muévelo a otra categoría
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Selected item */}
                        {selectedItem && (
                          <div className="p-4 border border-primary rounded-lg bg-primary/5">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{selectedItem.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Categoría actual: {budgetCategories[selectedItem.category]?.title || selectedItem.category}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedItem(null)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Deseleccionar
                              </Button>
                            </div>
                            
                            {/* Move to category */}
                            <div className="mt-4 flex items-center gap-2">
                              <Select
                                value={targetCategory}
                                onValueChange={setTargetCategory}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleccionar nueva categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(budgetCategories)
                                    .filter(([key]) => key !== selectedItem.category)
                                    .map(([key, category]) => (
                                      <SelectItem key={key} value={key}>
                                        {category.title}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={moveItemToCategory}
                                disabled={!targetCategory}
                              >
                                Mover
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Items by category */}
                        {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                          const categoryItems = getCategoryItems(categoryKey);
                          if (categoryItems.length === 0) return null;

                          return (
                            <div key={categoryKey}>
                              <h3 className="font-medium mb-2 flex items-center gap-2">
                                <category.icon className="w-4 h-4" />
                                {category.title}
                              </h3>
                              <div className="grid gap-2">
                                {categoryItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                      selectedItem?.id === item.id
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                    }`}
                                    onClick={() => setSelectedItem(item)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                          €{(item.quantity * item.unit_price).toFixed(2)}
                                        </div>
                                      </div>
                                      {selectedItem?.id === item.id && (
                                        <div className="text-primary">
                                          <ArrowRight className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Management Section - Collapsible */}
                  <Card className="card-moodita">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Gestionar categorías
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Crear, modificar o eliminar categorías
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                        >
                          {showCategoryManagement ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Settings className="w-4 h-4 mr-1" />
                              Modificar categorías
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {showCategoryManagement && (
                      <CardContent>
                        <div className="space-y-4">
                          {/* Add new category */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nombre de nueva categoría"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                            <Button
                              onClick={async () => {
                                if (!newCategoryName.trim()) return;
                                
                                const newKey = newCategoryName.toLowerCase().replace(/\s+/g, '_');
                                setBudgetCategories(prev => ({
                                  ...prev,
                                  [newKey]: {
                                    title: newCategoryName.trim(),
                                    icon: DollarSign,
                                    subcategories: []
                                  }
                                }));
                                setNewCategoryName('');
                                toast({
                                  title: "¡Éxito!",
                                  description: "Categoría creada correctamente"
                                });
                              }}
                              disabled={!newCategoryName.trim()}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Crear
                            </Button>
                          </div>

                          {/* Existing categories */}
                          <div className="space-y-3">
                            {Object.entries(budgetCategories).map(([categoryKey, category]) => {
                              const categoryItems = getCategoryItems(categoryKey);
                              const hasItems = categoryItems.length > 0;
                              
                              return (
                                <div key={categoryKey} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                      <category.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                      {editingCategory === categoryKey ? (
                                        <Input
                                          defaultValue={category.title}
                                          onBlur={(e) => {
                                            const target = e.target as HTMLInputElement;
                                            const newTitle = target.value.trim();
                                            if (newTitle && newTitle !== category.title) {
                                              if (hasItems) {
                                                setConfirmModify({
                                                  show: true,
                                                  categoryKey,
                                                  newTitle,
                                                  hasItems
                                                });
                                                target.value = category.title; // Reset input
                                              } else {
                                                setBudgetCategories(prev => ({
                                                  ...prev,
                                                  [categoryKey]: { ...category, title: newTitle }
                                                }));
                                                toast({
                                                  title: "¡Éxito!",
                                                  description: "Categoría modificada correctamente"
                                                });
                                              }
                                            }
                                            setEditingCategory(null);
                                          }}
                                          onKeyDown={(e) => {
                                            const target = e.target as HTMLInputElement;
                                            if (e.key === 'Enter') {
                                              target.blur();
                                            }
                                            if (e.key === 'Escape') {
                                              target.value = category.title;
                                              setEditingCategory(null);
                                            }
                                          }}
                                          autoFocus
                                        />
                                      ) : (
                                        <div>
                                          <div className="font-medium">{category.title}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {categoryItems.length} elemento(s)
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingCategory(categoryKey)}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (hasItems) {
                                          setConfirmDelete({ show: true, categoryKey, step: 1 });
                                        } else {
                                          setBudgetCategories(prev => {
                                            const newCategories = { ...prev };
                                            delete newCategories[categoryKey];
                                            return newCategories;
                                          });
                                          toast({
                                            title: "¡Éxito!",
                                            description: "Categoría eliminada correctamente"
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
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
                <div className="space-y-6">
                  {/* Facturas vinculadas a elementos */}
                  <Card className="card-moodita">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Facturas vinculadas a elementos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {items.filter(item => item.invoice_link).length > 0 ? (
                        <div className="space-y-3">
                          {items
                            .filter(item => item.invoice_link)
                            .map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      €{calculateTotal(item).toFixed(2)} - Factura disponible
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(item.invoice_link, '_blank')}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Ver factura
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-800 border-red-300 hover:border-red-400"
                                    onClick={() => removeFactura(item.id, item.invoice_link)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No hay facturas vinculadas aún</p>
                          <p className="text-sm">Sube facturas desde cada elemento en la pestaña "Elementos"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Área para subir documentos generales */}
                  <Card className="card-moodita">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Documentos adicionales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-2">Arrastra archivos aquí o haz clic para subir</p>
                        <p className="text-sm text-muted-foreground">PDF, DOCX, XLSX, imágenes</p>
                        <p className="text-xs text-muted-foreground mt-2">Para documentos relacionados con el presupuesto completo</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Template Dialog */}
      <SaveTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onSave={() => {}}
      />

      {/* Invoice Preview Dialog */}
      <InvoicePreviewDialog
        open={!!previewInvoice}
        onOpenChange={() => setPreviewInvoice(null)}
        invoiceUrl={previewInvoice?.url || ''}
        invoiceName={previewInvoice?.name || 'Factura'}
      />

      {/* Confirmation dialog for category modification */}
      <ConfirmationDialog
        open={confirmModify.show}
        onOpenChange={(open) => !open && setConfirmModify({ show: false, categoryKey: '', newTitle: '', hasItems: false })}
        title="¿Estás segura que quieres modificar esta categoría?"
        description={`Esta categoría tiene elementos. ¿Estás segura que quieres modificarla?`}
        confirmText="Modificar"
        cancelText="Cancelar"
        variant="warning"
        icon="warning"
        onConfirm={() => {
          setBudgetCategories(prev => ({
            ...prev,
            [confirmModify.categoryKey]: { 
              ...prev[confirmModify.categoryKey], 
              title: confirmModify.newTitle 
            }
          }));
          setConfirmModify({ show: false, categoryKey: '', newTitle: '', hasItems: false });
          setEditingCategory(null);
          toast({
            title: "¡Éxito!",
            description: "Categoría modificada correctamente"
          });
        }}
      />

      {/* Confirmation dialogs for category deletion */}
      <ConfirmationDialog
        open={confirmDelete.show && confirmDelete.step === 1}
        onOpenChange={(open) => !open && setConfirmDelete({ show: false, categoryKey: '', step: 1 })}
        title="¿Estás segura que quieres eliminar esta categoría?"
        description={`Esta acción eliminará la categoría "${budgetCategories[confirmDelete.categoryKey]?.title || ''}" y todos sus elementos (${getCategoryItems(confirmDelete.categoryKey).length} elementos).`}
        confirmText="Continuar"
        cancelText="Cancelar"
        variant="warning"
        icon="warning"
        onConfirm={() => setConfirmDelete(prev => ({ ...prev, step: 2 }))}
      />

      <ConfirmationDialog
        open={confirmDelete.show && confirmDelete.step === 2}
        onOpenChange={(open) => !open && setConfirmDelete({ show: false, categoryKey: '', step: 1 })}
        title="Confirmación final"
        description="Una vez eliminados no podrás recuperar los elementos. ¿Estás seguro que quieres eliminarla?"
        confirmText="Eliminar definitivamente"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
        onConfirm={async () => {
          const categoryKey = confirmDelete.categoryKey;
          const categoryItems = getCategoryItems(categoryKey);
          
          try {
            // Delete all items in the category
            if (categoryItems.length > 0) {
              const { error } = await supabase
                .from('budget_items')
                .delete()
                .in('id', categoryItems.map(item => item.id));
              
              if (error) throw error;
            }
            
            // Remove category from state
            setBudgetCategories(prev => {
              const newCategories = { ...prev };
              delete newCategories[categoryKey];
              return newCategories;
            });
            
            await fetchBudgetItems();
            setConfirmDelete({ show: false, categoryKey: '', step: 1 });
            
            toast({
              title: "¡Éxito!",
              description: `Categoría y ${categoryItems.length} elemento(s) eliminados correctamente`
            });
          } catch (error) {
            console.error('Error deleting category:', error);
            toast({
              title: "Error",
              description: "No se pudo eliminar la categoría",
              variant: "destructive"
            });
          }
        }}
      />
    </Dialog>
  );
}