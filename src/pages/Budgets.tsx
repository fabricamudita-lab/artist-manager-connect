import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calculator, Trash2, FileText, Eye, Pencil, Check, X, AlertTriangle, GitMerge } from 'lucide-react';
import { DuplicateResolverDialog, getEstadoReal } from '@/components/finanzas/DuplicateResolverDialog';
import { BudgetSummaryCards } from '@/components/finanzas/BudgetSummaryCards';
import { CapitalByArtistPanel } from '@/components/finanzas/CapitalByArtistPanel';
import { CashflowPanel } from '@/components/finanzas/CashflowPanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import CreateBudgetDialog from '@/components/CreateBudgetDialog';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { CreateBudgetFromTemplateDialog } from '@/components/CreateBudgetFromTemplateDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PermissionWrapper } from '@/components/PermissionBoundary';
import { PermissionChip } from '@/components/PermissionChip';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Budget {
  id: string;
  name: string;
  type?: string;
  city?: string;
  venue?: string;
  event_date?: string;
  budget_status?: string;
  show_status?: string;
  fee?: number;
  expense_budget?: number;
  computed_disponible?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  artist_id?: string;
  release_id?: string;
  project_id?: string;
  artists?: { name: string; stage_name?: string } | null;
  releases?: { title: string } | null;
  projects?: { name: string } | null;
}

