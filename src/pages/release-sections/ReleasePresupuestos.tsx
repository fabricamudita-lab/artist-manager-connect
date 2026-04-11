import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAlertHighlight } from '@/hooks/useAlertHighlight';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Plus, DollarSign, Eye, Trash2, Receipt, FileText, Music,
  AlertTriangle, CalendarIcon, ChevronDown, ChevronUp, CheckCircle2,
  Calendar, ArrowRight, RefreshCw, X, Zap, Link2, Search, Unlink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRelease, useTracks, useReleaseMilestones } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRightsSplitsManager } from '@/components/releases/TrackRightsSplitsManager';
import CreateReleaseBudgetDialog from '@/components/releases/CreateReleaseBudgetDialog';
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
import { undoableDelete } from '@/utils/undoableDelete';
import { format, subDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface LinkedBudget {
  id: string;
  name: string;
  fee?: number;
  budget_status?: string;
  created_at: string;
  metadata?: Record<string, any> | null;
  isLinkedOnly?: boolean; // true if linked via budget_release_links (not direct release_id)
  sharedReleases?: { id: string; title: string }[];
  release_id?: string; // primary release_id from budgets table
  expectedTrackCount?: number; // sum of tracks across all linked releases (for shared budgets)
  isSharedBudget?: boolean; // true if linked to multiple releases
}

// Deadline offsets from release date (must match CreateReleaseBudgetDialog)
const DEADLINE_OFFSETS: Record<string, { label: string; days: number }> = {
  masters: { label: 'Entrega de Masters', days: 30 },
  arte: { label: 'Entrega de Arte', days: 45 },
  pitchDSP: { label: 'Pitch DSP', days: 28 },
  anuncio: { label: 'Anuncio', days: 14 },
  preSave: { label: 'Pre-save / Pre-order', days: 14 },
};

interface InconsistencyWarning {
  key: string;
  type: 'date_mismatch' | 'track_count' | 'release_date_changed' | 'missing_vinyl_master' | 'physical_no_milestone' | 'version_no_tracks';
  title: string;
  detail: string;
  budgetId?: string;
  budgetIds?: string[];
  budgetDate?: Date;
  releaseDate?: Date;
}

// ─── InconsistencyPanel ────────────────────────────────────────────────────
interface InconsistencyPanelProps {
  warnings: InconsistencyWarning[];
  dismissedKeys: Set<string>;
  onDismiss: (keys: string[]) => void;
  onResolveTrackCount: (budgetIds: string[]) => void;
  onResolveWithReleaseDate: (budgetId: string) => void;
  onResolveWithBudgetDate: (budgetId: string, date: Date) => void;
  onOpenBudget: (budgetId: string) => void;
  onNavigateCronograma: () => void;
  onNavigateCreditos: () => void;
}

function InconsistencyPanel({
  warnings,
  dismissedKeys,
  onDismiss,
  onResolveTrackCount,
  onResolveWithReleaseDate,
  onResolveWithBudgetDate,
  onOpenBudget,
  onNavigateCronograma,
  onNavigateCreditos,
}: InconsistencyPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const visible = warnings.filter(w => !dismissedKeys.has(w.key));

  if (warnings.length === 0) return null;

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-card text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        <span className="text-foreground font-medium">Todo en orden</span>
        <span className="text-muted-foreground">· Sin inconsistencias pendientes</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">
            {visible.length} {visible.length === 1 ? 'punto para revisar' : 'puntos para revisar'}
          </span>
          <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4">
            {visible.length}
          </Badge>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {/* Task cards */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {visible.map((w) => {
            const ids = w.budgetIds && w.budgetIds.length > 0 ? w.budgetIds : (w.budgetId ? [w.budgetId] : []);
            const icon =
              w.type === 'track_count' ? <RefreshCw className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> :
              w.type === 'release_date_changed' ? <Calendar className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> :
              w.type === 'physical_no_milestone' || w.type === 'date_mismatch' ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> :
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;

            // Collect all keys belonging to this grouped warning for dismiss
            const allKeys = ids.length > 0
              ? ids.map(bid => `${w.type}-${bid}`)
              : [w.key];

            return (
              <div key={w.key} className="px-4 py-3 flex flex-col gap-2">
                <div className="flex gap-2 items-start">
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{w.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{w.detail}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pl-6">
                  {/* track_count */}
                  {w.type === 'track_count' && ids.length > 0 && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => onResolveTrackCount(ids)}>
                        <RefreshCw className="h-3 w-3" />
                        Actualizar {ids.length > 1 ? `${ids.length} presupuestos` : 'presupuesto'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1"
                        onClick={() => onDismiss(allKeys)}>
                        <X className="h-3 w-3" />
                        Ignorar
                      </Button>
                    </>
                  )}

                  {/* release_date_changed */}
                  {w.type === 'release_date_changed' && w.budgetId && w.budgetDate && w.releaseDate && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => onResolveWithReleaseDate(w.budgetId!)}>
                        ✓ Usar {format(w.releaseDate, 'd MMM', { locale: es })} (release)
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => onResolveWithBudgetDate(w.budgetId!, w.budgetDate!)}>
                        ✓ Usar {format(w.budgetDate, 'd MMM', { locale: es })} (presupuesto)
                      </Button>
                    </>
                  )}

                  {/* physical_no_milestone / date_mismatch */}
                  {(w.type === 'physical_no_milestone' || w.type === 'date_mismatch') && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={onNavigateCronograma}>
                      <ArrowRight className="h-3 w-3" />
                      Ir al Cronograma
                    </Button>
                  )}

                  {/* missing_vinyl_master */}
                  {w.type === 'missing_vinyl_master' && w.budgetId && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => onOpenBudget(w.budgetId!)}>
                      <Eye className="h-3 w-3" />
                      Abrir presupuesto
                    </Button>
                  )}

                  {/* version_no_tracks */}
                  {w.type === 'version_no_tracks' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={onNavigateCreditos}>
                      <ArrowRight className="h-3 w-3" />
                      Ir a Créditos & Audio
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReleasePresupuestos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);
  const { data: milestones } = useReleaseMilestones(id);

  const [linkedBudgets, setLinkedBudgets] = useState<LinkedBudget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [availableBudgets, setAvailableBudgets] = useState<{ id: string; name: string; fee: number | null; release_name?: string }[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<LinkedBudget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);
  const { alertId, highlightElement } = useAlertHighlight();
  const totalsRowRef = useRef<HTMLTableRowElement>(null);

  // Budget items totals
  const [budgetTotals, setBudgetTotals] = useState<Record<string, { estimated: number; actual: number }>>({}); 

  // Handle alert-based actions
  useEffect(() => {
    if (alertId === 'budget-empty' && !loadingBudgets) {
      setTimeout(() => setShowCreateDialog(true), 400);
    }
    if (alertId === 'budget-over' && !loadingBudgets) {
      setTimeout(() => {
        if (totalsRowRef.current) {
          highlightElement(totalsRowRef.current, 'ring-2 ring-destructive ring-offset-2');
        }
      }, 400);
    }
  }, [alertId, loadingBudgets, highlightElement]);

  const fetchLinkedBudgets = async () => {
    if (!id) return;
    setLoadingBudgets(true);
    try {
      // 1. Direct release_id budgets
      const { data: directBudgets, error: e1 } = await (supabase
        .from('budgets')
        .select('id, name, fee, budget_status, created_at, metadata, release_id') as any)
        .eq('release_id', id)
        .order('created_at', { ascending: false });
      if (e1) throw e1;

      // 2. Budgets via junction table
      const { data: links, error: e2 } = await supabase
        .from('budget_release_links')
        .select('budget_id')
        .eq('release_id', id);
      if (e2) throw e2;

      const linkBudgetIds = (links || []).map((l: any) => l.budget_id);
      const directIds = new Set((directBudgets || []).map((b: any) => b.id));
      const extraIds = linkBudgetIds.filter((bid: string) => !directIds.has(bid));

      let extraBudgets: any[] = [];
      if (extraIds.length > 0) {
        const { data: extras } = await (supabase
          .from('budgets')
          .select('id, name, fee, budget_status, created_at, metadata, release_id') as any)
          .in('id', extraIds);
        extraBudgets = (extras || []).map((b: any) => ({ ...b, isLinkedOnly: true }));
      }

      const allBudgets = [...(directBudgets || []), ...extraBudgets];

      // 3. Fetch shared releases for each budget
      if (allBudgets.length > 0) {
        const allBudgetIds = allBudgets.map((b: any) => b.id);
        const { data: allLinks } = await supabase
          .from('budget_release_links')
          .select('budget_id, release_id')
          .in('budget_id', allBudgetIds);

        // Get unique release IDs (excluding current)
        const otherReleaseIds = [...new Set((allLinks || [])
          .filter((l: any) => l.release_id !== id)
          .map((l: any) => l.release_id))];

        let releaseNames: Record<string, string> = {};
        if (otherReleaseIds.length > 0) {
          const { data: releases } = await supabase
            .from('releases')
            .select('id, title')
            .in('id', otherReleaseIds);
          releaseNames = Object.fromEntries((releases || []).map((r: any) => [r.id, r.title]));
        }

        // Attach shared releases to each budget
        for (const budget of allBudgets) {
          const budgetLinks = (allLinks || []).filter((l: any) => l.budget_id === budget.id && l.release_id !== id);
          budget.sharedReleases = budgetLinks.map((l: any) => ({
            id: l.release_id,
            title: releaseNames[l.release_id] || 'Sin título',
          }));

          // Determine all release IDs associated with this budget (primary + links)
          const allBudgetReleaseIds = new Set<string>();
          if (budget.release_id) allBudgetReleaseIds.add(budget.release_id);
          (allLinks || []).filter((l: any) => l.budget_id === budget.id).forEach((l: any) => allBudgetReleaseIds.add(l.release_id));
          
          budget.isSharedBudget = allBudgetReleaseIds.size > 1;
        }

        // Fetch track counts for all linked releases to compute expectedTrackCount
        const allLinkedReleaseIds = new Set<string>();
        for (const budget of allBudgets) {
          if (budget.release_id) allLinkedReleaseIds.add(budget.release_id);
          (allLinks || []).filter((l: any) => l.budget_id === budget.id).forEach((l: any) => allLinkedReleaseIds.add(l.release_id));
        }

        if (allLinkedReleaseIds.size > 0) {
          const { data: trackRows } = await supabase
            .from('tracks')
            .select('release_id')
            .in('release_id', [...allLinkedReleaseIds]);

          const trackCountByRelease: Record<string, number> = {};
          (trackRows || []).forEach((t: any) => {
            trackCountByRelease[t.release_id] = (trackCountByRelease[t.release_id] || 0) + 1;
          });

          for (const budget of allBudgets) {
            const budgetReleaseIds = new Set<string>();
            if (budget.release_id) budgetReleaseIds.add(budget.release_id);
            (allLinks || []).filter((l: any) => l.budget_id === budget.id).forEach((l: any) => budgetReleaseIds.add(l.release_id));

            let total = 0;
            budgetReleaseIds.forEach(rid => { total += trackCountByRelease[rid] || 0; });
            budget.expectedTrackCount = total;
          }
        }
      }

      setLinkedBudgets(allBudgets);

      // Fetch totals for each budget from budget_items
      if (allBudgets.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('budget_items')
          .select('budget_id, quantity, unit_price')
          .in('budget_id', allBudgets.map((b: any) => b.id));

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
    const budget = linkedBudgets.find(b => b.id === deleteBudgetId);
    
    // If linked only (via junction table, not direct release_id), just unlink
    if (budget?.isLinkedOnly) {
      const { error } = await supabase
        .from('budget_release_links')
        .delete()
        .eq('budget_id', deleteBudgetId)
        .eq('release_id', id!);
      if (error) {
        toast.error('Error al desvincular');
      } else {
        toast.success('Presupuesto desvinculado');
        fetchLinkedBudgets();
      }
      setDeleteBudgetId(null);
      return;
    }

    await undoableDelete({
      table: 'budgets',
      id: deleteBudgetId,
      successMessage: 'Presupuesto eliminado',
      onComplete: () => {
        fetchLinkedBudgets();
      },
    });
    setDeleteBudgetId(null);
  };

  // ─── Link existing budget ──────────────────────────────────────────
  const fetchAvailableBudgets = async () => {
    if (!release?.artist_id || !id) return;
    setLoadingAvailable(true);
    try {
      // Get budgets from the same artist that are NOT already linked
      const currentBudgetIds = linkedBudgets.map(b => b.id);
      
      const { data, error } = await (supabase
        .from('budgets')
        .select('id, name, fee, release_id') as any)
        .eq('artist_id', release.artist_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out already linked budgets
      const filtered = (data || []).filter((b: any) => !currentBudgetIds.includes(b.id));
      
      // Get release names for budgets with release_id
      const releaseIds = [...new Set(filtered.filter((b: any) => b.release_id).map((b: any) => b.release_id))];
      let releaseMap: Record<string, string> = {};
      if (releaseIds.length > 0) {
        const { data: releases } = await supabase
          .from('releases')
          .select('id, title')
          .in('id', releaseIds as string[]);
        releaseMap = Object.fromEntries((releases || []).map((r: any) => [r.id, r.title]));
      }

      setAvailableBudgets(filtered.map((b: any) => ({
        ...b,
        release_name: b.release_id ? releaseMap[b.release_id] : undefined,
      })));
    } catch (e) {
      console.error('Error fetching available budgets:', e);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleLinkBudget = async (budgetId: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('budget_release_links')
        .insert({ budget_id: budgetId, release_id: id });
      if (error) throw error;
      toast.success('Presupuesto vinculado');
      setShowLinkDialog(false);
      fetchLinkedBudgets();
    } catch {
      toast.error('Error al vincular');
    }
  };

  // ─── Conflict resolution ─────────────────────────────────────────
  const resolveWithReleaseDate = async (budgetId: string) => {
    if (!release?.release_date) return;
    try {
      const budget = linkedBudgets.find(b => b.id === budgetId);
      if (!budget) return;
      const meta = { ...(budget.metadata || {}) };
      meta.release_date_digital = release.release_date;
      await (supabase.from('budgets').update({ metadata: meta } as any).eq('id', budgetId));
      toast.success('Fecha del presupuesto actualizada con la fecha del Release');
      fetchLinkedBudgets();
    } catch {
      toast.error('Error al actualizar el presupuesto');
    }
  };

  const resolveWithBudgetDate = async (budgetId: string, budgetDate: Date) => {
    if (!id) return;
    try {
      await supabase.from('releases').update({ release_date: format(budgetDate, 'yyyy-MM-dd') } as any).eq('id', id);
      toast.success('Fecha del Release actualizada con la fecha del presupuesto');
      fetchLinkedBudgets();
    } catch {
      toast.error('Error al actualizar el Release');
    }
  };

  // ─── Dismissed warnings (sessionStorage) ────────────────────────
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem(`dismissed-warnings-${id}`);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  const dismissWarning = (keys: string[]) => {
    setDismissedKeys(prev => {
      const next = new Set(prev);
      keys.forEach(k => next.add(k));
      sessionStorage.setItem(`dismissed-warnings-${id}`, JSON.stringify([...next]));
      return next;
    });
  };

  // ─── Resolve: sync n_tracks in budget ────────────────────────────
  const resolveTrackCount = async (budgetIds: string[]) => {
    try {
      for (const budgetId of budgetIds) {
        const budget = linkedBudgets.find(b => b.id === budgetId);
        if (!budget) continue;
        const meta = { ...(budget.metadata || {}) } as Record<string, any>;
        if (!meta.variables) meta.variables = {};
        // Use expectedTrackCount (sum across all linked releases) for shared budgets
        meta.variables.n_tracks = budget.expectedTrackCount ?? (tracks?.length || 0);
        const { error } = await (supabase.from('budgets').update({ metadata: meta } as any).eq('id', budgetId));
        if (error) {
          console.error('Error updating budget metadata:', error);
          throw error;
        }
      }
      toast.success(budgetIds.length > 1
        ? `${budgetIds.length} presupuestos actualizados`
        : 'Presupuesto actualizado con el número de canciones correcto'
      );
      fetchLinkedBudgets();
    } catch (err) {
      console.error('Error resolving track count:', err);
      toast.error('Error al actualizar el presupuesto');
    }
  };

  // ─── Inconsistency warnings ──────────────────────────────────────
  const warnings = useMemo<InconsistencyWarning[]>(() => {
    if (!release || !linkedBudgets.length) return [];
    const w: InconsistencyWarning[] = [];

    const currentTrackCount = tracks?.length || 0;
    const currentReleaseDate = release.release_date ? new Date(release.release_date) : null;

    // ── Checks PER BUDGET ──
    for (const budget of linkedBudgets) {
      const meta = budget.metadata as Record<string, any> | null;
      if (!meta?.variables) continue;

      // 1. Track count mismatch — compare against expectedTrackCount for shared budgets
      const budgetTrackCount = Number(meta.variables?.n_tracks || 0);
      const expectedCount = budget.expectedTrackCount ?? currentTrackCount;
      if (budgetTrackCount > 0 && expectedCount > 0 && budgetTrackCount !== expectedCount) {
        const isShared = budget.isSharedBudget;
        const sharedNames = budget.sharedReleases?.map(r => r.title).join(', ');
        w.push({
          key: `track_count-${budget.id}`,
          type: 'track_count',
          title: isShared
            ? `El presupuesto tiene ${budgetTrackCount} canción${budgetTrackCount !== 1 ? 'es' : ''}, pero los releases vinculados suman ${expectedCount}`
            : `El presupuesto tiene ${budgetTrackCount} canción${budgetTrackCount !== 1 ? 'es' : ''}, pero el release tiene ${expectedCount}`,
          detail: isShared
            ? `"${budget.name}" · Presupuesto compartido con ${sharedNames || 'otros releases'} · Actualiza para sincronizar el total.`
            : `"${budget.name}" · Actualiza el número de canciones para que los cálculos sean correctos.`,
          budgetId: budget.id,
        });
      }

      // 2. Release date changed — one per budget
      const budgetReleaseDate = meta.release_date_digital ? new Date(meta.release_date_digital) : null;
      if (budgetReleaseDate && currentReleaseDate) {
        const daysDiff = Math.abs(differenceInDays(currentReleaseDate, budgetReleaseDate));
        if (daysDiff > 0) {
          w.push({
            key: `release_date_changed-${budget.id}`,
            type: 'release_date_changed',
            title: `Fecha de salida distinta en el presupuesto y en el release`,
            detail: `"${budget.name}" usa ${format(budgetReleaseDate, "d MMM yyyy", { locale: es })} · el release dice ${format(currentReleaseDate, "d MMM yyyy", { locale: es })} · ${daysDiff} días de diferencia.`,
            budgetId: budget.id,
            budgetDate: budgetReleaseDate,
            releaseDate: currentReleaseDate,
          });
        }
      }

      // 3. Vinyl in físico but no vinyl master
      const fisicoFormatos = (meta.variables?.fisico_formatos || []) as string[];
      const masterTypes = (meta.variables?.master_types || []) as string[];
      if (fisicoFormatos.includes('vinilo') && !masterTypes.includes('vinilo')) {
        w.push({
          key: `missing_vinyl_master-${budget.id}`,
          type: 'missing_vinyl_master',
          title: `Vinilo en fabricación pero sin master de vinilo`,
          detail: `"${budget.name}" · Añade el master de vinilo en "Tipos de master" del presupuesto.`,
          budgetId: budget.id,
        });
      }

      // 4. Version instrumental sin track
      const versions = (meta.versions || []) as string[];
      if (versions.includes('instrumental') && currentTrackCount > 0) {
        const hasInstrumentalTrack = tracks?.some(t => t.title.toLowerCase().includes('instrumental'));
        if (!hasInstrumentalTrack) {
          w.push({
            key: `version_no_tracks-${budget.id}`,
            type: 'version_no_tracks',
            title: `Versión Instrumental declarada sin track correspondiente`,
            detail: `"${budget.name}" · No hay tracks con "instrumental" en el título en Créditos & Audio.`,
            budgetId: budget.id,
          });
        }
      }
    }

    // ── Checks DEL RELEASE (una sola vez) ──

    // 5. Fecha física sin hito de fabricación
    const firstPhysicalDate = linkedBudgets.reduce<Date | null>((found, budget) => {
      if (found) return found;
      const meta = budget.metadata as Record<string, any> | null;
      return meta?.release_date_physical ? new Date(meta.release_date_physical) : null;
    }, null);
    const hasFabricacionMilestone = milestones?.some(m =>
      m.category === 'fabricacion' ||
      m.title.toLowerCase().includes('fabricaci') ||
      m.title.toLowerCase().includes('prensado') ||
      m.title.toLowerCase().includes('manufacturing')
    );
    if (firstPhysicalDate && !hasFabricacionMilestone) {
      w.push({
        key: 'physical_no_milestone-release',
        type: 'physical_no_milestone',
        title: `Falta el flujo de fabricación en el Cronograma`,
        detail: `Tienes fecha física (${format(firstPhysicalDate, 'd MMM yyyy', { locale: es })}) pero no hay hitos de fabricación en el Cronograma.`,
      });
    }

    // 6. Milestone vs deadline mismatches (release-level, deduped by key)
    if (milestones && milestones.length > 0 && currentReleaseDate) {
      const milestoneMap = new Map<string, Date>();
      for (const m of milestones) {
        if (m.due_date) milestoneMap.set(m.title.toLowerCase(), new Date(m.due_date));
      }
      for (const [key, offset] of Object.entries(DEADLINE_OFFSETS)) {
        const expectedDate = subDays(currentReleaseDate, offset.days);
        const milestoneDate = milestoneMap.get(offset.label.toLowerCase());
        if (milestoneDate) {
          const daysDiff = Math.abs(differenceInDays(milestoneDate, expectedDate));
          if (daysDiff > 2) {
            w.push({
              key: `date_mismatch-${key}`,
              type: 'date_mismatch',
              title: `"${offset.label}" no cuadra con la fecha de salida`,
              detail: `El Cronograma dice ${format(milestoneDate, "d MMM yyyy", { locale: es })} · el cálculo automático apunta a ${format(expectedDate, "d MMM yyyy", { locale: es })} · ${daysDiff} días de diferencia.`,
            });
          }
        }
      }
    }

    // ── Agrupar warnings con mismo tipo + mismo título ──
    const grouped = new Map<string, InconsistencyWarning>();
    for (const warning of w) {
      const groupKey = `${warning.type}::${warning.title}`;
      if (grouped.has(groupKey)) {
        const existing = grouped.get(groupKey)!;
        if (warning.budgetId) {
          existing.budgetIds = [...(existing.budgetIds || (existing.budgetId ? [existing.budgetId] : [])), warning.budgetId];
        }
      } else {
        grouped.set(groupKey, {
          ...warning,
          budgetIds: warning.budgetId ? [warning.budgetId] : [],
        });
      }
    }

    // Update detail for grouped warnings with multiple budgets
    for (const w of grouped.values()) {
      if (w.budgetIds && w.budgetIds.length > 1 && w.type === 'track_count') {
        const meta0 = linkedBudgets.find(b => b.id === w.budgetIds![0])?.metadata as Record<string, any> | null;
        const budgetTrackCount = meta0?.variables?.n_tracks;
        w.detail = `${w.budgetIds.length} presupuestos afectados · Actualiza el número de canciones para que los cálculos sean correctos.`;
        w.title = `Los presupuestos tienen ${budgetTrackCount} canción${budgetTrackCount !== 1 ? 'es' : ''}, pero el release tiene ${tracks?.length || 0}`;
      }
    }

    return [...grouped.values()];
  }, [release, linkedBudgets, tracks, milestones]);

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

      {/* ─── Inconsistency Task Panel ──────────────────────────────── */}
      {warnings.length > 0 && (
        <InconsistencyPanel
          warnings={warnings}
          dismissedKeys={dismissedKeys}
          onDismiss={(keys) => dismissWarning(keys)}
          onResolveTrackCount={(ids) => resolveTrackCount(ids)}
          onResolveWithReleaseDate={resolveWithReleaseDate}
          onResolveWithBudgetDate={resolveWithBudgetDate}
          onOpenBudget={(budgetId) => {
            const b = linkedBudgets.find(x => x.id === budgetId);
            if (b) { setSelectedBudget(b); setShowDetailsDialog(true); }
          }}
          onNavigateCronograma={() => navigate(`/releases/${id}/cronograma`)}
          onNavigateCreditos={() => navigate(`/releases/${id}/creditos`)}
        />
      )}

      {/* ─── Cronograma summary (deadlines) ──────────────────────── */}
      {release?.release_date && (
        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              Deadlines del Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(DEADLINE_OFFSETS).map(([key, offset]) => {
                const expectedDate = subDays(new Date(release.release_date!), offset.days);
                const milestone = milestones?.find(m => m.title.toLowerCase() === offset.label.toLowerCase());
                const milestoneDate = milestone?.due_date ? new Date(milestone.due_date) : null;
                const hasMismatch = milestoneDate && Math.abs(differenceInDays(milestoneDate, expectedDate)) > 2;

                return (
                  <div key={key} className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{offset.label}</p>
                    <p className={`text-xs font-medium ${hasMismatch ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                      {milestoneDate
                        ? format(milestoneDate, "dd MMM", { locale: es })
                        : format(expectedDate, "dd MMM", { locale: es })}
                    </p>
                    {milestone && (
                      <Badge variant="outline" className="text-[10px] mt-1 h-4">
                        {milestone.status === 'completed' ? '✓' : milestone.status === 'delayed' ? '⚠' : '○'}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowLinkDialog(true); fetchAvailableBudgets(); }}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Vincular existente
                </Button>
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Presupuesto
                </Button>
              </div>
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
                    {linkedBudgets.map((budget) => {
                      const hasWarning = warnings.some(w => w.budgetId === budget.id);
                      return (
                        <TableRow
                          key={budget.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {hasWarning && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />}
                              {budget.name}
                              {(budget.sharedReleases && budget.sharedReleases.length > 0) && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                                  <Link2 className="h-2.5 w-2.5" />
                                  Compartido
                                </Badge>
                              )}
                            </div>
                            {budget.sharedReleases && budget.sharedReleases.length > 0 && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                También en: {budget.sharedReleases.map(r => r.title).join(', ')}
                              </p>
                            )}
                          </TableCell>
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
                                title={budget.isLinkedOnly ? 'Desvincular' : 'Eliminar'}
                                onClick={() => setDeleteBudgetId(budget.id)}
                              >
                                {budget.isLinkedOnly ? <Unlink className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Music className="h-5 w-5 text-primary" />
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
      <CreateReleaseBudgetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchLinkedBudgets}
        release={release || null}
        trackCount={tracks?.length || 0}
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

      {/* Delete/Unlink Confirmation */}
      <AlertDialog open={!!deleteBudgetId} onOpenChange={() => setDeleteBudgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {linkedBudgets.find(b => b.id === deleteBudgetId)?.isLinkedOnly
                ? '¿Desvincular presupuesto?'
                : '¿Eliminar presupuesto?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {linkedBudgets.find(b => b.id === deleteBudgetId)?.isLinkedOnly
                ? 'El presupuesto dejará de estar vinculado a este lanzamiento, pero seguirá existiendo y accesible desde otros lanzamientos vinculados.'
                : 'Se eliminarán todas las partidas asociadas. Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className={linkedBudgets.find(b => b.id === deleteBudgetId)?.isLinkedOnly
                ? ''
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {linkedBudgets.find(b => b.id === deleteBudgetId)?.isLinkedOnly ? 'Desvincular' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Existing Budget Dialog */}
      <AlertDialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Vincular presupuesto existente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona un presupuesto del mismo artista para compartirlo con este lanzamiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar presupuesto..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {loadingAvailable ? (
                <Skeleton className="h-20 w-full" />
              ) : availableBudgets
                  .filter(b => !linkSearch || b.name.toLowerCase().includes(linkSearch.toLowerCase()))
                  .length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay presupuestos disponibles para vincular
                </p>
              ) : (
                availableBudgets
                  .filter(b => !linkSearch || b.name.toLowerCase().includes(linkSearch.toLowerCase()))
                  .map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleLinkBudget(b.id)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    >
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.fee ? `€${b.fee.toLocaleString()}` : 'Sin fee'}
                        {b.release_name && ` · ${b.release_name}`}
                      </p>
                    </button>
                  ))
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
