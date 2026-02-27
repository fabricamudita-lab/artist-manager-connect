import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, startOfQuarter, startOfYear, eachMonthOfInterval, eachQuarterOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange, AnalyticsFilters } from './useAnalyticsFilters';
import { PIPELINE_PHASES } from '@/components/analytics/analyticsUtils';

export interface KPIData {
  grossRevenue: number;
  netRevenue: number;
  bookingRevenue: number;
  bookingCount: number;
  syncRoyaltiesRevenue: number;
  totalEvents: number;
  avgFee: number;
  conversionRate: number;
  pendingPayments: number;
  pendingPaymentCount: number;
  hasOverdue: boolean;
}

export interface TimeSeriesPoint {
  label: string;
  booking: number;
  sync: number;
  royalties: number;
  total: number;
}

export interface ArtistRevenue {
  artistId: string;
  artistName: string;
  brandColor: string | null;
  revenue: number;
  percentage: number;
}

export interface PipelineStage {
  phase: string;
  label: string;
  count: number;
  value: number;
  conversionFromPrevious: number | null;
}

export interface EventProfit {
  id: string;
  name: string;
  fecha: string | null;
  feeBruto: number;
  gastos: number;
  comisiones: number;
  feeNeto: number;
  margin: number;
}

export interface AlertData {
  overduePayments: { name: string; days: number; amount: number }[];
  lowConversion: boolean;
  conversionDrop: number;
  inactivityRisk: boolean;
  daysUntilNext: number | null;
}

async function fetchPeriodData(range: DateRange, filters: AnalyticsFilters) {
  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();

  // Build booking query with filters
  let bookingQuery = supabase
    .from('booking_offers')
    .select('id, artist_id, fee, comision_euros, estado, estado_facturacion, phase, fecha, festival_ciclo, ciudad, venue, lugar, formato, promotor, created_at')
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  if (filters.artistIds.length > 0) {
    bookingQuery = bookingQuery.in('artist_id', filters.artistIds);
  }

  let syncQuery = supabase
    .from('sync_offers')
    .select('id, artist_id, sync_fee, master_fee, publishing_fee, phase, created_at')
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  if (filters.artistIds.length > 0) {
    syncQuery = syncQuery.in('artist_id', filters.artistIds);
  }

  let earningsQuery = supabase
    .from('platform_earnings')
    .select('id, amount, platform, period_end, song_id')
    .gte('period_end', startISO)
    .lte('period_end', endISO);

  const [bookingsRes, syncRes, earningsRes] = await Promise.all([
    bookingQuery,
    syncQuery,
    earningsQuery,
  ]);

  const bookings = bookingsRes.data || [];
  const syncs = syncRes.data || [];
  const earnings = earningsRes.data || [];

  // Fetch expenses for bookings with fees
  const bookingIds = bookings.map(b => b.id);
  let expenses: { booking_id: string; amount: number; category: string | null }[] = [];
  if (bookingIds.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < bookingIds.length; i += batchSize) {
      const batch = bookingIds.slice(i, i + batchSize);
      const { data } = await supabase
        .from('booking_expenses')
        .select('booking_id, amount, category')
        .in('booking_id', batch);
      if (data) expenses = expenses.concat(data);
    }
  }

  return { bookings, syncs, earnings, expenses };
}

