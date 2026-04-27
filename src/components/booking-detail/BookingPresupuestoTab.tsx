import { useState } from 'react';
import { isPaidStatus } from '@/lib/billingStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  ClipboardList,
  Plus,
  ExternalLink,
  DollarSign,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Link as LinkIcon,
  Star,
  Unlink,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  listBudgetsForBooking,
  unlinkBudgetFromBooking,
  setPrimaryBudget,
  updateBudgetRole,
  type BookingBudgetRow,
} from '@/lib/budgets/bookingBudgets';
import { LinkExistingBudgetDialog } from './LinkExistingBudgetDialog';

interface BookingPresupuestoTabProps {
  bookingId: string;
  artistId?: string | null;
  projectId?: string | null;
  eventName?: string;
  eventDate?: string | null;
  eventCity?: string | null;
  eventVenue?: string | null;
  fee?: number | null;
  formato?: string | null;
}

interface BudgetSummary extends BookingBudgetRow {
  items: {
    unit_price: number | null;
    quantity: number | null;
    iva_percentage: number | null;
    irpf_percentage: number | null;
    billing_status: string | null;
    is_provisional: boolean | null;
    category: string;
    budget_categories?: { name: string } | null;
  }[];
}

export function BookingPresupuestoTab({
  bookingId,
  artistId,
  projectId,
  eventName,
  eventDate,
  eventCity,
  eventVenue,
  fee,
  formato,
}: BookingPresupuestoTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBudgetForDialog, setSelectedBudgetForDialog] = useState<any>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['booking-budgets', bookingId],
    queryFn: async (): Promise<BudgetSummary[]> => {
      const { items } = await listBudgetsForBooking(bookingId, { limit: 50, offset: 0 });
      if (items.length === 0) return [];

      // Sincronizar campos del booking → presupuestos vinculados (booking es la fuente de verdad)
      const syncFields: Record<string, any> = {};
      if (eventDate) syncFields.event_date = eventDate;
      if (eventCity) syncFields.city = eventCity;
      if (eventVenue) syncFields.venue = eventVenue;

      if (Object.keys(syncFields).length > 0) {
        const outOfSync = items.filter(
          (b) =>
            (eventDate && b.event_date !== eventDate) ||
            (eventCity && b.city !== eventCity) ||
            (eventVenue && b.venue !== eventVenue),
        );
        if (outOfSync.length > 0) {
          await supabase
            .from('budgets')
            .update(syncFields)
            .in(
              'id',
              outOfSync.map((b) => b.id),
            );
          outOfSync.forEach((b) => Object.assign(b, syncFields));
        }
      }

      const { data: allItems } = await supabase
        .from('budget_items')
        .select(
          'budget_id, unit_price, quantity, iva_percentage, irpf_percentage, billing_status, is_provisional, category, category_id, budget_categories(name)',
        )
        .in(
          'budget_id',
          items.map((b) => b.id),
        );

      const itemsByBudget = (allItems || []).reduce(
        (acc, item) => {
          const key = (item as any).budget_id;
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      return items.map((b) => ({
        ...b,
        items: (itemsByBudget[b.id] || []) as BudgetSummary['items'],
      }));
    },
    enabled: !!bookingId && !!user,
  });

  const calcKPIs = (budget: BudgetSummary) => {
    const capital = budget.fee || 0;
    let comprometido = 0;
    let pagado = 0;
    let confirmado = 0;
    let provisional = 0;

    budget.items.forEach((item) => {
      const base = (item.unit_price || 0) * (item.quantity || 1);
      comprometido += base;
      if (isPaidStatus(item.billing_status)) pagado += base;
      if (item.is_provisional) provisional += base;
      else confirmado += base;
    });

    return { capital, comprometido, pagado, confirmado, provisional, disponible: capital - comprometido };
  };

  const createBudget = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      setIsCreating(true);

      const existingCount = data?.length ?? 0;
      const budgetName =
        existingCount === 0
          ? `Presupuesto - ${eventName || 'Evento'}`
          : `Presupuesto ${existingCount + 1} - ${eventName || 'Evento'}`;

      const { data: newBudget, error } = await supabase
        .from('budgets')
        .insert({
          name: budgetName,
          type: 'concierto' as any,
          artist_id: artistId,
          project_id: projectId,
          booking_offer_id: bookingId,
          event_date: eventDate,
          city: eventCity,
          venue: eventVenue,
          fee: fee,
          formato: formato,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (formato && artistId) {
        try {
          const { loadCrewFromFormat } = await import('@/utils/budgetCrewLoader');
          await loadCrewFromFormat({
            budgetId: newBudget.id,
            formatName: formato,
            artistId,
            bookingFee: fee || 0,
            isInternational: false,
            userId: user.id,
          });
        } catch (e) {
          console.warn('Could not auto-populate crew:', e);
        }
      }

      return newBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] });
      toast({ title: 'Presupuesto creado' });
      setIsCreating(false);
    },
    onError: (error) => {
      setIsCreating(false);
      toast({ title: 'Error al crear presupuesto', description: error.message, variant: 'destructive' });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (budgetId: string) => unlinkBudgetFromBooking(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] });
      toast({ title: 'Presupuesto desvinculado', description: 'El presupuesto sigue disponible en Finanzas.' });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const primaryMutation = useMutation({
    mutationFn: (budgetId: string) => setPrimaryBudget(budgetId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] });
      toast({ title: 'Presupuesto marcado como principal' });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ budgetId, role }: { budgetId: string; role: string | null }) =>
      updateBudgetRole(budgetId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] });
      setEditingRoleId(null);
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const linked = data ?? [];

  if (linked.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
              title="Sin presupuesto de producción"
              description="Crea uno nuevo o vincula uno existente para gestionar los gastos de este concierto"
              action={{
                label: '+ Crear presupuesto',
                onClick: () => createBudget.mutate(),
              }}
            />
            <div className="flex justify-center mt-3">
              <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)} disabled={!artistId}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Vincular existente
              </Button>
            </div>
            {isCreating && <p className="text-center text-sm text-muted-foreground mt-4">Creando presupuesto...</p>}
          </CardContent>
        </Card>
        <LinkExistingBudgetDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          bookingId={bookingId}
          artistId={artistId ?? null}
          onLinked={() => queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] })}
        />
      </>
    );
  }

  // KPIs consolidados
  const totals = linked.reduce(
    (acc, b) => {
      const k = calcKPIs(b);
      acc.capital += k.capital;
      acc.pagado += k.pagado;
      acc.comprometido += k.comprometido;
      acc.confirmado += k.confirmado;
      acc.provisional += k.provisional;
      acc.disponible += k.disponible;
      return acc;
    },
    { capital: 0, pagado: 0, comprometido: 0, confirmado: 0, provisional: 0, disponible: 0 },
  );

  return (
    <div className="space-y-4">
      {/* KPIs consolidados (solo si hay >1) */}
      {linked.length > 1 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total consolidado · {linked.length} presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Capital</p>
                <p className="text-lg font-bold">{fmt(totals.capital)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="text-lg font-bold text-green-600">{fmt(totals.pagado)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comprometido</p>
                <p className="text-lg font-bold text-amber-600">{fmt(totals.comprometido)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fmt(totals.confirmado)} confirmado · {fmt(totals.provisional)} provisional
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponible</p>
                <p className={`text-lg font-bold ${totals.disponible >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {fmt(totals.disponible)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {linked.map((budget) => {
        const kpi = calcKPIs(budget);
        const categoryCounts: Record<string, { total: number; count: number }> = {};
        budget.items.forEach((item) => {
          const cat = (item as any).budget_categories?.name || item.category || 'Sin categoría';
          if (!categoryCounts[cat]) categoryCounts[cat] = { total: 0, count: 0 };
          categoryCounts[cat].total += (item.unit_price || 0) * (item.quantity || 1);
          categoryCounts[cat].count += 1;
        });

        const isEditing = editingRoleId === budget.id;

        return (
          <Card key={budget.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base flex-wrap">
                  <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                  <span className="truncate">{budget.name}</span>
                  {budget.is_primary_for_booking && (
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3" /> Principal
                    </Badge>
                  )}
                </CardTitle>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={roleDraft}
                        onChange={(e) => setRoleDraft(e.target.value.slice(0, 60))}
                        placeholder="Producción, Catering…"
                        className="h-7 text-sm"
                        maxLength={60}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          roleMutation.mutate({
                            budgetId: budget.id,
                            role: roleDraft.trim() || null,
                          })
                        }
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingRoleId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingRoleId(budget.id);
                        setRoleDraft(budget.booking_role ?? '');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      {budget.booking_role || 'Añadir etiqueta'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                {!budget.is_primary_for_booking && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => primaryMutation.mutate(budget.id)}
                    disabled={primaryMutation.isPending}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Principal
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedBudgetForDialog(budget)}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmUnlinkId(budget.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Capital
                  </p>
                  <p className="text-lg font-bold">{fmt(kpi.capital)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Pagado
                  </p>
                  <p className="text-lg font-bold text-green-600">{fmt(kpi.pagado)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Comprometido
                  </p>
                  <p className="text-lg font-bold text-amber-600">{fmt(kpi.comprometido)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmt(kpi.confirmado)} confirmado · {fmt(kpi.provisional)} provisional
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Disponible
                  </p>
                  <p className={`text-lg font-bold ${kpi.disponible >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {fmt(kpi.disponible)}
                  </p>
                </div>
              </div>

              {Object.keys(categoryCounts).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Desglose por categoría</h4>
                  <div className="space-y-1.5">
                    {Object.entries(categoryCounts)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([cat, { total, count }]) => (
                        <div key={cat} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                          <span>
                            {cat} <span className="text-muted-foreground text-xs">({count})</span>
                          </span>
                          <span className="font-medium">{fmt(total)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Acciones */}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => createBudget.mutate()} disabled={createBudget.isPending}>
          <Plus className="h-4 w-4 mr-1" />
          {createBudget.isPending ? 'Creando...' : 'Nuevo presupuesto'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)} disabled={!artistId}>
          <LinkIcon className="h-4 w-4 mr-1" />
          Vincular existente
        </Button>
      </div>

      <LinkExistingBudgetDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        bookingId={bookingId}
        artistId={artistId ?? null}
        onLinked={() => queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] })}
      />

      <AlertDialog open={!!confirmUnlinkId} onOpenChange={(o) => !o && setConfirmUnlinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              El presupuesto no se eliminará: solo dejará de estar vinculado a este booking. Podrás
              encontrarlo en Finanzas → Presupuestos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmUnlinkId) {
                  unlinkMutation.mutate(confirmUnlinkId);
                  setConfirmUnlinkId(null);
                }
              }}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedBudgetForDialog && (
        <BudgetDetailsDialog
          open={!!selectedBudgetForDialog}
          onOpenChange={(open) => {
            if (!open) setSelectedBudgetForDialog(null);
          }}
          budget={selectedBudgetForDialog}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] })}
        />
      )}
    </div>
  );
}
