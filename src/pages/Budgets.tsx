import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calculator, Trash2, Download, FileText, Eye, TrendingUp, TrendingDown, Disc3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import CreateBudgetDialog from '@/components/CreateBudgetDialog';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { CreateBudgetFromTemplateDialog } from '@/components/CreateBudgetFromTemplateDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PermissionWrapper } from '@/components/PermissionBoundary';
import { PermissionChip } from '@/components/PermissionChip';
import { useAuthz } from '@/hooks/useAuthz';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUDGET_TYPES: Record<string, { label: string; icon: string; colorClass: string; bgClass: string }> = {
  concierto:           { label: 'Concierto',  icon: '🎤', colorClass: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  produccion_musical:  { label: 'Producción', icon: '💿', colorClass: 'text-purple-700 dark:text-purple-400',   bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  campana_promocional: { label: 'Campaña',    icon: '📣', colorClass: 'text-pink-700 dark:text-pink-400',      bgClass: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800' },
  videoclip:           { label: 'Videoclip',  icon: '🎥', colorClass: 'text-amber-700 dark:text-amber-400',    bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  otros:               { label: 'Otros',      icon: '📋', colorClass: 'text-muted-foreground',                 bgClass: 'bg-muted/40 border-border' },
};

function getBudgetType(type?: string) {
  if (!type) return BUDGET_TYPES.otros;
  return BUDGET_TYPES[type] ?? BUDGET_TYPES.otros;
}

function getEstadoReal(budget: Budget): string {
  const meta = budget.metadata as any;
  if (meta?.estado) return meta.estado;
  if (budget.show_status) return budget.show_status;
  if (
    budget.budget_status &&
    budget.budget_status !== 'nacional' &&
    budget.budget_status !== 'internacional'
  ) {
    return budget.budget_status;
  }
  return 'borrador';
}

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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      label: 'Evento',
    };
  }
  return {
    date: new Date(budget.created_at).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    label: 'Creado',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Budgets() {
  usePageTitle('Presupuestos');
  const { id } = useParams();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterArtist, setFilterArtist] = useState('all');
  const [artists, setArtists] = useState<{ id: string; name: string; stage_name?: string }[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { showGlobalSearch, setShowGlobalSearch } = useGlobalSearch();

  useEffect(() => {
    fetchBudgets();
    fetchArtists();
  }, []);

  useEffect(() => {
    if (id && budgets.length > 0) {
      const budget = budgets.find((b) => b.id === id);
      if (budget) handleViewBudget(budget);
    }
  }, [id, budgets]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      let query = supabase
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

      if (filterArtist !== 'all') {
        query = query.eq('artist_id', filterArtist);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBudgets((data as any) || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los presupuestos',
        variant: 'destructive',
      });
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

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
      if (error) throw error;
      toast({ title: 'Éxito', description: 'Presupuesto eliminado correctamente' });
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el presupuesto', variant: 'destructive' });
    }
  };

  const handleViewBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDetailsDialog(true);
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filteredBudgets = budgets.filter((budget) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      budget.name.toLowerCase().includes(q) ||
      (budget.artists?.stage_name?.toLowerCase().includes(q) ?? false) ||
      (budget.artists?.name?.toLowerCase().includes(q) ?? false) ||
      (budget.releases?.title?.toLowerCase().includes(q) ?? false) ||
      (budget.projects?.name?.toLowerCase().includes(q) ?? false) ||
      (budget.city?.toLowerCase().includes(q) ?? false);

    const matchesType = filterType === 'all' || budget.type === filterType;

    return matchesSearch && matchesType;
  });

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-8">

        {/* Header */}
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

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-moodita">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-bold">{filteredBudgets.length}</p>
              <p className="text-xs text-muted-foreground">presupuestos</p>
            </CardContent>
          </Card>
          <Card className="card-moodita">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Capital</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                €{totalCapital.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-muted-foreground">ingresos estimados</p>
            </CardContent>
          </Card>
          <Card className="card-moodita">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gastos</p>
              <p className="text-2xl font-bold text-destructive">
                €{totalGastos.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-muted-foreground">costes estimados</p>
            </CardContent>
          </Card>
          <Card className="card-moodita">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                {balance >= 0 ? '+' : ''}€{balance.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-muted-foreground">capital − gastos</p>
            </CardContent>
          </Card>
        </div>

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

                <Select value={filterArtist} onValueChange={(v) => { setFilterArtist(v); fetchBudgets(); }}>
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
                      <TableHead className="text-right w-[90px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgets.map((budget) => {
                      const budgetType = getBudgetType(budget.type);
                      const estado = getEstadoReal(budget);
                      const vinculacion = getVinculacion(budget);
                      const { date, label } = formatFecha(budget);
                      const artistaLabel =
                        budget.artists?.stage_name || budget.artists?.name || null;

                      return (
                        <TableRow
                          key={budget.id}
                          className="hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => handleViewBudget(budget)}
                        >
                          {/* Tipo */}
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${budgetType.bgClass} ${budgetType.colorClass}`}
                            >
                              <span>{budgetType.icon}</span>
                              <span>{budgetType.label}</span>
                            </span>
                          </TableCell>

                          {/* Nombre */}
                          <TableCell className="font-medium max-w-[220px] truncate">
                            {budget.name}
                          </TableCell>

                          {/* Artista */}
                          <TableCell className="text-sm text-muted-foreground">
                            {artistaLabel ?? <span className="text-muted-foreground/50">—</span>}
                          </TableCell>

                          {/* Vinculado a */}
                          <TableCell>
                            {vinculacion ? (
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

                          {/* Fecha */}
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
                            <Badge variant={getEstadoBadgeVariant(estado)} className="capitalize text-xs">
                              {estado}
                            </Badge>
                          </TableCell>

                          {/* Capital */}
                          <TableCell className="text-right tabular-nums">
                            {(budget.fee ?? 0) > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                €{budget.fee!.toLocaleString('es-ES')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>

                          {/* Gastos */}
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewBudget(budget)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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

        <GlobalSearchDialog open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />
      </div>
    </div>
  );
}
