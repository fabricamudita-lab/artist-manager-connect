import { useState, useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth, subMonths, subDays, startOfYear, endOfYear, subYears } from 'date-fns';

export type PeriodPreset = '30d' | '3m' | '6m' | '12m' | 'ytd' | 'prev_year' | 'custom';
export type SourceFilter = 'all' | 'booking' | 'sync' | 'royalties';
export type StatusFilter = 'all' | 'confirmed' | 'negotiation' | 'cancelled';

export interface AnalyticsFilters {
  period: PeriodPreset;
  customStart?: Date;
  customEnd?: Date;
  artistIds: string[];
  source: SourceFilter;
  status: StatusFilter;
}

export interface DateRange {
  start: Date;
  end: Date;
}

function computeDateRange(period: PeriodPreset, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date();
  switch (period) {
    case '30d':
      return { start: subDays(now, 30), end: now };
    case '3m':
      return { start: startOfMonth(subMonths(now, 2)), end: now };
    case '6m':
      return { start: startOfMonth(subMonths(now, 5)), end: now };
    case '12m':
      return { start: startOfMonth(subMonths(now, 11)), end: now };
    case 'ytd':
      return { start: startOfYear(now), end: now };
    case 'prev_year': {
      const prev = subYears(now, 1);
      return { start: startOfYear(prev), end: endOfYear(prev) };
    }
    case 'custom':
      return {
        start: customStart || subMonths(now, 11),
        end: customEnd || now,
      };
    default:
      return { start: startOfMonth(subMonths(now, 11)), end: now };
  }
}

function computePreviousRange(range: DateRange): DateRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - durationMs),
    end: new Date(range.start.getTime() - 1),
  };
}

export function useAnalyticsFilters() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: '12m',
    artistIds: [],
    source: 'all',
    status: 'all',
  });

  const dateRange = useMemo(
    () => computeDateRange(filters.period, filters.customStart, filters.customEnd),
    [filters.period, filters.customStart, filters.customEnd]
  );

  const previousRange = useMemo(() => computePreviousRange(dateRange), [dateRange]);

  const setPeriod = useCallback((period: PeriodPreset) => {
    setFilters(f => ({ ...f, period, customStart: undefined, customEnd: undefined }));
  }, []);

  const setCustomRange = useCallback((start: Date, end: Date) => {
    setFilters(f => ({ ...f, period: 'custom' as PeriodPreset, customStart: start, customEnd: end }));
  }, []);

  const setArtistIds = useCallback((ids: string[]) => {
    setFilters(f => ({ ...f, artistIds: ids }));
  }, []);

  const setSource = useCallback((source: SourceFilter) => {
    setFilters(f => ({ ...f, source }));
  }, []);

  const setStatus = useCallback((status: StatusFilter) => {
    setFilters(f => ({ ...f, status }));
  }, []);

  return {
    filters,
    dateRange,
    previousRange,
    setPeriod,
    setCustomRange,
    setArtistIds,
    setSource,
    setStatus,
  };
}
