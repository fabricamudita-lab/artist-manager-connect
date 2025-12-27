import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Receipt,
  Trash2,
  FileText,
  CheckCircle,
  Pencil
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';
import { MarkExpensesAsInvoicedDialog } from './MarkExpensesAsInvoicedDialog';

interface ExpenseItem {
  id: string;
  booking_id: string;
  description: string;
  amount: number;
  iva_percentage: number;
  handler: string;
  payer: string;
  category?: string;
  created_at: string;
}

interface BookingData {
  id: string;
  venue?: string | null;
  ciudad?: string | null;
  fecha?: string | null;
  promotor?: string | null;
  fee?: number | null;
}

interface BookingExpensesTabProps {
  bookingId: string;
  booking?: BookingData;
}

const EXPENSE_CATEGORIES = [
  { value: 'catering', label: 'Catering' },
  { value: 'transport', label: 'Transporte' },
  { value: 'accommodation', label: 'Alojamiento' },
  { value: 'equipment', label: 'Equipo' },
  { value: 'staff', label: 'Personal' },
  { value: 'other', label: 'Otros' },
];

const HANDLERS_PAYERS = [
  { value: 'agency', label: 'Agencia' },
  { value: 'promoter', label: 'Promotor' },
  { value: 'artist', label: 'Artista' },
];

export function BookingExpensesTab({ bookingId, booking }: BookingExpensesTabProps) {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showMarkInvoicedDialog, setShowMarkInvoicedDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    iva_percentage: 21,
    handler: 'agency',
    payer: 'promoter',
    category: 'other',
  });

  useEffect(() => {
    fetchExpenses();
  }, [bookingId]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('booking_expenses')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as ExpenseItem[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description.trim()) {
      toast({
        title: "Error",
        description: "La descripción es obligatoria.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('booking_expenses')
        .insert({
          booking_id: bookingId,
          ...newExpense,
          created_by: profile?.user_id,
        });

      if (error) throw error;

      toast({
        title: "Gasto añadido",
        description: "El gasto se ha registrado correctamente.",
      });

      setShowAddDialog(false);
      setNewExpense({
        description: '',
        amount: 0,
        iva_percentage: 21,
        handler: 'agency',
        payer: 'promoter',
        category: 'other',
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el gasto.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('booking_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Gasto eliminado",
        description: "El gasto se ha eliminado correctamente.",
      });

      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto.",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setShowEditDialog(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    
    if (!editingExpense.description.trim()) {
      toast({
        title: "Error",
        description: "La descripción es obligatoria.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('booking_expenses')
        .update({
          description: editingExpense.description,
          amount: editingExpense.amount,
          iva_percentage: editingExpense.iva_percentage,
          handler: editingExpense.handler,
          payer: editingExpense.payer,
          category: editingExpense.category,
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      toast({
        title: "Gasto actualizado",
        description: "El gasto se ha actualizado correctamente.",
      });

      setShowEditDialog(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el gasto.",
        variant: "destructive",
      });
    }
  };

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const promoterExpenses = expenses
    .filter(exp => exp.payer === 'promoter')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const agencyExpenses = expenses
    .filter(exp => exp.payer === 'agency')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-muted/50 to-muted">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Gastos</p>
            <p className="text-2xl font-bold">{totalExpenses.toLocaleString()}€</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/20 border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Repercutible al Promotor</p>
            <p className="text-2xl font-bold text-orange-600">{promoterExpenses.toLocaleString()}€</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/20 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">A cargo de Agencia</p>
            <p className="text-2xl font-bold text-blue-600">{agencyExpenses.toLocaleString()}€</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Imprevistos del Evento
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gastos extras no contemplados en el presupuesto que surjan el día del concierto
            </p>
          </div>
          <div className="flex gap-2">
            {expenses.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowMarkInvoicedDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar Facturados
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowInvoiceDialog(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generar Factura
                </Button>
              </>
            )}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Gasto
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Gasto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Descripción *</Label>
                  <Input
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="Ej: Cena equipo técnico"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Importe (€)</Label>
                    <Input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IVA (%)</Label>
                    <Input
                      type="number"
                      value={newExpense.iva_percentage}
                      onChange={(e) => setNewExpense({ ...newExpense, iva_percentage: parseFloat(e.target.value) || 21 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Handler (Quién gestiona)</Label>
                    <Select
                      value={newExpense.handler}
                      onValueChange={(value) => setNewExpense({ ...newExpense, handler: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HANDLERS_PAYERS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payer (Quién paga)</Label>
                    <Select
                      value={newExpense.payer}
                      onValueChange={(value) => setNewExpense({ ...newExpense, payer: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HANDLERS_PAYERS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddExpense}>
                    Añadir
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-10 h-10 text-muted-foreground" />}
              title="Sin imprevistos registrados"
              description="Añade gastos extras que surjan el día del concierto y no estén en el presupuesto"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead>Handler</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="group">
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {expense.amount.toLocaleString()}€
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {expense.iva_percentage}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {HANDLERS_PAYERS.find(h => h.value === expense.handler)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={expense.payer === 'promoter' ? 'default' : 'outline'}
                        className={expense.payer === 'promoter' ? 'bg-orange-500' : ''}
                      >
                        {HANDLERS_PAYERS.find(p => p.value === expense.payer)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditExpense(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Descripción *</Label>
                <Input
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  placeholder="Ej: Cena equipo técnico"
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={editingExpense.category || 'other'}
                  onValueChange={(value) => setEditingExpense({ ...editingExpense, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Importe (€)</Label>
                  <Input
                    type="number"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IVA (%)</Label>
                  <Input
                    type="number"
                    value={editingExpense.iva_percentage}
                    onChange={(e) => setEditingExpense({ ...editingExpense, iva_percentage: parseFloat(e.target.value) || 21 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Handler (Quién gestiona)</Label>
                  <Select
                    value={editingExpense.handler}
                    onValueChange={(value) => setEditingExpense({ ...editingExpense, handler: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HANDLERS_PAYERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payer (Quién paga)</Label>
                  <Select
                    value={editingExpense.payer}
                    onValueChange={(value) => setEditingExpense({ ...editingExpense, payer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HANDLERS_PAYERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateExpense}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Generation Dialog */}
      {booking && (
        <GenerateInvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          booking={booking}
          expenses={expenses.map(e => ({
            id: e.id,
            description: e.description,
            amount: e.amount,
            category: e.category || null,
            payer: e.payer,
            handler: e.handler,
            iva_percentage: e.iva_percentage,
          }))}
        />
      )}

      {/* Mark as Invoiced Dialog */}
      <MarkExpensesAsInvoicedDialog
        open={showMarkInvoicedDialog}
        onOpenChange={setShowMarkInvoicedDialog}
        expenses={expenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          category: e.category || null,
          payer: e.payer,
          handler: e.handler,
          iva_percentage: e.iva_percentage,
        }))}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
