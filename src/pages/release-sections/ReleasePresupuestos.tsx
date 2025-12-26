import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Pencil, DollarSign, Users, PieChart, Receipt, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRelease, useReleaseBudgets, useTracks, useTrackCredits, ReleaseBudget, Track } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  paid: 'bg-green-500/20 text-green-600',
  invoiced: 'bg-blue-500/20 text-blue-600',
};

const BUDGET_CATEGORIES = [
  { value: 'produccion', label: 'Producción' },
  { value: 'mezcla', label: 'Mezcla' },
  { value: 'mastering', label: 'Masterización' },
  { value: 'grabacion', label: 'Grabación' },
  { value: 'musicos', label: 'Músicos de Sesión' },
  { value: 'arte', label: 'Arte y Diseño' },
  { value: 'video', label: 'Videoclip' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'distribucion', label: 'Distribución' },
  { value: 'legal', label: 'Legal' },
  { value: 'avance', label: 'Avance / Adelanto' },
  { value: 'otros', label: 'Otros' },
];

const CREDIT_ROLES = [
  { value: 'compositor', label: 'Compositor' },
  { value: 'letrista', label: 'Letrista' },
  { value: 'productor', label: 'Productor' },
  { value: 'interprete', label: 'Intérprete' },
  { value: 'featured', label: 'Featuring' },
  { value: 'sello', label: 'Sello' },
  { value: 'editorial', label: 'Editorial' },
];

