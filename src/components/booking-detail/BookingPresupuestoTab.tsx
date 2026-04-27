import { useState, useEffect, useRef } from 'react';
import { isPaidStatus } from '@/lib/billingStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList, Plus, ExternalLink, DollarSign,
  CreditCard, AlertTriangle, CheckCircle2, Link as LinkIcon,
  Copy, Pencil, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { duplicateBudget, renameBudget, budgetNameSchema } from '@/lib/budgets/bookingBudgetActions';
import { DeleteBudgetDialog } from '@/components/booking-detail/DeleteBudgetDialog';

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

interface BudgetSummary {
  id: string;
  name: string;
  fee: number | null;
  expense_budget: number | null;
  budget_status: string | null;
  booking_offer_id: string | null;
  project_id: string | null;
  items: {
    unit_price: number | null;
    quantity: number | null;
    iva_percentage: number | null;
    irpf_percentage: number | null;
    billing_status: string | null;
    is_provisional: boolean | null;
    category: string;
  }[];
}

export function BookingPresupuestoTab({
  bookingId, artistId, projectId, eventName, eventDate,
  eventCity, eventVenue, fee, formato
}: BookingPresupuestoTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBudgetForDialog, setSelectedBudgetForDialog] = useState<any>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; name: string } | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingNameId && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingNameId]);
  // Fetch budgets linked to this booking (directly or via project)
  const { data, isLoading } = useQuery({
    queryKey: ['booking-budgets', bookingId, projectId],
    queryFn: async () => {
      // 1. Direct link via booking_offer_id
      const { data: directBudgets } = await supabase
        .from('budgets')
        .select('id, name, type, fee, expense_budget, budget_status, booking_offer_id, project_id, city, country, venue, show_status, internal_notes, created_at, artist_id, event_date, event_time, formato')
        .eq('booking_offer_id', bookingId);

      // 2. Project-linked budgets (if project exists)
      let projectBudgets: typeof directBudgets = [];
      if (projectId) {
        const { data: pBudgets } = await supabase
          .from('budgets')
          .select('id, name, type, fee, expense_budget, budget_status, booking_offer_id, project_id, city, country, venue, show_status, internal_notes, created_at, artist_id, event_date, event_time, formato')
          .eq('project_id', projectId)
          .eq('type', 'concierto');
        projectBudgets = pBudgets || [];
      }

      // 3. Fuzzy match: same artist + (name contains event name OR event_date matches)
      let fuzzyBudgets: typeof directBudgets = [];
      if (artistId) {
        const orConditions = [
          eventName ? `name.ilike.%${eventName}%` : null,
          eventDate ? `event_date.eq.${eventDate}` : null,
        ].filter(Boolean).join(',');

        if (orConditions) {
          const { data: fBudgets } = await supabase
            .from('budgets')
            .select('id, name, type, fee, expense_budget, budget_status, booking_offer_id, project_id, city, country, venue, show_status, internal_notes, created_at, artist_id, event_date, event_time, formato')
            .eq('artist_id', artistId)
            .or(orConditions);
          fuzzyBudgets = fBudgets || [];
        }
      }

      // Deduplicate
      const allIds = new Set<string>();
      const combined: typeof directBudgets = [];
      for (const b of [...(directBudgets || []), ...(projectBudgets || []), ...(fuzzyBudgets || [])]) {
        if (!allIds.has(b.id)) {
          allIds.add(b.id);
          combined.push(b);
        }
      }

      // Auto-sync booking fields → linked budgets (booking is source of truth)
      if (combined.length > 0) {
        const syncFields: Record<string, any> = {};
        if (eventDate) syncFields.event_date = eventDate;
        if (eventCity) syncFields.city = eventCity;
        if (eventVenue) syncFields.venue = eventVenue;
        if (fee != null) syncFields.fee = fee;

        if (Object.keys(syncFields).length > 0) {
          const outOfSync = combined.filter(
            b => b.booking_offer_id === bookingId && (
              (eventDate && b.event_date !== eventDate) ||
              (eventCity && b.city !== eventCity) ||
              (eventVenue && b.venue !== eventVenue) ||
              (fee != null && b.fee !== fee)
            )
          );
          if (outOfSync.length > 0) {
            await supabase
              .from('budgets')
              .update(syncFields)
              .in('id', outOfSync.map(b => b.id));
            // Patch local data so UI is correct immediately
            outOfSync.forEach(b => Object.assign(b, syncFields));
          }
        }
      }

      if (combined.length === 0) return { linked: [] as BudgetSummary[], unlinked: [] as BudgetSummary[] };

      // Fetch items for all budgets
      const { data: allItems } = await supabase
        .from('budget_items')
        .select('budget_id, unit_price, quantity, iva_percentage, irpf_percentage, billing_status, is_provisional, category, category_id, budget_categories(name)')
        .in('budget_id', combined.map(b => b.id));

      const itemsByBudget = (allItems || []).reduce((acc, item) => {
        const key = (item as any).budget_id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, typeof allItems>);

      const budgets: BudgetSummary[] = combined.map(b => ({
        ...b,
        items: (itemsByBudget[b.id] || []) as BudgetSummary['items'],
      }));

      const linked = budgets.filter(b => b.booking_offer_id === bookingId);
      const unlinked = budgets.filter(b => b.booking_offer_id !== bookingId);

      return { linked, unlinked };
    },
    enabled: !!bookingId && !!user,
  });

  const calcKPIs = (budget: BudgetSummary) => {
    const capital = budget.fee || 0;
    const items = budget.items || [];
    let comprometido = 0;
    let pagado = 0;
    let confirmado = 0;
    let provisional = 0;

    items.forEach(item => {
      const base = (item.unit_price || 0) * (item.quantity || 1);
      comprometido += base;
      if (isPaidStatus(item.billing_status)) pagado += base;
      if (item.is_provisional) provisional += base;
      else confirmado += base;
    });

    const disponible = capital - comprometido;
    return { capital, comprometido, pagado, confirmado, provisional, disponible };
  };

  const createBudget = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      setIsCreating(true);

      const budgetName = `Presupuesto - ${eventName || 'Evento'}`;
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

      // Auto-populate crew if format exists
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
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] });
      toast({ title: 'Presupuesto creado' });
      setIsCreating(false);
    },
    onError: (error) => {
      setIsCreating(false);
      toast({ title: 'Error al crear presupuesto', description: error.message, variant: 'destructive' });
    },
  });

  const linkBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from('budgets')
        .update({ booking_offer_id: bookingId })
        .eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] });
      toast({ title: 'Presupuesto vinculado' });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ budgetId, name }: { budgetId: string; name: string }) =>
      renameBudget(budgetId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] });
      setEditingNameId(null);
      toast({ title: 'Nombre actualizado' });
    },
    onError: (err: any) => {
      toast({
        title: 'No se pudo renombrar',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (sourceBudgetId: string) => {
      if (!user) throw new Error('No autenticado');
      return duplicateBudget(sourceBudgetId, user.id);
    },
    onSuccess: (newBudget) => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] });
      toast({ title: 'Presupuesto duplicado' });
      setSelectedBudgetForDialog(newBudget);
    },
    onError: (err: any) => {
      toast({
        title: 'No se pudo duplicar',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const startEditingName = (budget: { id: string; name: string }) => {
    setEditingNameId(budget.id);
    setNameDraft(budget.name);
  };

  const commitNameEdit = (budgetId: string, originalName: string) => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === originalName) {
      setEditingNameId(null);
      return;
    }
    const parsed = budgetNameSchema.safeParse(trimmed);
    if (!parsed.success) {
      toast({
        title: 'Nombre inválido',
        description: parsed.error.issues[0]?.message,
        variant: 'destructive',
      });
      return;
    }
    renameMutation.mutate({ budgetId, name: parsed.data });
  };

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const linked = data?.linked || [];
  const unlinked = data?.unlinked || [];

  // Empty state
  if (linked.length === 0 && unlinked.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
            title="Sin presupuesto de producción"
            description="Crea un presupuesto para gestionar los gastos de este concierto"
            action={{
              label: '+ Crear presupuesto',
              onClick: () => createBudget.mutate(),
            }}
          />
          {isCreating && <p className="text-center text-sm text-muted-foreground mt-4">Creando presupuesto...</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Linked budgets */}
      {linked.map((budget) => {
        const kpi = calcKPIs(budget);
        const categoryCounts: Record<string, { total: number; count: number }> = {};
        budget.items.forEach(item => {
          const cat = (item as any).budget_categories?.name || item.category || 'Sin categoría';
          if (!categoryCounts[cat]) categoryCounts[cat] = { total: 0, count: 0 };
          categoryCounts[cat].total += (item.unit_price || 0) * (item.quantity || 1);
          categoryCounts[cat].count += 1;
        });

        return (
          <Card key={budget.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="flex items-center gap-2 text-base flex-1 min-w-0">
                <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                {editingNameId === budget.id ? (
                  <Input
                    ref={nameInputRef}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => commitNameEdit(budget.id, budget.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitNameEdit(budget.id, budget.name);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingNameId(null);
                      }
                    }}
                    maxLength={120}
                    disabled={renameMutation.isPending}
                    className="h-8 text-base font-semibold"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditingName(budget)}
                    title="Editar nombre"
                    className="group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 hover:bg-muted text-left truncate"
                  >
                    <span className="truncate">{budget.name}</span>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateMutation.mutate(budget.id)}
                  disabled={duplicateMutation.isPending}
                  title="Duplicar como punto de partida"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {duplicateMutation.isPending ? 'Duplicando...' : 'Duplicar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBudgetForDialog(budget)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir presupuesto completo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBudgetToDelete({ id: budget.id, name: budget.name })}
                  title="Eliminar presupuesto"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* KPI Cards */}
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

              {/* Category breakdown */}
              {Object.keys(categoryCounts).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Desglose por categoría</h4>
                  <div className="space-y-1.5">
                    {Object.entries(categoryCounts)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([cat, { total, count }]) => (
                        <div key={cat} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                          <span>{cat} <span className="text-muted-foreground text-xs">({count})</span></span>
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

      {/* Unlinked budgets from same project — offer to link */}
      {unlinked.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Presupuestos del mismo proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unlinked.map(budget => (
              <div
                key={budget.id}
                className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{budget.name}</p>
                  {budget.fee != null && budget.fee > 0 && (
                    <p className="text-xs text-muted-foreground">{fmt(budget.fee)}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => linkBudget.mutate(budget.id)}
                  disabled={linkBudget.isPending}
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  Vincular
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add another budget */}
      {linked.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => createBudget.mutate()}
            disabled={createBudget.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            {createBudget.isPending ? 'Creando...' : 'Nuevo presupuesto'}
          </Button>
        </div>
      )}

      {selectedBudgetForDialog && (
        <BudgetDetailsDialog
          open={!!selectedBudgetForDialog}
          onOpenChange={(open) => { if (!open) setSelectedBudgetForDialog(null); }}
          budget={selectedBudgetForDialog}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] })}
        />
      )}
      <DeleteBudgetDialog
        budgetId={budgetToDelete?.id ?? null}
        budgetName={budgetToDelete?.name ?? ''}
        open={!!budgetToDelete}
        onOpenChange={(open) => { if (!open) setBudgetToDelete(null); }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId, projectId] });
          setBudgetToDelete(null);
        }}
      />
    </div>
  );
}
