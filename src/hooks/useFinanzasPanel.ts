import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  subMonths, subDays, subQuarters, subYears, format, formatDistanceToNow,
  startOfWeek, endOfWeek, addWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type PeriodFilter = 'month' | 'quarter' | 'year' | 'rolling12';

interface PeriodRange { start: string; end: string }

function getPeriodRange(period: PeriodFilter): PeriodRange {
  const now = new Date();
  switch (period) {
    case 'month':
      return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'quarter':
      return { start: format(startOfQuarter(now), 'yyyy-MM-dd'), end: format(endOfQuarter(now), 'yyyy-MM-dd') };
    case 'year':
      return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
    case 'rolling12':
      return { start: format(subMonths(now, 11), 'yyyy-MM-01'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
  }
}

function getPreviousPeriodRange(period: PeriodFilter): PeriodRange {
  const now = new Date();
  switch (period) {
    case 'month': {
      const prev = subMonths(now, 1);
      return { start: format(startOfMonth(prev), 'yyyy-MM-dd'), end: format(endOfMonth(prev), 'yyyy-MM-dd') };
    }
    case 'quarter': {
      const prev = subQuarters(now, 1);
      return { start: format(startOfQuarter(prev), 'yyyy-MM-dd'), end: format(endOfQuarter(prev), 'yyyy-MM-dd') };
    }
    case 'year': {
      const prev = subYears(now, 1);
      return { start: format(startOfYear(prev), 'yyyy-MM-dd'), end: format(endOfYear(prev), 'yyyy-MM-dd') };
    }
    case 'rolling12': {
      return { start: format(subMonths(now, 23), 'yyyy-MM-01'), end: format(endOfMonth(subMonths(now, 12)), 'yyyy-MM-dd') };
    }
  }
}

function getCurrentQuarterLabel(): string {
  const q = Math.ceil((new Date().getMonth() + 1) / 3);
  return `T${q} ${new Date().getFullYear()}`;
}

export interface RecentEvent {
  id: string;
  icon: string;
  description: string;
  amount: number;
  date: string;
  relativeDate: string;
  artistName: string;
  link?: string;
  isExpense: boolean;
}

export interface SourceBreakdown {
  name: string;
  label: string;
  value: number;
  color: string;
  emoji: string;
}

export interface ArtistRevenueSummary {
  artistId: string;
  artistName: string;
  avatarUrl?: string | null;
  total: number;
  percentage: number;
}

export interface ChartPoint {
  month: string;
  label: string;
  ingresos: number;
  gastos: number;
}

export function useFinanzasPanel(artistId: string, period: PeriodFilter) {
  const range = getPeriodRange(period);
  const prevRange = getPreviousPeriodRange(period);

  // ── Cobros table ──
  const cobrosQuery = useQuery({
    queryKey: ['finanzas-panel-cobros', artistId, range.start, range.end],
    queryFn: async () => {
      let q = supabase.from('cobros').select('*, artists!cobros_artist_id_fkey(name, stage_name, avatar_url)');
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data } = await q;
      return data || [];
    },
  });

  const prevCobrosQuery = useQuery({
    queryKey: ['finanzas-panel-cobros-prev', artistId, prevRange.start, prevRange.end],
    queryFn: async () => {
      let q = supabase.from('cobros').select('id, amount_gross, status, received_date, type');
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      q = q.gte('received_date', prevRange.start).lte('received_date', prevRange.end).eq('status', 'cobrado');
      const { data } = await q;
      return data || [];
    },
  });

  // ── Bookings ──
  const bookingsQuery = useQuery({
    queryKey: ['finanzas-panel-bookings', artistId],
    queryFn: async () => {
      let q = supabase.from('booking_offers').select('id, fee, estado, cobro_estado, cobro_fecha, fecha, phase, artist_id, festival_ciclo, ciudad, venue, artists!booking_offers_artist_id_fkey(name, stage_name, avatar_url)');
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data } = await q;
      return data || [];
    },
  });

  // ── Budgets + items ──
  const budgetsQuery = useQuery({
    queryKey: ['finanzas-panel-budgets', artistId],
    queryFn: async () => {
      let q = supabase.from('budgets').select('id, name, fee, expense_budget, metadata, budget_status, artist_id, event_date, artists!budgets_artist_id_fkey(name, stage_name, avatar_url)');
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data } = await q;
      return data || [];
    },
  });

  const budgetItemsQuery = useQuery({
    queryKey: ['finanzas-panel-items', budgetsQuery.data?.map(b => b.id).join(',')],
    queryFn: async () => {
      const budgetIds = (budgetsQuery.data || []).map(b => b.id);
      if (!budgetIds.length) return [];
      const { data } = await supabase
        .from('budget_items')
        .select('id, budget_id, name, unit_price, quantity, is_provisional, billing_status, iva_percentage, irpf_percentage, category, contact_id, updated_at')
        .in('budget_id', budgetIds);
      return data || [];
    },
    enabled: !!budgetsQuery.data?.length,
  });

  // ── Unread notifications ──
  const notificationsQuery = useQuery({
    queryKey: ['finanzas-panel-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('booking_notifications')
        .select('id, message, type')
        .eq('read', false)
        .in('type', ['cobro_7d', 'cobro_30d']);
      return data || [];
    },
  });

  // ── Derived data ──
  const allCobros = cobrosQuery.data || [];
  const prevCobros = prevCobrosQuery.data || [];
  const allBookings = bookingsQuery.data || [];
  const allBudgets = budgetsQuery.data || [];
  const allItems = budgetItemsQuery.data || [];
  const unreadNotifs = notificationsQuery.data || [];

  const loading = cobrosQuery.isLoading || bookingsQuery.isLoading || budgetsQuery.isLoading || budgetItemsQuery.isLoading;

  // ── Helpers ──
  const sumItems = (items: typeof allItems) => items.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
  const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
  const getEstado = (b: any) => {
    const meta = b.metadata as any;
    if (meta?.estado) return meta.estado;
    if (b.budget_status && !['nacional', 'internacional'].includes(b.budget_status)) return b.budget_status;
    return 'borrador';
  };
  const activeBudgets = allBudgets.filter(b => !closedStatuses.includes(getEstado(b)));
  const activeIds = new Set(activeBudgets.map(b => b.id));

  // ══ KPI 1: Ingresos Brutos ══
  // From cobros table (primary source)
  const periodCobros = allCobros.filter(c => c.status === 'cobrado' && c.received_date && c.received_date >= range.start && c.received_date <= range.end);
  const ingresosCobros = periodCobros.reduce((s, c) => s + (c.amount_gross || 0), 0);

  // Also include booking fees marked as cobrado_completo within period
  const cobradoBookings = allBookings.filter(b =>
    b.cobro_estado === 'cobrado_completo' && b.cobro_fecha && b.cobro_fecha >= range.start && b.cobro_fecha <= range.end
  );
  // Avoid double-counting: exclude bookings already in cobros
  const cobrosBookingIds = new Set(allCobros.filter(c => c.booking_id).map(c => c.booking_id));
  const additionalBookingIncome = cobradoBookings
    .filter(b => !cobrosBookingIds.has(b.id))
    .reduce((s, b) => s + (b.fee || 0), 0);

  const ingresosBrutos = ingresosCobros + additionalBookingIncome;
  const cobrosCount = periodCobros.length + cobradoBookings.filter(b => !cobrosBookingIds.has(b.id)).length;

  // Previous period ingresos for trend
  const prevIngresos = prevCobros.reduce((s, c) => s + (c.amount_gross || 0), 0);
  const ingresosTrend = prevIngresos > 0 ? ((ingresosBrutos - prevIngresos) / prevIngresos) * 100 : (ingresosBrutos > 0 ? 100 : null);

  // ══ Phase classification (accounting) ══
  // Comprometido = firmado/confirmado (Accounts Receivable)
  // Pipeline = forecast no confirmado (no se contabiliza)
  const CONFIRMED_PHASES = ['confirmado', 'realizado', 'facturado'];
  const PIPELINE_PHASES = ['interes', 'interés', 'oferta', 'negociacion', 'negociación', 'propuesta'];

  // ══ KPI 2: Gastos ══
  const activeItems = allItems.filter(i => activeIds.has(i.budget_id));
  const confirmedItems = activeItems.filter(i => !i.is_provisional);
  const provisionalItems = activeItems.filter(i => i.is_provisional);
  const gastosComprometidos = sumItems(confirmedItems);   // committed (firmados)
  const gastosPrevistos = sumItems(provisionalItems);     // estimated (provisionales)
  // Backwards-compat aliases
  const gastosConfirmados = gastosComprometidos;
  const gastosProvisionales = gastosPrevistos;

  // ══ KPI 3: Resultado ══
  // Contable = solo lo firmado (auditable)
  const resultadoContable = ingresosBrutos - gastosComprometidos;
  const margenPct = ingresosBrutos > 0 ? Math.round((resultadoContable / ingresosBrutos) * 100) : 0;
  // Backwards-compat alias
  const beneficioNeto = resultadoContable;

  // ══ KPI 4: Cobros Comprometidos (Accounts Receivable) ══
  // Solo bookings en fase confirmada/realizada con cobro pendiente
  const pendienteBookings = allBookings.filter(b =>
    CONFIRMED_PHASES.includes(b.phase || '') &&
    b.cobro_estado !== 'cobrado_completo' &&
    (b.fee || 0) > 0
  );
  const cobrosComprometidos = pendienteBookings.reduce((s, b) => s + (b.fee || 0), 0);
  const eventosSinCobrar = pendienteBookings.length;
  // Backwards-compat alias
  const cobrosPendientes = cobrosComprometidos;

  // ══ Pipeline de Ingresos (forecast, NO se suma a contabilidad) ══
  const pipelineBookings = allBookings.filter(b =>
    PIPELINE_PHASES.includes(b.phase || '') &&
    (b.fee || 0) > 0
  );
  const pipelineIngresos = pipelineBookings.reduce((s, b) => s + (b.fee || 0), 0);
  const pipelineCount = pipelineBookings.length;

  // ══ Resultado Proyectado (escenario completo) ══
  const resultadoProyectado =
    (ingresosBrutos + cobrosComprometidos + pipelineIngresos) -
    (gastosComprometidos + gastosPrevistos);

  const cobrosVencidosFromTable = allCobros.filter(c =>
    c.status === 'vencido' || (c.status === 'pendiente' && c.expected_date && c.expected_date < format(new Date(), 'yyyy-MM-dd'))
  ).length;
  const eventosVencidos = allBookings.filter(b =>
    (b.cobro_estado === 'pendiente' || (!b.cobro_estado && b.phase === 'realizado')) &&
    b.fecha && new Date(b.fecha) < subDays(new Date(), 7)
  ).length;
  const vencidosCount = Math.max(cobrosVencidosFromTable, eventosVencidos);

  // ══ KPI 5: Pagos Pendientes ══
  const unpaidItems = activeItems.filter(i => !isPaidStatus(i.billing_status) && (i.unit_price ?? 0) * (i.quantity || 1) !== 0);
  const pagosPendientes = sumItems(unpaidItems);
  const facturasPendientes = unpaidItems.length;

  // ══ KPI 5b: Pagos sin justificante (pendientes de regularizar con gestoría) ══
  const sinJustificanteItems = activeItems.filter(i => i.billing_status === 'pagado_sin_factura');
  const pagosSinJustificante = sumItems(sinJustificanteItems);
  const pagosSinJustificanteCount = sinJustificanteItems.length;

  // ══ KPI 6: IRPF ══
  const qRange = getPeriodRange('quarter');
  // From cobros
  const quarterCobros = allCobros.filter(c => c.status === 'cobrado' && c.received_date && c.received_date >= qRange.start && c.received_date <= qRange.end);
  const irpfFromCobros = quarterCobros.reduce((s, c) => s + (c.amount_gross || 0) * ((c.irpf_pct ?? 0) / 100), 0);
  // From budget items
  const quarterItems = allItems.filter(i => {
    const budget = allBudgets.find(b => b.id === i.budget_id);
    return budget?.event_date && budget.event_date >= qRange.start && budget.event_date <= qRange.end;
  });
  const irpfFromItems = quarterItems.reduce((s, i) => {
    const base = (i.unit_price ?? 0) * (i.quantity || 1);
    return s + base * ((i.irpf_percentage ?? 0) / 100);
  }, 0);
  const irpfTotal = irpfFromCobros + irpfFromItems;
  const quarterLabel = getCurrentQuarterLabel();

  // ══ Alerts ══
  const presupuestosExcedidos = activeBudgets.filter(b => {
    const capital = b.fee || 0;
    const itemsForBudget = allItems.filter(i => i.budget_id === b.id);
    const gastos = itemsForBudget.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
    return capital > 0 && capital - gastos < 0;
  }).length;

  const totalAlerts = (vencidosCount > 0 ? 1 : 0) + (presupuestosExcedidos > 0 ? 1 : 0) + (unreadNotifs.length > 0 ? 1 : 0);
  const alertCount = vencidosCount + presupuestosExcedidos + unreadNotifs.length;

  // ══ Chart Data ══
  const chartData: ChartPoint[] = (() => {
    if (period === 'month') {
      // Weekly breakdown for current month
      const start = new Date(range.start);
      const end = new Date(range.end);
      const weeks: ChartPoint[] = [];
      let weekStart = startOfWeek(start, { locale: es });
      let weekNum = 1;
      while (weekStart <= end) {
        const weekEnd = endOfWeek(weekStart, { locale: es });
        const ws = format(weekStart, 'yyyy-MM-dd');
        const we = format(weekEnd, 'yyyy-MM-dd');
        weeks.push({ month: ws, label: `Sem ${weekNum}`, ingresos: 0, gastos: 0 });
        
        // Ingresos
        periodCobros.filter(c => c.received_date! >= ws && c.received_date! <= we).forEach(c => {
          weeks[weeks.length - 1].ingresos += c.amount_gross || 0;
        });
        cobradoBookings.filter(b => !cobrosBookingIds.has(b.id) && b.cobro_fecha! >= ws && b.cobro_fecha! <= we).forEach(b => {
          weeks[weeks.length - 1].ingresos += b.fee || 0;
        });

        // Gastos
        allItems.filter(i => isPaidStatus(i.billing_status) && activeIds.has(i.budget_id)).forEach(i => {
          const budget = allBudgets.find(b => b.id === i.budget_id);
          if (budget?.event_date && budget.event_date >= ws && budget.event_date <= we) {
            weeks[weeks.length - 1].gastos += (i.unit_price ?? 0) * (i.quantity || 1);
          }
        });

        weekStart = addWeeks(weekStart, 1);
        weekNum++;
      }
      return weeks;
    }

    // Monthly breakdown
    const months: ChartPoint[] = [];
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
      const key = format(current, 'yyyy-MM');
      const label = format(current, 'MMM', { locale: es });
      months.push({ month: key, label: label.charAt(0).toUpperCase() + label.slice(1), ingresos: 0, gastos: 0 });
      current.setMonth(current.getMonth() + 1);
    }

    // Ingresos
    periodCobros.forEach(c => {
      if (!c.received_date) return;
      const key = c.received_date.substring(0, 7);
      const entry = months.find(m => m.month === key);
      if (entry) entry.ingresos += c.amount_gross || 0;
    });
    cobradoBookings.filter(b => !cobrosBookingIds.has(b.id)).forEach(b => {
      if (!b.cobro_fecha) return;
      const key = b.cobro_fecha.substring(0, 7);
      const entry = months.find(m => m.month === key);
      if (entry) entry.ingresos += b.fee || 0;
    });

    // Gastos
    allItems.filter(i => isPaidStatus(i.billing_status) && activeIds.has(i.budget_id)).forEach(i => {
      const budget = allBudgets.find(b => b.id === i.budget_id);
      if (!budget?.event_date) return;
      const key = budget.event_date.substring(0, 7);
      const entry = months.find(m => m.month === key);
      if (entry) entry.gastos += (i.unit_price ?? 0) * (i.quantity || 1);
    });

    return months;
  })();

  // Best/worst month
  const monthsWithIngresos = chartData.filter(m => m.ingresos > 0);
  const bestMonth = monthsWithIngresos.length > 0
    ? monthsWithIngresos.reduce((best, m) => m.ingresos > best.ingresos ? m : best)
    : null;
  const worstMonth = monthsWithIngresos.length > 1
    ? monthsWithIngresos.reduce((worst, m) => m.ingresos < worst.ingresos ? m : worst)
    : null;

  // ══ Revenue by source ══
  const SOURCE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
    booking: { label: 'Booking', color: 'hsl(142, 70%, 45%)', emoji: '🎤' },
    royalties: { label: 'Royalties', color: 'hsl(213, 94%, 60%)', emoji: '🎵' },
    sync: { label: 'Sincronización', color: 'hsl(260, 85%, 65%)', emoji: '🎬' },
    subvencion: { label: 'Subvención/Beca', color: 'hsl(38, 92%, 50%)', emoji: '🏛' },
    beca: { label: 'Subvención/Beca', color: 'hsl(38, 92%, 50%)', emoji: '🏛' },
    otro: { label: 'Otros', color: 'hsl(220, 10%, 60%)', emoji: '○' },
  };

  const sourceBreakdown: SourceBreakdown[] = (() => {
    const totals: Record<string, number> = {};
    periodCobros.forEach(c => {
      const type = c.type || 'otro';
      const normalized = type === 'beca' ? 'subvencion' : type;
      totals[normalized] = (totals[normalized] || 0) + (c.amount_gross || 0);
    });
    // Add booking income from booking_offers not in cobros
    if (additionalBookingIncome > 0) {
      totals['booking'] = (totals['booking'] || 0) + additionalBookingIncome;
    }

    return Object.entries(SOURCE_CONFIG)
      .filter(([key]) => key !== 'beca') // merged into subvencion
      .map(([key, cfg]) => ({
        name: key,
        label: cfg.label,
        value: totals[key] || 0,
        color: cfg.color,
        emoji: cfg.emoji,
      }));
  })();

  // ══ Top artists by revenue ══
  const topArtists: ArtistRevenueSummary[] = (() => {
    if (artistId !== 'all') return [];
    const byArtist: Record<string, { name: string; avatar: string | null; total: number }> = {};

    periodCobros.forEach(c => {
      if (!c.artist_id) return;
      const artist = c.artists as any;
      const name = artist?.stage_name || artist?.name || 'Desconocido';
      if (!byArtist[c.artist_id]) byArtist[c.artist_id] = { name, avatar: artist?.avatar_url, total: 0 };
      byArtist[c.artist_id].total += c.amount_gross || 0;
    });

    cobradoBookings.filter(b => !cobrosBookingIds.has(b.id) && b.artist_id).forEach(b => {
      const artist = b.artists as any;
      const name = artist?.stage_name || artist?.name || 'Desconocido';
      if (!byArtist[b.artist_id!]) byArtist[b.artist_id!] = { name, avatar: artist?.avatar_url, total: 0 };
      byArtist[b.artist_id!].total += b.fee || 0;
    });

    const totalAll = Object.values(byArtist).reduce((s, a) => s + a.total, 0);
    return Object.entries(byArtist)
      .map(([id, a]) => ({
        artistId: id,
        artistName: a.name,
        avatarUrl: a.avatar,
        total: a.total,
        percentage: totalAll > 0 ? (a.total / totalAll) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  })();

  // ══ Artist concept breakdown (single artist mode) ══
  const artistConceptBreakdown: SourceBreakdown[] = (() => {
    if (artistId === 'all') return [];
    const totals: Record<string, number> = {};
    periodCobros.forEach(c => {
      const type = c.type || 'otro';
      const normalized = type === 'beca' ? 'subvencion' : type;
      totals[normalized] = (totals[normalized] || 0) + (c.amount_gross || 0);
    });
    if (additionalBookingIncome > 0) {
      totals['booking'] = (totals['booking'] || 0) + additionalBookingIncome;
    }
    return Object.entries(SOURCE_CONFIG)
      .filter(([key]) => key !== 'beca')
      .map(([key, cfg]) => ({
        name: key,
        label: cfg.label,
        value: totals[key] || 0,
        color: cfg.color,
        emoji: cfg.emoji,
      }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  // Selected artist name (single artist mode)
  const selectedArtistName: string | null = (() => {
    if (artistId === 'all') return null;
    const fromCobros = (allCobros.find(c => c.artist_id === artistId)?.artists as any);
    if (fromCobros) return fromCobros.stage_name || fromCobros.name || null;
    const fromBookings = (allBookings.find(b => b.artist_id === artistId)?.artists as any);
    if (fromBookings) return fromBookings.stage_name || fromBookings.name || null;
    const fromBudgets = (allBudgets.find(b => b.artist_id === artistId)?.artists as any);
    if (fromBudgets) return fromBudgets.stage_name || fromBudgets.name || null;
    return null;
  })();

  // ══ Recent Activity ══
  const recentActivity: RecentEvent[] = (() => {
    const events: RecentEvent[] = [];

    // From cobros table
    allCobros
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 10)
      .forEach(c => {
        const artist = c.artists as any;
        const artistName = artist?.stage_name || artist?.name || '';
        if (c.status === 'cobrado') {
          events.push({
            id: `cobro-${c.id}`,
            icon: '💰',
            description: `Cobro registrado — ${c.concept}`,
            amount: c.amount_net ?? c.amount_gross,
            date: c.received_date || c.created_at,
            relativeDate: formatDistanceToNow(new Date(c.received_date || c.created_at), { addSuffix: true, locale: es }),
            artistName,
            link: c.booking_id ? `/booking/${c.booking_id}` : undefined,
            isExpense: false,
          });
        } else if (c.status === 'vencido' || (c.status === 'pendiente' && c.expected_date && c.expected_date < format(new Date(), 'yyyy-MM-dd'))) {
          events.push({
            id: `vencido-${c.id}`,
            icon: '⚠',
            description: `Cobro vencido — ${c.concept}`,
            amount: c.amount_gross,
            date: c.expected_date || c.created_at,
            relativeDate: formatDistanceToNow(new Date(c.expected_date || c.created_at), { addSuffix: true, locale: es }),
            artistName,
            link: c.booking_id ? `/booking/${c.booking_id}` : undefined,
            isExpense: false,
          });
        }
      });

    // Paid budget items
    allItems
      .filter(i => isPaidStatus(i.billing_status))
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      .slice(0, 5)
      .forEach(i => {
        const budget = allBudgets.find(b => b.id === i.budget_id);
        const artist = (budget?.artists as any)?.stage_name || (budget?.artists as any)?.name || '';
        events.push({
          id: `item-${i.id}`,
          icon: '📋',
          description: `Factura liquidada — ${i.name}`,
          amount: (i.unit_price ?? 0) * (i.quantity || 1),
          date: i.updated_at || '',
          relativeDate: i.updated_at ? formatDistanceToNow(new Date(i.updated_at), { addSuffix: true, locale: es }) : '',
          artistName: artist,
          link: budget ? `/budgets/${budget.id}` : undefined,
          isExpense: true,
        });
      });

    // Exceeded budget alerts
    activeBudgets.forEach(b => {
      const capital = b.fee || 0;
      if (capital <= 0) return;
      const itemsForBudget = allItems.filter(i => i.budget_id === b.id);
      const gastos = itemsForBudget.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
      if (capital - gastos < 0) {
        const artist = (b.artists as any)?.stage_name || (b.artists as any)?.name || '';
        events.push({
          id: `exceeded-${b.id}`,
          icon: '⚠',
          description: `Presupuesto excedido — ${b.name}`,
          amount: gastos - capital,
          date: b.event_date || '',
          relativeDate: b.event_date ? formatDistanceToNow(new Date(b.event_date), { addSuffix: true, locale: es }) : '',
          artistName: artist,
          link: `/budgets/${b.id}`,
          isExpense: true,
        });
      }
    });

    return events.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 15);
  })();

  // ══ Empty state check ══
  const isEmpty = allCobros.length === 0 && allItems.length === 0 && cobradoBookings.length === 0;

  return {
    loading,
    isEmpty,
    // KPI 1
    ingresosBrutos, cobrosCount, ingresosTrend,
    // KPI 2
    gastosComprometidos, gastosConfirmados, gastosProvisionales, gastosPrevistos,
    // KPI 3
    beneficioNeto, resultadoContable, resultadoProyectado, margenPct,
    // KPI 4 — comprometido + pipeline
    cobrosPendientes, cobrosComprometidos, eventosSinCobrar, vencidosCount,
    pipelineIngresos, pipelineCount,
    // KPI 5
    pagosPendientes, facturasPendientes,
    // KPI 6
    irpfTotal, quarterLabel,
    // Alerts
    totalAlerts, alertCount, cobrosVencidos: vencidosCount, presupuestosExcedidos, unreadNotifCount: unreadNotifs.length,
    // Chart
    chartData, bestMonth, worstMonth,
    // Breakdowns
    sourceBreakdown, topArtists, artistConceptBreakdown, selectedArtistName,
    // Activity
    recentActivity,
  };
}