export default function ReleasePresupuestos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: budgets, isLoading: loadingBudgets } = useReleaseBudgets(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);

  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<ReleaseBudget | null>(null);
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);

  // Create budget mutation
  const createBudget = useMutation({
    mutationFn: async (data: {
      category: string;
      item_name: string;
      estimated_cost: number;
      actual_cost?: number;
      vendor?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('release_budgets').insert({
        release_id: id,
        ...data,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-budgets', id] });
      toast.success('Partida añadida');
      setIsAddBudgetOpen(false);
    },
    onError: () => {
      toast.error('Error al añadir partida');
    },
  });

  // Update budget mutation
  const updateBudget = useMutation({
    mutationFn: async (data: Partial<ReleaseBudget> & { id: string }) => {
      const { id: budgetId, ...updates } = data;
      const { error } = await supabase
        .from('release_budgets')
        .update(updates)
        .eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-budgets', id] });
      toast.success('Partida actualizada');
      setEditBudget(null);
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase.from('release_budgets').delete().eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-budgets', id] });
      toast.success('Partida eliminada');
      setDeleteBudgetId(null);
    },
    onError: () => {
      toast.error('Error al eliminar');
    },
  });

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

      <Tabs defaultValue="costes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="costes" className="gap-2">
            <Receipt className="h-4 w-4" />
            Costes de Producción
          </TabsTrigger>
          <TabsTrigger value="splits" className="gap-2">
            <PieChart className="h-4 w-4" />
            Splits de Royalties
          </TabsTrigger>
        </TabsList>

        {/* Costes de Producción Tab */}
        <TabsContent value="costes" className="space-y-4">
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
                <p className={`text-2xl font-bold ${totalActual > totalEstimated ? 'text-destructive' : 'text-green-500'}`}>
                  €{(totalEstimated - totalActual).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Partidas de Coste</CardTitle>
              <Dialog open={isAddBudgetOpen} onOpenChange={setIsAddBudgetOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Partida
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir Partida de Coste</DialogTitle>
                  </DialogHeader>
                  <BudgetForm
                    onSubmit={(data) => createBudget.mutate(data)}
                    isLoading={createBudget.isPending}
                  />
                </DialogContent>
              </Dialog>
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
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Estimado</TableHead>
                      <TableHead className="text-right">Real</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {BUDGET_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                        </TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.vendor || '-'}</TableCell>
                        <TableCell className="text-right">€{item.estimated_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{item.actual_cost.toLocaleString()}</TableCell>
                        <TableCell>
                          <Select
                            value={item.status}
                            onValueChange={(value) =>
                              updateBudget.mutate({ id: item.id, status: value as any })
                            }
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <Badge className={STATUS_COLORS[item.status]}>
                                {item.status === 'pending' ? 'Pendiente' : item.status === 'paid' ? 'Pagado' : 'Facturado'}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="invoiced">Facturado</SelectItem>
                              <SelectItem value="paid">Pagado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditBudget(item)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteBudgetId(item.id)}
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
                  <h3 className="text-lg font-semibold mb-2">Sin partidas de coste</h3>
                  <p className="text-muted-foreground mb-4">
                    Añade costes de producción, avances, etc.
                  </p>
                  <Button onClick={() => setIsAddBudgetOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Partida
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Splits de Royalties Tab */}
        <TabsContent value="splits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Royalties por Canción</CardTitle>
              <CardDescription>
                Define los porcentajes de reparto para cada canción del lanzamiento.
                Estos splits se conectan con el módulo de Finanzas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTracks ? (
                <Skeleton className="h-32 w-full" />
              ) : tracks && tracks.length > 0 ? (
                <div className="space-y-4">
                  {tracks.map((track) => (
                    <TrackSplitsCard key={track.id} track={track} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
                  <p className="text-muted-foreground mb-4">
                    Primero añade canciones en la sección de Créditos para configurar sus splits.
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

      {/* Edit Budget Dialog */}
      <Dialog open={!!editBudget} onOpenChange={() => setEditBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Partida</DialogTitle>
          </DialogHeader>
          {editBudget && (
            <BudgetForm
              initialData={editBudget}
              onSubmit={(data) => updateBudget.mutate({ id: editBudget.id, ...data })}
              isLoading={updateBudget.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBudgetId} onOpenChange={() => setDeleteBudgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBudgetId && deleteBudgetMutation.mutate(deleteBudgetId)}
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

// Budget Form Component
function BudgetForm({
  initialData,
  onSubmit,
  isLoading,
}: {
  initialData?: ReleaseBudget;
  onSubmit: (data: {
    category: string;
    item_name: string;
    estimated_cost: number;
    actual_cost?: number;
    vendor?: string;
    notes?: string;
  }) => void;
  isLoading: boolean;
}) {
  const [category, setCategory] = useState(initialData?.category || '');
  const [itemName, setItemName] = useState(initialData?.item_name || '');
  const [estimatedCost, setEstimatedCost] = useState(initialData?.estimated_cost?.toString() || '');
  const [actualCost, setActualCost] = useState(initialData?.actual_cost?.toString() || '');
  const [vendor, setVendor] = useState(initialData?.vendor || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !itemName || !estimatedCost) return;
    onSubmit({
      category,
      item_name: itemName,
      estimated_cost: parseFloat(estimatedCost),
      actual_cost: actualCost ? parseFloat(actualCost) : 0,
      vendor: vendor || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Categoría *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona categoría" />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Concepto *</Label>
        <Input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Ej: Producción musical"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Coste Estimado (€) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Coste Real (€)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Proveedor</Label>
        <Input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="Nombre del proveedor"
        />
      </div>

      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !category || !itemName || !estimatedCost}>
          {isLoading ? 'Guardando...' : initialData ? 'Actualizar' : 'Añadir'}
        </Button>
      </div>
    </form>
  );
}

// Track Splits Card Component
function TrackSplitsCard({ track }: { track: Track }) {
  const queryClient = useQueryClient();
  const { data: credits = [], isLoading } = useTrackCredits(track.id);
  const [isAddSplitOpen, setIsAddSplitOpen] = useState(false);
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);

  const totalPercentage = credits.reduce((sum, c) => sum + (c.percentage || 0), 0);

  const updateCredit = useMutation({
    mutationFn: async ({ creditId, data }: { creditId: string; data: Partial<{ percentage: number; role: string; name: string }> }) => {
      const { error } = await supabase
        .from('track_credits')
        .update(data)
        .eq('id', creditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Split actualizado');
      setEditingCreditId(null);
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  const createCredit = useMutation({
    mutationFn: async (data: { name: string; role: string; percentage: number }) => {
      const { error } = await supabase.from('track_credits').insert({
        track_id: track.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Colaborador añadido');
      setIsAddSplitOpen(false);
    },
    onError: () => {
      toast.error('Error al añadir');
    },
  });

  const deleteCredit = useMutation({
    mutationFn: async (creditId: string) => {
      const { error } = await supabase.from('track_credits').delete().eq('id', creditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Eliminado');
    },
  });

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-muted-foreground">{track.track_number}.</span>
                    {track.title}
                  </CardTitle>
                  {track.isrc && (
                    <p className="text-xs text-muted-foreground mt-1">ISRC: {track.isrc}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={totalPercentage === 100 ? 'default' : 'secondary'} className={totalPercentage === 100 ? 'bg-green-500' : ''}>
                  {totalPercentage}%
                </Badge>
                <Dialog open={isAddSplitOpen} onOpenChange={setIsAddSplitOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir Split
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Añadir Colaborador a "{track.title}"</DialogTitle>
                    </DialogHeader>
                    <AddSplitForm
                      maxPercentage={100 - totalPercentage}
                      onSubmit={(data) => createCredit.mutate(data)}
                      isLoading={createCredit.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Distribución total</span>
                <span className={totalPercentage === 100 ? 'text-green-500' : 'text-amber-500'}>
                  {totalPercentage}%
                </span>
              </div>
              <Progress value={totalPercentage} className="h-2" />
            </div>

            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : credits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin splits configurados
              </p>
            ) : (
              <div className="space-y-2">
                {credits.map((credit) => (
                  <CreditRow
                    key={credit.id}
                    credit={credit}
                    totalPercentage={totalPercentage}
                    isEditing={editingCreditId === credit.id}
                    onEdit={() => setEditingCreditId(credit.id)}
                    onCancelEdit={() => setEditingCreditId(null)}
                    onUpdate={(data) => updateCredit.mutate({ creditId: credit.id, data })}
                    onDelete={() => deleteCredit.mutate(credit.id)}
                    isUpdating={updateCredit.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Credit Row Component with inline editing
function CreditRow({
  credit,
  totalPercentage,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  credit: { id: string; name: string; role: string; percentage: number | null; contact_id: string | null };
  totalPercentage: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: Partial<{ percentage: number; role: string; name: string }>) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const [editName, setEditName] = useState(credit.name);
  const [editRole, setEditRole] = useState(credit.role);
  const hasContact = !!credit.contact_id;

  const handleSave = () => {
    const updates: Partial<{ name: string; role: string }> = { role: editRole };
    if (!hasContact) {
      updates.name = editName;
    }
    onUpdate(updates);
  };

  if (isEditing) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            {!hasContact ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre"
                className="h-8"
              />
            ) : (
              <p className="font-medium text-sm">{credit.name}</p>
            )}
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Selecciona rol" />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
      onClick={onEdit}
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{credit.name}</p>
          <p className="text-xs text-muted-foreground">
            {CREDIT_ROLES.find(r => r.value === credit.role)?.label || credit.role}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Input
          type="number"
          min="0"
          max={100 - totalPercentage + (credit.percentage || 0)}
          value={credit.percentage || ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onUpdate({ percentage: val });
          }}
          className="w-20 h-8 text-right"
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Add Split Form
function AddSplitForm({
  maxPercentage,
  onSubmit,
  isLoading,
}: {
  maxPercentage: number;
  onSubmit: (data: { name: string; role: string; percentage: number }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [percentage, setPercentage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !percentage) return;
    const pct = parseFloat(percentage);
    if (pct <= 0 || pct > maxPercentage) {
      toast.error(`El porcentaje debe estar entre 1 y ${maxPercentage}%`);
      return;
    }
    onSubmit({ name, role, percentage: pct });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del colaborador"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Rol *</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona rol" />
          </SelectTrigger>
          <SelectContent>
            {CREDIT_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Porcentaje * (máx. {maxPercentage}%)</Label>
        <Input
          type="number"
          min="1"
          max={maxPercentage}
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          placeholder="25"
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !name || !role || !percentage}>
          {isLoading ? 'Guardando...' : 'Añadir'}
        </Button>
      </div>
    </form>
  );
}