interface EditValues {
  name: string;
  estado: string;
  project_id: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUDGET_TYPES: Record<string, { label: string; icon: string; colorClass: string; bgClass: string }> = {
  concierto:           { label: 'Concierto',  icon: '🎤', colorClass: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  produccion_musical:  { label: 'Producción', icon: '💿', colorClass: 'text-purple-700 dark:text-purple-400',   bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  campana_promocional: { label: 'Campaña',    icon: '📣', colorClass: 'text-pink-700 dark:text-pink-400',      bgClass: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800' },
  videoclip:           { label: 'Videoclip',  icon: '🎥', colorClass: 'text-amber-700 dark:text-amber-400',    bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  otros:               { label: 'Otros',      icon: '📋', colorClass: 'text-muted-foreground',                 bgClass: 'bg-muted/40 border-border' },
};

const ESTADO_OPTIONS = [
  { value: 'borrador',       label: 'Borrador' },
  { value: 'pendiente',      label: 'Pendiente' },
  { value: 'confirmado',     label: 'Confirmado' },
  { value: 'en produccion',  label: 'En producción' },
  { value: 'facturado',      label: 'Facturado' },
  { value: 'liquidado',      label: 'Liquidado' },
  { value: 'cancelado',      label: 'Cancelado' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBudgetType(type?: string) {
  if (!type) return BUDGET_TYPES.otros;
  return BUDGET_TYPES[type] ?? BUDGET_TYPES.otros;
}

// getEstadoReal imported from DuplicateResolverDialog module


function getEstadoBadgeVariant(
  estado: string
): 'success' | 'warning' | 'accent' | 'destructive' | 'muted' | 'secondary' | 'outline' {
  switch (estado.toLowerCase()) {
    case 'confirmado':
    case 'aprobado':
    case 'liquidado':
      return 'success';
    case 'pendiente':
    case 'en revision':
    case 'en revisión':
      return 'warning';
    case 'produccion':
    case 'producción':
    case 'en produccion':
    case 'en producción':
      return 'accent';
    case 'cancelado':
    case 'rechazado':
      return 'destructive';
    case 'facturado':
    case 'enviado':
      return 'secondary';
    default:
      return 'muted';
  }
}

function getVinculacion(budget: Budget): { label: string; type: 'release' | 'project' } | null {
  if (budget.releases?.title) return { label: budget.releases.title, type: 'release' };
  if (budget.projects?.name) return { label: budget.projects.name, type: 'project' };
  return null;
}

function formatFecha(budget: Budget): { date: string; label: string } {
  if (budget.event_date) {
    return {
      date: new Date(budget.event_date).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }),
      label: 'Evento',
    };
  }
  return {
    date: new Date(budget.created_at).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }),
    label: 'Creado',
  };
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

function areSimilar(a: Budget, b: Budget): boolean {
  const sameName = a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  const sameArtist = a.artist_id === b.artist_id;
  const sameType = (a.type ?? '') === (b.type ?? '');
  const sameFee = (a.fee ?? 0) === (b.fee ?? 0);
  const sameDate = (a.event_date ?? null) === (b.event_date ?? null);
  return sameName && sameArtist && sameType && (sameFee || sameDate);
}

function detectDuplicates(budgets: Budget[]): Budget[][] {
  const groups: Budget[][] = [];
  const visited = new Set<string>();
  for (let i = 0; i < budgets.length; i++) {
    if (visited.has(budgets[i].id)) continue;
    const group = [budgets[i]];
    for (let j = i + 1; j < budgets.length; j++) {
      if (!visited.has(budgets[j].id) && areSimilar(budgets[i], budgets[j])) {
        group.push(budgets[j]);
        visited.add(budgets[j].id);
      }
    }
    if (group.length > 1) {
      groups.push(group);
      visited.add(budgets[i].id);
    }
  }
  return groups;
}

function hasDifferences(group: Budget[]): boolean {
  const ref = group[0];
  return group.slice(1).some(
    (b) =>
      (b.fee ?? 0) !== (ref.fee ?? 0) ||
      getEstadoReal(b) !== getEstadoReal(ref) ||
      (b.project_id ?? null) !== (ref.project_id ?? null) ||
      (b.release_id ?? null) !== (ref.release_id ?? null),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Budgets({ embedded = false, artistId }: { embedded?: boolean; artistId?: string }) {
  usePageTitle(embedded ? '' : 'Presupuestos');
  const { id } = useParams();
  const navigate = useNavigate();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterArtist, setFilterArtist] = useState(artistId || 'all');
  const [artists, setArtists] = useState<{ id: string; name: string; stage_name?: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Inline editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({ name: '', estado: 'borrador', project_id: null });
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<{ budgetId: string; projectName: string } | null>(null);

  // Duplicate detection state
  const [duplicateGroups, setDuplicateGroups] = useState<Budget[][]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  const [cardFilter, setCardFilter] = useState<'activos' | 'disponible' | 'excedidos' | null>(null);
  const [showCapitalPanel, setShowCapitalPanel] = useState(false);
  const [showCashflowPanel, setShowCashflowPanel] = useState(false);

  const { showGlobalSearch, setShowGlobalSearch } = useGlobalSearch();

  // Sync external artistId prop
  useEffect(() => {
    setFilterArtist(artistId || 'all');
  }, [artistId]);

  useEffect(() => {
    fetchBudgets();
    fetchArtists();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (id && budgets.length > 0) {
      const budget = budgets.find((b) => b.id === id);
      if (budget) handleViewBudget(budget);
    }
  }, [id, budgets]);

  useEffect(() => {
    setDuplicateGroups(detectDuplicates(budgets));
  }, [budgets]);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id, name, type, city, venue, event_date, budget_status, show_status,
          fee, expense_budget, metadata, created_at, updated_at, artist_id,
          release_id, project_id,
          artists:artist_id(name, stage_name),
          releases:release_id(title),
          projects:project_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich budgets with real expenses from budget_items
      const budgetIds = (data || []).map(b => b.id);
      let enrichedData = data || [];
      if (budgetIds.length > 0) {
        const { data: items } = await supabase
          .from('budget_items')
          .select('budget_id, unit_price, quantity, is_provisional, billing_status')
          .in('budget_id', budgetIds);

        const expenseMap = new Map<string, number>();
        const disponibleMap = new Map<string, number>();

        (items || []).forEach(item => {
          const amount = (item.unit_price ?? 0) * (item.quantity || 1);
          expenseMap.set(item.budget_id, (expenseMap.get(item.budget_id) ?? 0) + amount);
        });

        (data || []).forEach(b => {
          const capital = b.fee || 0;
          const budgetItems = (items || []).filter(i => i.budget_id === b.id);
          const paid = budgetItems.filter(i => i.billing_status === 'pagado').reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
          const confirmed = budgetItems.filter(i => !i.is_provisional && i.billing_status !== 'pagado').reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
          const provisional = budgetItems.filter(i => i.is_provisional && i.billing_status !== 'pagado').reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
          disponibleMap.set(b.id, capital - paid - confirmed - provisional);
        });

        enrichedData = (data || []).map(b => ({
          ...b,
          expense_budget: expenseMap.get(b.id) ?? b.expense_budget ?? 0,
          computed_disponible: disponibleMap.get(b.id) ?? (b.fee || 0),
        }));
      }

      setBudgets((enrichedData as any) || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los presupuestos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name', { ascending: true });
      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      // Snapshot for undo
      const { data: snapshot } = await (supabase as any)
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
      if (error) throw error;
      fetchBudgets();

      if (snapshot) {
        const { toast: sonnerToast } = await import('sonner');
        sonnerToast.success('Presupuesto eliminado', {
          duration: 5000,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              const { error: insertError } = await (supabase as any)
                .from('budgets')
                .insert(snapshot);
              if (insertError) {
                sonnerToast.error('Error al deshacer');
              } else {
                sonnerToast.success('Acción revertida');
                fetchBudgets();
              }
            },
          },
        });
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el presupuesto', variant: 'destructive' });
    }
  };

  const handleViewBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDetailsDialog(true);
  };

  // ─── Inline editing ─────────────────────────────────────────────────────────

  const startEditing = (budget: Budget, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRowId(budget.id);
    setEditValues({
      name: budget.name,
      estado: getEstadoReal(budget),
      project_id: budget.project_id ?? null,
    });
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRowId(null);
  };

  const handleSave = async (budgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) return;

    // Check if project is being unlinked
    const wasLinked = !!budget.project_id;
    const isNowUnlinked = editValues.project_id === null || editValues.project_id === 'none';
    if (wasLinked && isNowUnlinked) {
      const projectName = budget.projects?.name ?? 'este proyecto';
      setConfirmUnlink({ budgetId, projectName });
      return;
    }

    await persistSave(budgetId, editValues, budget);
  };

  const persistSave = async (budgetId: string, values: EditValues, budget: Budget) => {
    setSavingRowId(budgetId);
    try {
      const resolvedProjectId = (values.project_id === 'none' || values.project_id === '')
        ? null
        : values.project_id;

      const updatePayload: Record<string, any> = {
        name: values.name,
        metadata: { ...(budget.metadata || {}), estado: values.estado },
        project_id: resolvedProjectId,
      };

      // Also update show_status for concerts — only if the value is valid for that enum
      const VALID_SHOW_STATUS = ['confirmado', 'pendiente', 'cancelado'];
      if (budget.type === 'concierto' && VALID_SHOW_STATUS.includes(values.estado)) {
        updatePayload.show_status = values.estado;
      }

      const { error } = await supabase.from('budgets').update(updatePayload).eq('id', budgetId);
      if (error) throw error;

      toast({ title: 'Guardado', description: 'Presupuesto actualizado correctamente' });
      setEditingRowId(null);
      fetchBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSavingRowId(null);
    }
  };

  const handleConfirmedUnlink = async () => {
    if (!confirmUnlink) return;
    const budget = budgets.find((b) => b.id === confirmUnlink.budgetId);
    if (!budget) return;
    const values: EditValues = { ...editValues, project_id: null };
    setConfirmUnlink(null);
    await persistSave(confirmUnlink.budgetId, values, budget);
  };

  // ─── Filtering (all local — no stale closure bugs) ──────────────────────────

  // ─── Duplicate handlers ─────────────────────────────────────────────────────

  const handleKeepOne = async (keepId: string, group: Budget[]) => {
    const toDelete = group.filter((b) => b.id !== keepId);
    for (const b of toDelete) {
      await handleDeleteBudget(b.id);
    }
    setShowDuplicateDialog(false);
    toast({ title: 'Listo', description: `${toDelete.length} duplicado${toDelete.length !== 1 ? 's' : ''} eliminado${toDelete.length !== 1 ? 's' : ''}` });
  };

  const handleMergeAndSave = async (targetId: string, overrides: Record<string, any>, group: Budget[]) => {
    try {
      const { error } = await supabase.from('budgets').update(overrides).eq('id', targetId);
      if (error) throw error;
      const toDelete = group.filter((b) => b.id !== targetId);
      for (const b of toDelete) {
        await supabase.from('budgets').delete().eq('id', b.id);
      }
      toast({ title: 'Fusionado', description: 'Presupuesto fusionado y duplicados eliminados' });
      setShowDuplicateDialog(false);
      fetchBudgets();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo fusionar', variant: 'destructive' });
    }
  };

  const handleCardClick = (type: 'activos' | 'capital' | 'comprometido' | 'disponible' | 'excedidos') => {
    if (type === 'capital') {
      setShowCapitalPanel(true);
      return;
    }
    if (type === 'comprometido') {
      setShowCashflowPanel(true);
      return;
    }
    if (type === 'excedidos') {
      const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
      const exceeded = budgets.filter(b => {
        const isClosed = closedStatuses.includes(getEstadoReal(b));
        return !isClosed && (b.computed_disponible ?? 0) < 0;
      });
      if (exceeded.length === 1) {
        handleViewBudget(exceeded[0]);
        return;
      }
    }
    setCardFilter(prev => prev === type ? null : type);
  };

  const filteredBudgets = (() => {
    const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
    let result = budgets.filter((budget) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        budget.name.toLowerCase().includes(q) ||
        (budget.artists?.stage_name?.toLowerCase().includes(q) ?? false) ||
        (budget.artists?.name?.toLowerCase().includes(q) ?? false) ||
        (budget.releases?.title?.toLowerCase().includes(q) ?? false) ||
        (budget.projects?.name?.toLowerCase().includes(q) ?? false) ||
        (budget.city?.toLowerCase().includes(q) ?? false);

      const matchesType = filterType === 'all' || budget.type === filterType;
      const matchesArtist = filterArtist === 'all' || budget.artist_id === filterArtist;

      let matchesCard = true;
      if (cardFilter === 'activos') {
        matchesCard = !closedStatuses.includes(getEstadoReal(budget));
      } else if (cardFilter === 'disponible') {
        matchesCard = !closedStatuses.includes(getEstadoReal(budget)) && (budget.computed_disponible ?? 0) > 0;
      } else if (cardFilter === 'excedidos') {
        matchesCard = !closedStatuses.includes(getEstadoReal(budget)) && (budget.computed_disponible ?? 0) < 0;
      }

      return matchesSearch && matchesType && matchesArtist && matchesCard;
    });

    if (cardFilter === 'disponible') {
      result.sort((a, b) => (b.computed_disponible ?? 0) - (a.computed_disponible ?? 0));
    } else if (cardFilter === 'excedidos') {
      result.sort((a, b) => (a.computed_disponible ?? 0) - (b.computed_disponible ?? 0));
    }

    return result;
  })();

  // Precompute duplicate IDs for row indicators
  const duplicateIds = new Set(duplicateGroups.flat().map((b) => b.id));

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  const totalCapital = filteredBudgets.reduce((s, b) => s + (b.fee ?? 0), 0);
  const totalGastos = filteredBudgets.reduce((s, b) => s + (b.expense_budget ?? 0), 0);
  const balance = totalCapital - totalGastos;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-lg text-muted-foreground">Cargando presupuestos…</div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gradient-to-br from-background via-muted/10 to-background'}>
      <div className={embedded ? 'space-y-8' : 'container-moodita section-spacing space-y-8'}>

        {/* Header — hidden when embedded */}
        {!embedded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-xl">
                <Calculator className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Presupuestos</h1>
                <p className="text-muted-foreground">Gestiona todos los presupuestos de la empresa</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PermissionChip />
              <PermissionWrapper requiredPermission="createBudget">
                <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Presupuesto
                </Button>
              </PermissionWrapper>
            </div>
          </div>
        )}

