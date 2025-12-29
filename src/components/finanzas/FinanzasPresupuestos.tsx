import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, FileText, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import CreateBudgetDialog from '@/components/CreateBudgetDialog';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PermissionWrapper } from '@/components/PermissionBoundary';

interface Budget {
  id: string;
  name: string;
  city?: string;
  venue?: string;
  event_date?: string;
  budget_status?: string;
  show_status?: string;
  fee?: number;
  created_at: string;
  created_by: string;
}

interface FinanzasPresupuestosProps {
  artistId?: string;
}

export function FinanzasPresupuestos({ artistId }: FinanzasPresupuestosProps = {}) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, [filterStatus, artistId]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by artist if provided
      if (artistId && artistId !== 'all') {
        query = query.eq('artist_id', artistId);
      }

      if (filterStatus !== 'all') {
        query = query.eq('budget_status', filterStatus as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los presupuestos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Presupuesto eliminado correctamente",
      });

      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el presupuesto",
        variant: "destructive"
      });
    }
  };

  const filteredBudgets = budgets.filter(budget => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      budget.name.toLowerCase().includes(searchTermLower) ||
      (budget.city?.toLowerCase().includes(searchTermLower)) ||
      (budget.venue?.toLowerCase().includes(searchTermLower))
    );
  });

  const totalAmount = filteredBudgets.reduce((sum, b) => sum + (b.fee || 0), 0);

  if (loading) {
    return (
      <Card className="card-moodita">
        <CardContent className="py-12 text-center text-muted-foreground">
          Cargando presupuestos...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="card-moodita">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Buscar por nombre, ciudad o lugar..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              
              <PermissionWrapper requiredPermission="createBudget">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo
                </Button>
              </PermissionWrapper>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-moodita">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Presupuestos</div>
            <div className="text-2xl font-bold">{filteredBudgets.length}</div>
          </CardContent>
        </Card>
        <Card className="card-moodita">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Importe Total</div>
            <div className="text-2xl font-bold">€{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="card-moodita">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Aprobados</div>
            <div className="text-2xl font-bold text-green-500">
              {filteredBudgets.filter(b => b.budget_status === 'aprobado').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            Lista de Presupuestos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBudgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay presupuestos que coincidan con los filtros
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => (
                  <TableRow key={budget.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{budget.name}</TableCell>
                    <TableCell>{budget.city || '-'}</TableCell>
                    <TableCell>
                      {budget.event_date ? new Date(budget.event_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {budget.budget_status || budget.show_status || 'borrador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {budget.fee ? `€${budget.fee.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <PermissionWrapper requiredPermission="manage">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteBudget(budget.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </PermissionWrapper>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateBudgetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchBudgets}
      />

      {selectedBudget && (
        <BudgetDetailsDialog
          open={showDetailsDialog}
          onOpenChange={(open) => {
            setShowDetailsDialog(open);
            if (!open) setSelectedBudget(null);
          }}
          budget={selectedBudget as any}
          onUpdate={fetchBudgets}
        />
      )}
    </div>
  );
}
