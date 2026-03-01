import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, format } from 'date-fns';

export type PeriodFilter = 'month' | 'quarter' | 'year';

function getPeriodRange(period: PeriodFilter): { start: string; end: string } {
  const now = new Date();
  switch (period) {
    case 'month':
      return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'quarter':
      return { start: format(startOfQuarter(now), 'yyyy-MM-dd'), end: format(endOfQuarter(now), 'yyyy-MM-dd') };
    case 'year':
      return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
  }
}

function getCurrentQuarterLabel(): string {
  const q = Math.ceil((new Date().getMonth() + 1) / 3);
  return `T${q}`;
}

export function useFinanzasPanel(artistId: string, period: PeriodFilter) {
  const range = getPeriodRange(period);

  // Bookings with fee data for the period
  const bookingsQuery = useQuery({
    queryKey: ['finanzas-panel-bookings', artistId, range.start, range.end],
    queryFn: async () => {
      let q = supabase.from('booking_offers').select('id, fee, estado, estado_facturacion, fecha, phase, artist_id, festival_ciclo, ciudad, venue, artists!booking_offers_artist_id_fkey(name, stage_name)');
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data } = await q;
      return data || [];
    },
  });

  // Active budgets + their items for gastos
  const budgetsQuery = useQuery({
    queryKey: ['finanzas-panel-budgets', artistId],
    queryFn: async () => {
      let q = supabase.from('budgets').select('id, name, fee, expense_budget, metadata, budget_status, artist_id, event_date, artists!budgets_artist_id_fkey(name, stage_name)');
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data } = await q;
      return data || [];
    },
  });

  const budgetItemsQuery = useQuery({
    queryKey: ['finanzas-panel-items', artistId],
    queryFn: async () => {
      const budgetIds = (budgetsQuery.data || []).map(b => b.id);
      if (!budgetIds.length) return [];
      const { data } = await supabase
        .from('budget_items')
        .select('id, budget_id, name, unit_price, quantity, is_provisional, billing_status, iva_percentage, irpf_percentage, category')
        .in('budget_id', budgetIds);
      return data || [];
    },
    enabled: !!budgetsQuery.data?.length,
  });

  const allBookings = bookingsQuery.data || [];
  const allBudgets = budgetsQuery.data || [];
  const allItems = budgetItemsQuery.data || [];

  // Filter bookings in period
  const periodBookings = allBookings.filter(b => b.fecha && b.fecha >= range.start && b.fecha <= range.end);

  // Closed statuses for budgets
  const closedStatuses = ['cerrado', 'archivado', 'rechazado', 'cancelado'];
  const getEstado = (b: any) => {
    const meta = b.metadata as any;
    if (meta?.estado) return meta.estado;
    if (b.budget_status && !['nacional', 'internacional'].includes(b.budget_status)) return b.budget_status;
    return 'borrador';
  };
  const activeBudgets = allBudgets.filter(b => !closedStatuses.includes(getEstado(b)));

  // KPI 1: Ingresos brutos
  const cobradoBookings = periodBookings.filter(b => b.estado_facturacion === 'cobrado');
  const ingresosBrutos = cobradoBookings.reduce((s, b) => s + (b.fee || 0), 0);
  const conciertosCobrados = cobradoBookings.length;

  // KPI 2: Gastos comprometidos
  const activeIds = new Set(activeBudgets.map(b => b.id));
  const activeItems = allItems.filter(i => activeIds.has(i.budget_id) && i.billing_status !== 'pagado');
  const confirmedItems = activeItems.filter(i => !i.is_provisional);
  const provisionalItems = activeItems.filter(i => i.is_provisional);
  const sumItems = (items: typeof activeItems) => items.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
  const gastosConfirmados = sumItems(confirmedItems);
  const gastosProvisionales = sumItems(provisionalItems);
  const gastosComprometidos = gastosConfirmados + gastosProvisionales;

  // KPI 3: Beneficio neto
  const beneficioNeto = ingresosBrutos - gastosComprometidos;
  const margenPct = ingresosBrutos > 0 ? Math.round((beneficioNeto / ingresosBrutos) * 100) : 0;

  // KPI 4: Cobros pendientes (include realizado events)
  const pendienteBookings = allBookings.filter(b => 
    b.estado_facturacion === 'pendiente' || 
    (!b.estado_facturacion && (b.estado === 'confirmado' || b.estado === 'realizado')) ||
    b.phase === 'realizado'
  );
  const cobrosPendientes = pendienteBookings.reduce((s, b) => s + (b.fee || 0), 0);
  const eventosSinCobrar = pendienteBookings.length;

  // KPI 5: Pagos pendientes (unpaid items)
  const unpaidItems = activeItems.filter(i => {
    const amount = (i.unit_price ?? 0) * (i.quantity || 1);
    return amount !== 0;
  });
  const pagosPendientes = sumItems(unpaidItems);
  const facturasPendientes = unpaidItems.length;

  // KPI 6: IRPF retenciones this quarter
  const qRange = getPeriodRange('quarter');
  const quarterItems = allItems.filter(i => {
    const budget = allBudgets.find(b => b.id === i.budget_id);
    return budget?.event_date && budget.event_date >= qRange.start && budget.event_date <= qRange.end;
  });
  const irpfTotal = quarterItems.reduce((s, i) => {
    const base = (i.unit_price ?? 0) * (i.quantity || 1);
    return s + base * ((i.irpf_percentage ?? 0) / 100);
  }, 0);
  const quarterLabel = getCurrentQuarterLabel();

  // Alerts
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const cobrosVencidos = allBookings.filter(b =>
    (b.estado_facturacion === 'pendiente' || (!b.estado_facturacion && (b.estado === 'confirmado' || b.estado === 'realizado')) || b.phase === 'realizado') &&
    b.fecha && new Date(b.fecha) < sevenDaysAgo
  ).length;

  const presupuestosExcedidos = activeBudgets.filter(b => {
    const capital = b.fee || 0;
    const itemsForBudget = allItems.filter(i => i.budget_id === b.id);
    const gastos = itemsForBudget.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
    return capital - gastos < 0;
  }).length;

  const totalAlerts = cobrosVencidos + presupuestosExcedidos;

  // Chart data: monthly ingresos vs gastos for the period
  const chartData = (() => {
    const months: { month: string; label: string; ingresos: number; gastos: number }[] = [];
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
      const key = format(current, 'yyyy-MM');
      const label = format(current, 'MMM');
      months.push({ month: key, label, ingresos: 0, gastos: 0 });
      current.setMonth(current.getMonth() + 1);
    }

    // Ingresos from cobrado bookings
    cobradoBookings.forEach(b => {
      if (!b.fecha) return;
      const key = b.fecha.substring(0, 7);
      const entry = months.find(m => m.month === key);
      if (entry) entry.ingresos += b.fee || 0;
    });

    // Gastos from paid items in active budgets
    allItems.filter(i => i.billing_status === 'pagado' && activeIds.has(i.budget_id)).forEach(i => {
      const budget = allBudgets.find(b => b.id === i.budget_id);
      if (!budget?.event_date) return;
      const key = budget.event_date.substring(0, 7);
      const entry = months.find(m => m.month === key);
      if (entry) entry.gastos += (i.unit_price ?? 0) * (i.quantity || 1);
    });

    return months;
  })();

  // Recent activity
  const recentActivity = (() => {
    const events: { id: string; icon: string; description: string; amount: number; date: string; artistName: string; link?: string }[] = [];

    // Cobrado bookings
    cobradoBookings.slice(0, 5).forEach(b => {
      const name = b.festival_ciclo || b.ciudad || 'Evento';
      const artist = (b.artists as any)?.stage_name || (b.artists as any)?.name || '';
      events.push({
        id: `booking-${b.id}`,
        icon: '💰',
        description: `Caché cobrado: ${name}`,
        amount: b.fee || 0,
        date: b.fecha || '',
        artistName: artist,
        link: `/booking/${b.id}`,
      });
    });

    // Paid budget items
    allItems.filter(i => i.billing_status === 'pagado').slice(0, 5).forEach(i => {
      const budget = allBudgets.find(b => b.id === i.budget_id);
      const artist = (budget?.artists as any)?.stage_name || (budget?.artists as any)?.name || '';
      events.push({
        id: `item-${i.id}`,
        icon: '📋',
        description: `Factura pagada: ${i.name}`,
        amount: (i.unit_price ?? 0) * (i.quantity || 1),
        date: budget?.event_date || '',
        artistName: artist,
        link: budget ? `/budgets/${budget.id}` : undefined,
      });
    });

    // Exceeded budgets
    activeBudgets.forEach(b => {
      const capital = b.fee || 0;
      const itemsForBudget = allItems.filter(i => i.budget_id === b.id);
      const gastos = itemsForBudget.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity || 1), 0);
      if (capital - gastos < 0) {
        const artist = (b.artists as any)?.stage_name || (b.artists as any)?.name || '';
        events.push({
          id: `exceeded-${b.id}`,
          icon: '⚠',
          description: `Presupuesto excedido: ${b.name}`,
          amount: gastos - capital,
          date: b.event_date || '',
          artistName: artist,
          link: `/budgets/${b.id}`,
        });
      }
    });

    return events.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
  })();

  return {
    loading: bookingsQuery.isLoading || budgetsQuery.isLoading || budgetItemsQuery.isLoading,
    ingresosBrutos, conciertosCobrados,
    gastosComprometidos, gastosConfirmados, gastosProvisionales,
    beneficioNeto, margenPct,
    cobrosPendientes, eventosSinCobrar,
    pagosPendientes, facturasPendientes,
    irpfTotal, quarterLabel,
    totalAlerts, cobrosVencidos, presupuestosExcedidos,
    chartData,
    recentActivity,
  };
}
