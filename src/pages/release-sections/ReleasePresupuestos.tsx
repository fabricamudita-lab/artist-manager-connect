import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRelease, useReleaseBudgets } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS = {
  pending: 'bg-muted text-muted-foreground',
  paid: 'bg-green-500/20 text-green-600',
  invoiced: 'bg-blue-500/20 text-blue-600',
};

export default function ReleasePresupuestos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: budgets, isLoading: loadingBudgets } = useReleaseBudgets(id);

  const totalEstimated = budgets?.reduce((sum, b) => sum + (b.estimated_cost || 0), 0) || 0;
  const totalActual = budgets?.reduce((sum, b) => sum + (b.actual_cost || 0), 0) || 0;

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">{release?.title}</p>
          <h1 className="text-2xl font-bold">Presupuestos</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€{totalEstimated.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Real</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€{totalActual.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Diferencia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalActual > totalEstimated ? 'text-red-500' : 'text-green-500'}`}>
              €{(totalEstimated - totalActual).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Partidas</CardTitle>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Añadir Partida
          </Button>
        </CardHeader>
        <CardContent>
          {loadingBudgets ? (
            <Skeleton className="h-32 w-full" />
          ) : budgets && budgets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Estimado</TableHead>
                  <TableHead className="text-right">Real</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell className="text-right">€{item.estimated_cost}</TableCell>
                    <TableCell className="text-right">€{item.actual_cost}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[item.status]}>
                        {item.status === 'pending' ? 'Pendiente' : item.status === 'paid' ? 'Pagado' : 'Facturado'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay partidas aún. Añade gastos para controlar el presupuesto.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