function computeKPIs(
  bookings: any[],
  syncs: any[],
  earnings: any[],
  expenses: any[],
  filters: AnalyticsFilters
): KPIData {
  const confirmedPhases = ['confirmado', 'facturado'];
  const confirmed = bookings.filter(b => confirmedPhases.includes(b.phase));

  const bookingRevenue = confirmed.reduce((s, b) => s + (Number(b.fee) || 0), 0);
  const commissions = confirmed.reduce((s, b) => s + (Number(b.comision_euros) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const closedSyncPhases = ['cerrada', 'firmada', 'cobrada'];
  const closedSyncs = syncs.filter(s => closedSyncPhases.includes(s.phase));
  const syncRevenue = closedSyncs.reduce((s, o) => s + (Number(o.sync_fee) || 0) + (Number(o.master_fee) || 0), 0);
  const royaltiesRevenue = earnings.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const grossRevenue = (filters.source === 'all' || filters.source === 'booking' ? bookingRevenue : 0) +
    (filters.source === 'all' || filters.source === 'sync' ? syncRevenue : 0) +
    (filters.source === 'all' || filters.source === 'royalties' ? royaltiesRevenue : 0);

  const netRevenue = grossRevenue - commissions - totalExpenses;

  const avgFee = confirmed.length > 0 ? bookingRevenue / confirmed.length : 0;

  const pipelineTotal = bookings.filter(b => b.phase !== 'cancelado').length;
  const convertedCount = confirmed.length;
  const conversionRate = pipelineTotal > 0 ? (convertedCount / pipelineTotal) * 100 : 0;

  const pendingBookings = bookings.filter(b => 
    confirmedPhases.includes(b.phase) && 
    (!b.estado_facturacion || b.estado_facturacion === 'pendiente' || b.estado_facturacion === 'parcial')
  );
  const pendingPayments = pendingBookings.reduce((s, b) => s + (Number(b.fee) || 0), 0);
  const today = new Date();
  const hasOverdue = pendingBookings.some(b => b.fecha && new Date(b.fecha) < today);

  return {
    grossRevenue,
    netRevenue,
    bookingRevenue,
    bookingCount: confirmed.length,
    syncRoyaltiesRevenue: syncRevenue + royaltiesRevenue,
    totalEvents: confirmed.length,
    avgFee,
    conversionRate,
    pendingPayments,
    pendingPaymentCount: pendingBookings.length,
    hasOverdue,
  };
}

function computeTimeSeries(
  bookings: any[],
  syncs: any[],
  earnings: any[],
  range: DateRange,
  granularity: 'month' | 'quarter' | 'year'
): TimeSeriesPoint[] {
  const confirmedPhases = ['confirmado', 'facturado'];
  const closedSyncPhases = ['cerrada', 'firmada', 'cobrada'];

  let intervals: Date[];
  let getKey: (d: Date) => string;
  let getBucket: (d: Date) => string;

  if (granularity === 'month') {
    intervals = eachMonthOfInterval({ start: range.start, end: range.end });
    getKey = (d) => format(d, 'yyyy-MM');
    getBucket = getKey;
  } else if (granularity === 'quarter') {
    intervals = eachQuarterOfInterval({ start: range.start, end: range.end });
    getKey = (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    getBucket = getKey;
  } else {
    const years: Date[] = [];
    for (let y = range.start.getFullYear(); y <= range.end.getFullYear(); y++) {
      years.push(new Date(y, 0, 1));
    }
    intervals = years;
    getKey = (d) => `${d.getFullYear()}`;
    getBucket = getKey;
  }

  const buckets = new Map<string, TimeSeriesPoint>();
  intervals.forEach(d => {
    const key = getKey(d);
    const label = granularity === 'month'
      ? format(d, 'MMM yy', { locale: es })
      : granularity === 'quarter'
        ? getKey(d)
        : `${d.getFullYear()}`;
    buckets.set(key, { label, booking: 0, sync: 0, royalties: 0, total: 0 });
  });

  bookings.filter(b => confirmedPhases.includes(b.phase) && b.fecha).forEach(b => {
    const key = getBucket(new Date(b.fecha));
    const bucket = buckets.get(key);
    if (bucket) bucket.booking += Number(b.fee) || 0;
  });

  syncs.filter(s => closedSyncPhases.includes(s.phase)).forEach(s => {
    const key = getBucket(new Date(s.created_at));
    const bucket = buckets.get(key);
    if (bucket) bucket.sync += (Number(s.sync_fee) || 0) + (Number(s.master_fee) || 0);
  });

  earnings.forEach(e => {
    const key = getBucket(new Date(e.period_end));
    const bucket = buckets.get(key);
    if (bucket) bucket.royalties += Number(e.amount) || 0;
  });

  const result = Array.from(buckets.values());
  result.forEach(r => { r.total = r.booking + r.sync + r.royalties; });
  return result;
}

function computeArtistBreakdown(bookings: any[], artists: any[]): ArtistRevenue[] {
  const confirmedPhases = ['confirmado', 'facturado'];
  const artistMap = new Map<string, number>();
  bookings.filter(b => confirmedPhases.includes(b.phase) && b.artist_id).forEach(b => {
    artistMap.set(b.artist_id, (artistMap.get(b.artist_id) || 0) + (Number(b.fee) || 0));
  });

  const grandTotal = Array.from(artistMap.values()).reduce((a, b) => a + b, 0);
  const artistLookup = new Map(artists.map((a: any) => [a.id, a]));

  return Array.from(artistMap.entries())
    .map(([id, revenue]) => {
      const artist = artistLookup.get(id);
      return {
        artistId: id,
        artistName: artist?.name || 'Desconocido',
        brandColor: artist?.brand_color || null,
        revenue,
        percentage: grandTotal > 0 ? (revenue / grandTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function computePipeline(bookings: any[]): PipelineStage[] {
  const phaseCounts = new Map<string, { count: number; value: number }>();
  PIPELINE_PHASES.forEach(p => phaseCounts.set(p, { count: 0, value: 0 }));

  bookings.forEach(b => {
    const entry = phaseCounts.get(b.phase);
    if (entry) {
      entry.count++;
      entry.value += Number(b.fee) || 0;
    }
  });

  const labels: Record<string, string> = {
    interes: 'Interés', oferta: 'Oferta', negociacion: 'Negociación',
    confirmado: 'Confirmado', facturado: 'Facturado',
  };

  let prev: number | null = null;
  return PIPELINE_PHASES.map(phase => {
    const entry = phaseCounts.get(phase)!;
    const conversionFromPrevious = prev !== null && prev > 0 ? (entry.count / prev) * 100 : null;
    prev = entry.count;
    return { phase, label: labels[phase], count: entry.count, value: entry.value, conversionFromPrevious };
  });
}

function computeProfitability(bookings: any[], expenses: any[]): EventProfit[] {
  const confirmedPhases = ['confirmado', 'facturado'];
  const expenseMap = new Map<string, number>();
  expenses.forEach(e => {
    expenseMap.set(e.booking_id, (expenseMap.get(e.booking_id) || 0) + (Number(e.amount) || 0));
  });

  return bookings
    .filter(b => confirmedPhases.includes(b.phase))
    .map(b => {
      const feeBruto = Number(b.fee) || 0;
      const gastos = expenseMap.get(b.id) || 0;
      const comisiones = Number(b.comision_euros) || 0;
      const feeNeto = feeBruto - gastos - comisiones;
      const margin = feeBruto > 0 ? (feeNeto / feeBruto) * 100 : 0;
      return {
        id: b.id,
        name: b.festival_ciclo || `${b.ciudad || ''} - ${b.venue || b.lugar || ''}`.trim() || 'Sin nombre',
        fecha: b.fecha,
        feeBruto,
        gastos,
        comisiones,
        feeNeto,
        margin,
      };
    })
    .sort((a, b) => b.margin - a.margin);
}

function computeAlerts(
  bookings: any[],
  currentConversion: number,
  previousConversion: number
): AlertData {
  const today = new Date();
  const confirmedPhases = ['confirmado', 'facturado'];

  const overdue = bookings
    .filter(b => 
      confirmedPhases.includes(b.phase) &&
      b.fecha && new Date(b.fecha) < new Date(today.getTime() - 7 * 86400000) &&
      (!b.estado_facturacion || b.estado_facturacion === 'pendiente')
    )
    .map(b => ({
      name: b.festival_ciclo || b.ciudad || 'Evento',
      days: Math.floor((today.getTime() - new Date(b.fecha).getTime()) / 86400000),
      amount: Number(b.fee) || 0,
    }));

  const conversionDrop = previousConversion > 0
    ? ((currentConversion - previousConversion) / previousConversion) * 100
    : 0;

  const futureConfirmed = bookings.filter(b =>
    confirmedPhases.includes(b.phase) && b.fecha && new Date(b.fecha) > today
  );
  const nextEvent = futureConfirmed.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];
  const daysUntilNext = nextEvent ? Math.floor((new Date(nextEvent.fecha).getTime() - today.getTime()) / 86400000) : null;

  return {
    overduePayments: overdue.slice(0, 5),
    lowConversion: conversionDrop < -20,
    conversionDrop,
    inactivityRisk: daysUntilNext === null || daysUntilNext > 60,
    daysUntilNext,
  };
}

export function useAnalyticsData(
  dateRange: DateRange,
  previousRange: DateRange,
  filters: AnalyticsFilters,
  granularity: 'month' | 'quarter' | 'year' = 'month'
) {
  return useQuery({
    queryKey: ['analytics-v2', dateRange.start.toISOString(), dateRange.end.toISOString(), filters, granularity],
    queryFn: async () => {
      const [currentData, previousData, artistsRes] = await Promise.all([
        fetchPeriodData(dateRange, filters),
        fetchPeriodData(previousRange, filters),
        supabase.from('artists').select('id, name, brand_color'),
      ]);

      const artists = artistsRes.data || [];

      const currentKPIs = computeKPIs(currentData.bookings, currentData.syncs, currentData.earnings, currentData.expenses, filters);
      const previousKPIs = computeKPIs(previousData.bookings, previousData.syncs, previousData.earnings, previousData.expenses, filters);

      const timeSeries = computeTimeSeries(currentData.bookings, currentData.syncs, currentData.earnings, dateRange, granularity);
      const artistBreakdown = computeArtistBreakdown(currentData.bookings, artists);
      const pipeline = computePipeline(currentData.bookings);
      const profitability = computeProfitability(currentData.bookings, currentData.expenses);
      const alerts = computeAlerts(currentData.bookings, currentKPIs.conversionRate, previousKPIs.conversionRate);

      // Source distribution
      const bookingTotal = currentData.bookings
        .filter(b => ['confirmado', 'facturado'].includes(b.phase))
        .reduce((s, b) => s + (Number(b.fee) || 0), 0);
      const syncTotal = currentData.syncs
        .filter(s => ['cerrada', 'firmada', 'cobrada'].includes(s.phase))
        .reduce((s, o) => s + (Number(o.sync_fee) || 0) + (Number(o.master_fee) || 0), 0);
      const royaltiesTotal = currentData.earnings.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const sourceDistribution = [
        { name: 'Conciertos', value: bookingTotal, color: 'hsl(142, 70%, 45%)' },
        { name: 'Sincronizaciones', value: syncTotal, color: 'hsl(260, 85%, 65%)' },
        { name: 'Royalties', value: royaltiesTotal, color: 'hsl(213, 94%, 60%)' },
      ].filter(s => s.value > 0);

      return {
        currentKPIs,
        previousKPIs,
        timeSeries,
        artistBreakdown,
        sourceDistribution,
        pipeline,
        profitability,
        alerts,
        artists,
        isEmpty: currentData.bookings.length === 0 && currentData.syncs.length === 0 && currentData.earnings.length === 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
