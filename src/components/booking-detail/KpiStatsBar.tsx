import { useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MetricKey = 'totalOfertas' | 'confirmados' | 'negociacion' | 'feeTotalConf' | 'internacionales' | 'next30' | 'cobrosPendientes' | 'conversion' | 'feeMedia' | 'realizados';

interface BookingOffer {
  phase?: string | null;
  fee?: number | null;
  fecha?: string | null;
  es_internacional?: boolean | null;
  [key: string]: any;
}

interface KpiMetricDef {
  label: string;
  calc: (offers: BookingOffer[]) => string | number;
  borderClass: string;
  bgClass: string;
  textClass: string;
}

const KPI_METRICS: Record<MetricKey, KpiMetricDef> = {
  totalOfertas: {
    label: 'Total Ofertas',
    calc: (offers) => offers.length,
    borderClass: 'border-border',
    bgClass: 'bg-muted/50',
    textClass: 'text-foreground',
  },
  confirmados: {
    label: 'Confirmados',
    calc: (offers) => offers.filter(o => o.phase === 'confirmado').length,
    borderClass: 'border-green-500/20',
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-600',
  },
  negociacion: {
    label: 'En Negociación',
    calc: (offers) => offers.filter(o => o.phase === 'negociacion').length,
    borderClass: 'border-amber-500/20',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600',
  },
  feeTotalConf: {
    label: 'Fee Total Confirmados',
    calc: (offers) => {
      const sum = offers
        .filter(o => o.phase === 'confirmado' || o.phase === 'facturado')
        .reduce((s, o) => s + (o.fee || 0), 0);
      return sum.toLocaleString() + '€';
    },
    borderClass: 'border-blue-500/20',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600',
  },
  internacionales: {
    label: 'Internacionales',
    calc: (offers) => offers.filter(o => o.es_internacional).length,
    borderClass: 'border-purple-500/20',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600',
  },
  next30: {
    label: 'Próximos 30 días',
    calc: (offers) => {
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return offers.filter(o => {
        if (o.phase !== 'confirmado') return false;
        if (!o.fecha) return false;
        const d = new Date(o.fecha);
        return d >= now && d <= in30;
      }).length;
    },
    borderClass: 'border-teal-500/20',
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-600',
  },
  cobrosPendientes: {
    label: 'Cobros Pendientes',
    calc: (offers) => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return offers.filter(o => {
        if (o.phase !== 'realizado') return false;
        if (!o.fecha) return false;
        return new Date(o.fecha) < sevenDaysAgo;
      }).length;
    },
    borderClass: 'border-teal-500/20',
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-600',
  },
  conversion: {
    label: 'Tasa de Conversión',
    calc: (offers) => {
      const total = offers.length;
      if (total === 0) return '0%';
      const converted = offers.filter(o =>
        ['confirmado', 'realizado', 'facturado'].includes(o.phase || '')
      ).length;
      return Math.round((converted / total) * 100) + '%';
    },
    borderClass: 'border-teal-500/20',
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-600',
  },
  feeMedia: {
    label: 'Fee Medio',
    calc: (offers) => {
      const confirmed = offers.filter(o =>
        ['confirmado', 'realizado', 'facturado'].includes(o.phase || '') && o.fee
      );
      if (confirmed.length === 0) return '0€';
      const avg = confirmed.reduce((s, o) => s + (o.fee || 0), 0) / confirmed.length;
      return Math.round(avg).toLocaleString() + '€';
    },
    borderClass: 'border-teal-500/20',
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-600',
  },
  realizados: {
    label: 'Realizados',
    calc: (offers) => offers.filter(o => o.phase === 'realizado').length,
    borderClass: 'border-teal-500/20',
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-600',
  },
};

const ALL_METRIC_KEYS: MetricKey[] = Object.keys(KPI_METRICS) as MetricKey[];
const DEFAULT_CONFIG: MetricKey[] = ['totalOfertas', 'confirmados', 'negociacion', 'feeTotalConf', 'internacionales', 'next30'];

function loadConfig(): MetricKey[] {
  try {
    const raw = localStorage.getItem('booking_kpi_config');
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length !== 6) return DEFAULT_CONFIG;
    return parsed.map((k, i) =>
      ALL_METRIC_KEYS.includes(k as MetricKey) ? (k as MetricKey) : DEFAULT_CONFIG[i]
    );
  } catch {
    return DEFAULT_CONFIG;
  }
}

interface KpiStatsBarProps {
  filteredOffers: BookingOffer[];
}

export function KpiStatsBar({ filteredOffers }: KpiStatsBarProps) {
  const [config, setConfig] = useState<MetricKey[]>(loadConfig);

  const updateSlot = useCallback((index: number, key: MetricKey) => {
    setConfig(prev => {
      const next = [...prev];
      next[index] = key;
      localStorage.setItem('booking_kpi_config', JSON.stringify(next));
      return next;
    });
  }, []);

  const values = useMemo(() =>
    config.map(key => KPI_METRICS[key].calc(filteredOffers)),
    [config, filteredOffers]
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {config.map((key, i) => {
        const metric = KPI_METRICS[key];
        return (
          <div key={i} className={`${metric.bgClass} rounded-lg px-3 py-2 border ${metric.borderClass}`}>
            <Select value={key} onValueChange={(v: string) => updateSlot(i, v as MetricKey)}>
              <SelectTrigger className="h-5 p-0 border-0 bg-transparent text-xs text-muted-foreground shadow-none focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_METRIC_KEYS.map(mk => (
                  <SelectItem key={mk} value={mk}>{KPI_METRICS[mk].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className={`text-lg font-bold ${metric.textClass}`}>{values[i]}</p>
          </div>
        );
      })}
    </div>
  );
}
