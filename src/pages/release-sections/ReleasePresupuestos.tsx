import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, DollarSign, FileText, Music, Eye, Trash2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRelease, useTracks } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRightsSplitsManager } from '@/components/releases/TrackRightsSplitsManager';
import CreateBudgetDialog from '@/components/CreateBudgetDialog';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface LinkedBudget {
  id: string;
  name: string;
  fee?: number;
  budget_status?: string;
  created_at: string;
}

export default function ReleasePresupuestos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);

  const [linkedBudgets, setLinkedBudgets] = useState<LinkedBudget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<LinkedBudget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);

  // Budget items totals
  const [budgetTotals, setBudgetTotals] = useState<Record<string, { estimated: number; actual: number }>>({});

  const fetchLinkedBudgets = async () => {
    if (!id) return;
    setLoadingBudgets(true);
    try {
      const { data, error } = await (supabase
        .from('budgets')
        .select('id, name, fee, budget_status, created_at') as any)
        .eq('release_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedBudgets(data || []);

      // Fetch totals for each budget from budget_items
      if (data && data.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('budget_items')
          .select('budget_id, quantity, unit_price')
          .in('budget_id', data.map(b => b.id));

        if (!itemsError && items) {
          const totals: Record<string, { estimated: number; actual: number }> = {};
          items.forEach(item => {
            if (!totals[item.budget_id]) {
              totals[item.budget_id] = { estimated: 0, actual: 0 };
            }
            totals[item.budget_id].estimated += (item.quantity || 1) * (item.unit_price || 0);
          });
          setBudgetTotals(totals);
        }
      }
    } catch (error) {
      console.error('Error fetching linked budgets:', error);
    } finally {
      setLoadingBudgets(false);
    }
  };

  useEffect(() => {
    fetchLinkedBudgets();
  }, [id]);

  const handleDeleteBudget = async () => {
    if (!deleteBudgetId) return;
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', deleteBudgetId);
      if (error) throw error;
      toast.success('Presupuesto eliminado');
      setDeleteBudgetId(null);
      fetchLinkedBudgets();
    } catch {
      toast.error('Error al eliminar presupuesto');
    }
  };

  const totalEstimated = Object.values(budgetTotals).reduce((sum, t) => sum + t.estimated, 0);
  const totalActual = linkedBudgets.reduce((sum, b) => sum + (b.fee || 0), 0);

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

      <Tabs defaultValue="costes" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="costes" className="gap-2">
            <Receipt className="h-4 w-4" />
            Costes de Producción
          </TabsTrigger>
          <TabsTrigger value="publishing" className="gap-2">
            <FileText className="h-4 w-4" />
            Derechos de Autor
          </TabsTrigger>
          <TabsTrigger value="master" className="gap-2">
            <Music className="h-4 w-4" />
            Royalties Master
          </TabsTrigger>
        </TabsList>

        {/* Costes de Producción Tab */}
        <TabsContent value="costes" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Partidas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">€{totalEstimated.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Presupuestos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{linkedBudgets.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Fee Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">€{totalActual.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Presupuestos del Lanzamiento</CardTitle>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Presupuesto
              </Button>
            </CardHeader>
            <CardContent>
              {loadingBudgets ? (
                <Skeleton className="h-32 w-full" />
              ) : linkedBudgets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total Partidas</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedBudgets.map((budget) => (
                      <TableRow
                        key={budget.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedBudget(budget);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <TableCell className="font-medium">{budget.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {budget.budget_status || 'borrador'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          €{(budgetTotals[budget.id]?.estimated || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {budget.fee ? `€${budget.fee.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedBudget(budget);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteBudgetId(budget.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin presupuestos</h3>
                  <p className="text-muted-foreground mb-4">
                    Crea un presupuesto completo para este lanzamiento con partidas detalladas.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Presupuesto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Derechos de Autor (Publishing) Tab */}
        <TabsContent value="publishing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Derechos de Autor (Publishing)</CardTitle>
                  <CardDescription>
                    Define los porcentajes de autoría: compositores, letristas y editoriales.
                    Estos derechos corresponden a la obra musical (composición y letra).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTracks ? (
                <Skeleton className="h-32 w-full" />
              ) : tracks && tracks.length > 0 ? (
                <div className="space-y-3">
                  {tracks.map((track) => (
                    <TrackRightsSplitsManager key={track.id} track={track} type="publishing" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
                  <p className="text-muted-foreground mb-4">
                    Primero añade canciones en la sección de Créditos para configurar sus derechos.
                  </p>
                  <Button onClick={() => navigate(`/releases/${id}/creditos`)}>
                    Ir a Créditos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Royalties Master Tab */}
        <TabsContent value="master" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Music className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Royalties Master (Fonograma)</CardTitle>
                  <CardDescription>
                    Define los porcentajes de participación en la grabación: artistas, productores y sello.
                    Estos royalties corresponden al fonograma (grabación sonora).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTracks ? (
                <Skeleton className="h-32 w-full" />
              ) : tracks && tracks.length > 0 ? (
                <div className="space-y-3">
                  {tracks.map((track) => (
                    <TrackRightsSplitsManager key={track.id} track={track} type="master" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
                  <p className="text-muted-foreground mb-4">
                    Primero añade canciones en la sección de Créditos para configurar sus royalties.
                  </p>
                  <Button onClick={() => navigate(`/releases/${id}/creditos`)}>
                    Ir a Créditos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Budget Dialog */}
      <CreateBudgetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchLinkedBudgets}
        releaseId={id}
        defaultType="produccion_musical"
        defaultArtistId={release?.artist_id || undefined}
      />

      {/* Budget Details Dialog */}
      {selectedBudget && (
        <BudgetDetailsDialog
          open={showDetailsDialog}
          onOpenChange={(open) => {
            setShowDetailsDialog(open);
            if (!open) {
              setSelectedBudget(null);
              fetchLinkedBudgets();
            }
          }}
          budget={selectedBudget as any}
          onUpdate={fetchLinkedBudgets}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBudgetId} onOpenChange={() => setDeleteBudgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las partidas asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