        {/* New budget button when embedded */}
        {embedded && (
          <div className="flex justify-end">
            <PermissionWrapper requiredPermission="createBudget">
              <Button onClick={() => setShowCreateDialog(true)} className="btn-primary" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nuevo Presupuesto
              </Button>
            </PermissionWrapper>
          </div>
        )}

        {/* KPI Cards */}
        <BudgetSummaryCards budgets={filteredBudgets} onCardClick={handleCardClick} activeCard={cardFilter} />

        {/* Filters */}
        <div className="card-moodita hover-lift">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, artista, release o proyecto…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                {/* Tipo filter */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="concierto">🎤 Concierto</SelectItem>
                    <SelectItem value="produccion_musical">💿 Producción</SelectItem>
                    <SelectItem value="campana_promocional">📣 Campaña</SelectItem>
                    <SelectItem value="videoclip">🎥 Videoclip</SelectItem>
                    <SelectItem value="otros">📋 Otros</SelectItem>
                  </SelectContent>
                </Select>

                {/* Artista filter — local, no stale-closure bug */}
                <Select value={filterArtist} onValueChange={setFilterArtist}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Artista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los artistas</SelectItem>
                    {artists.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.stage_name || a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </div>

        {/* Active card filter chip */}
        {cardFilter && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                cardFilter === 'excedidos'
                  ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                  : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
              }`}
              onClick={() => setCardFilter(null)}
            >
              Filtrando: {cardFilter === 'activos' ? 'Activos' : cardFilter === 'disponible' ? 'Con margen disponible' : 'Excedidos'}
              <X className="h-3 w-3" />
            </span>
          </div>
        )}

        {/* Duplicate warning banner */}
        {duplicateGroups.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">
              Se detectaron <strong>{duplicateGroups.length} grupo{duplicateGroups.length > 1 ? 's' : ''}</strong> con posibles duplicados
              ({duplicateGroups.reduce((n, g) => n + g.length, 0)} presupuestos)
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs"
              onClick={() => { setCurrentGroupIndex(0); setShowDuplicateDialog(true); }}
            >
              Revisar duplicados
            </Button>
          </div>
        )}

        {/* Table */}
        <Card className="card-moodita">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              Lista de Presupuestos
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {filteredBudgets.length} resultado{filteredBudgets.length !== 1 ? 's' : ''}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredBudgets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay presupuestos que coincidan con los filtros
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Tipo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Vinculado a</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Gastos</TableHead>
                      <TableHead className="text-right w-[110px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgets.map((budget) => {
                      const isEditing = editingRowId === budget.id;
                      const isSaving = savingRowId === budget.id;
                      const budgetType = getBudgetType(budget.type);
                      const estado = getEstadoReal(budget);
                      const vinculacion = getVinculacion(budget);
                      const { date, label } = formatFecha(budget);
                      const artistaLabel = budget.artists?.stage_name || budget.artists?.name || null;
                      const isDuplicate = duplicateIds.has(budget.id);

                      return (
                        <TableRow
                          key={budget.id}
                          className={`transition-colors ${
                            isEditing
                              ? 'ring-2 ring-inset ring-primary/30 bg-primary/5'
                              : 'hover:bg-muted/40 cursor-pointer'
                          }`}
                          onClick={() => {
                            if (!isEditing) handleViewBudget(budget);
                          }}
                        >
                          {/* Tipo — never editable */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {isDuplicate && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="text-amber-500 dark:text-amber-400 cursor-pointer hover:text-amber-600"
                                      onClick={(e) => { e.stopPropagation(); setCurrentGroupIndex(0); setShowDuplicateDialog(true); }}
                                    >
                                      ⚠
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Posible duplicado — clic para revisar</TooltipContent>
                                </Tooltip>
                              )}
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${budgetType.bgClass} ${budgetType.colorClass}`}>
                                <span>{budgetType.icon}</span>
                                <span>{budgetType.label}</span>
                              </span>
                            </div>
                          </TableCell>

                          {/* Nombre */}
                          <TableCell className="font-medium max-w-[220px]">
                            {isEditing ? (
                              <Input
                                value={editValues.name}
                                onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setEditingRowId(null);
                                }}
                                className="h-8 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate block">{budget.name}</span>
                            )}
                          </TableCell>

                          {/* Artista — never editable */}
                          <TableCell className="text-sm text-muted-foreground">
                            {artistaLabel ?? <span className="text-muted-foreground/50">—</span>}
                          </TableCell>

                          {/* Vinculado a */}
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editValues.project_id ?? 'none'}
                                onValueChange={(v) =>
                                  setEditValues((prev) => ({ ...prev, project_id: v === 'none' ? null : v }))
                                }
                              >
                                <SelectTrigger
                                  className="h-8 text-xs w-[160px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue placeholder="Sin proyecto" />
                                </SelectTrigger>
                                <SelectContent onClick={(e) => e.stopPropagation()}>
                                  <SelectItem value="none">Sin vínculo</SelectItem>
                                  {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : vinculacion ? (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                                  vinculacion.type === 'release'
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                                }`}
                              >
                                {vinculacion.type === 'release' ? '💿' : '📁'}
                                <span className="max-w-[120px] truncate">{vinculacion.label}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>

                          {/* Fecha — never editable */}
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm tabular-nums">{date}</span>
                              </TooltipTrigger>
                              <TooltipContent>{label}</TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Estado */}
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editValues.estado}
                                onValueChange={(v) => setEditValues((prev) => ({ ...prev, estado: v }))}
                              >
                                <SelectTrigger
                                  className="h-8 text-xs w-[150px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent onClick={(e) => e.stopPropagation()}>
                                  {ESTADO_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={getEstadoBadgeVariant(estado)} className="capitalize text-xs">
                                {estado}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Capital — never editable */}
                          <TableCell className="text-right tabular-nums">
                            {(budget.fee ?? 0) > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                €{budget.fee!.toLocaleString('es-ES')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>

                          {/* Gastos — never editable */}
                          <TableCell className="text-right tabular-nums">
                            {(budget.expense_budget ?? 0) > 0 ? (
                              <span className="text-destructive font-medium">
                                €{budget.expense_budget!.toLocaleString('es-ES')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>

                          {/* Acciones */}
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {isEditing ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isSaving}
                                        onClick={(e) => handleSave(budget.id, e)}
                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Guardar</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEditing}
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancelar</TooltipContent>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => startEditing(budget, e)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar fila</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewBudget(budget)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver detalle</TooltipContent>
                                  </Tooltip>
                                  <PermissionWrapper requiredPermission="manage">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta acción no se puede deshacer. El presupuesto "{budget.name}" será eliminado permanentemente.
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
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Side Panels */}
        <CapitalByArtistPanel
          open={showCapitalPanel}
          onOpenChange={setShowCapitalPanel}
          budgets={budgets}
        />
        <CashflowPanel
          open={showCashflowPanel}
          onOpenChange={setShowCashflowPanel}
          budgets={budgets}
        />

        {/* Dialogs */}
        <CreateBudgetDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={fetchBudgets}
        />

        <CreateBudgetFromTemplateDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          onSuccess={fetchBudgets}
        />

        {selectedBudget && (
          <BudgetDetailsDialog
            open={showDetailsDialog}
            onOpenChange={(open) => {
              setShowDetailsDialog(open);
              if (!open) {
                setSelectedBudget(null);
                if (id) navigate('/budgets');
              }
            }}
            budget={selectedBudget as any}
            onUpdate={fetchBudgets}
          />
        )}

        {/* Confirm unlink project dialog */}
        <AlertDialog open={!!confirmUnlink} onOpenChange={(open) => { if (!open) setConfirmUnlink(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desvincular del proyecto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esto eliminará el vínculo entre este presupuesto y el proyecto{' '}
                <strong>"{confirmUnlink?.projectName}"</strong>.
                Los datos del presupuesto no se eliminarán.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmUnlink(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmedUnlink} className="bg-destructive hover:bg-destructive/90">
                Desvincular
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Duplicate resolver dialog */}
        {duplicateGroups.length > 0 && (
          <DuplicateResolverDialog
            open={showDuplicateDialog}
            onOpenChange={setShowDuplicateDialog}
            groups={duplicateGroups}
            currentIndex={currentGroupIndex}
            onNavigate={setCurrentGroupIndex}
            onKeep={handleKeepOne}
            onMerge={handleMergeAndSave}
          />
        )}

        <GlobalSearchDialog open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />
      </div>
    </div>
  );
}
