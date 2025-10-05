import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface BudgetItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  iva_percentage: number;
  billing_status: string;
  observations?: string;
}

interface LiquidarFacturasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  onSuccess?: () => void;
}

export default function LiquidarFacturasDialog({
  open,
  onOpenChange,
  budgetId,
  onSuccess
}: LiquidarFacturasDialogProps) {
  const [pendingItems, setPendingItems] = useState<BudgetItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [concepto, setConcepto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPendingItems();
      // Reset form
      setSelectedItems(new Set());
      setConcepto('');
      setDescripcion('');
    }
  }, [open, budgetId]);

  const fetchPendingItems = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetId)
        .in('billing_status', ['pendiente', 'factura_solicitada', 'facturado'])
        .order('category', { ascending: true });

      if (error) throw error;
      setPendingItems(data || []);
    } catch (error) {
      console.error('Error fetching pending items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las facturas pendientes",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map(item => item.id)));
    }
  };

  const handleLiquidar = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Aviso",
        description: "Debes seleccionar al menos una factura",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Build observations text
      let observationsText = '';
      if (concepto) observationsText += `Concepto: ${concepto}`;
      if (descripcion) {
        if (observationsText) observationsText += '\n';
        observationsText += `Descripción: ${descripcion}`;
      }

      // Update all selected items
      const { error } = await supabase
        .from('budget_items')
        .update({ 
          billing_status: 'pagado',
          observations: observationsText || null
        })
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      toast({
        title: "Facturas liquidadas",
        description: `Se liquidaron ${selectedItems.size} factura(s) correctamente`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error liquidating invoices:', error);
      toast({
        title: "Error",
        description: "No se pudieron liquidar las facturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (item: BudgetItem) => {
    const subtotal = item.quantity * item.unit_price;
    const iva = subtotal * (item.iva_percentage / 100);
    return subtotal + iva;
  };

  const getSelectedTotal = () => {
    return pendingItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + calculateTotal(item), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Liquidar Facturas Pendientes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay facturas pendientes de liquidar
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          €{item.unit_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{calculateTotal(item).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            {item.billing_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedItems.size > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm font-medium">
                    Facturas seleccionadas: {selectedItems.size}
                  </div>
                  <div className="text-lg font-bold mt-1">
                    Total: €{getSelectedTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="concepto">Concepto (opcional)</Label>
                  <Input
                    id="concepto"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Ej: Pago de servicios de producción"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Detalles adicionales sobre la liquidación"
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLiquidar} 
            disabled={loading || selectedItems.size === 0 || fetching}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Liquidar {selectedItems.size > 0 && `(${selectedItems.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
