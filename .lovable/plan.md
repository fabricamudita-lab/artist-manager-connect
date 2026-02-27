

## Analytics Module - Complete Redesign (Phase 1)

This plan covers the first implementation phase following the priority hierarchy: global filters, KPIs with variations, main revenue chart, booking pipeline, and artist/source breakdown. The remaining sections (geographic, contracts, royalties, forecasting, export) will be implemented in subsequent phases.

### Scope - Phase 1

1. **Global filter system** (period, artist, source)
2. **8 KPI cards** with period-over-period variation
3. **Revenue over time chart** (stacked bars + trend line)
4. **Artist breakdown + Source distribution** (horizontal bars + donut)
5. **Booking pipeline funnel**
6. **Event profitability table**
7. **Alert banners** (overdue payments, low conversion, inactivity)

---

### Architecture

The current analytics is a single page (`Analytics.tsx`) with one hook (`useAnalytics.ts`) and one chart component file (`AnalyticsCharts.tsx`). This will be replaced with:

```text
src/
  pages/Analytics.tsx              -- Page with filters + section layout
  hooks/useAnalyticsFilters.ts     -- Filter state (period, artist, source, etc.)
  hooks/useAnalyticsData.ts        -- Main data hook, replaces useAnalytics.ts
  components/analytics/
    AnalyticsFilters.tsx            -- Sticky filter bar
    AnalyticsAlerts.tsx             -- Warning banners
    KPICards.tsx                    -- 8 KPI cards with variation
    RevenueTimeChart.tsx            -- Stacked bar + line chart
    ArtistBreakdownChart.tsx        -- Horizontal bars by artist
    SourceDistributionChart.tsx     -- Donut chart by source
    BookingPipelineFunnel.tsx       -- Funnel visualization
    EventProfitabilityTable.tsx     -- Sortable table with margin colors
    AnalyticsEmptyState.tsx         -- Empty state component
    analyticsUtils.ts              -- Formatting, color helpers
```

### Data Sources (all existing tables, no migrations needed)

| Section | Tables queried |
|---------|---------------|
| KPIs - Revenue | `booking_offers` (fee, estado, phase), `transactions` (income/expense), `sync_offers` (sync_fee, master_fee), `platform_earnings` (amount) |
| KPIs - Activity | `booking_offers` (count, fee avg, phase conversion) |
| KPIs - Pending | `booking_offers` (estado_facturacion) |
| Revenue chart | Same as KPIs, grouped by month/quarter |
| Artist breakdown | `booking_offers` joined with `artists` |
| Source distribution | Aggregated from booking + sync + royalties |
| Pipeline | `booking_offers` grouped by `phase` |
| Profitability | `booking_offers` + `booking_expenses` |

### Technical Details

#### 1. Filter System (`useAnalyticsFilters.ts`)

A React context/hook managing filter state with URL sync:

- **Period**: enum presets + custom date range. Default: last 12 months. Computes `startDate`, `endDate`, and the equivalent "previous period" dates for variation calculation.
- **Artist**: `string[]` from `artists` table. Empty = all.
- **Source**: `'all' | 'booking' | 'sync' | 'royalties'`
- **Status**: `'all' | 'confirmed' | 'negotiation' | 'cancelled'`

Territory filter deferred to Phase 2 (requires geocoding data enrichment).

#### 2. Main Data Hook (`useAnalyticsData.ts`)

Single hook that accepts filters and returns all computed metrics. Uses `Promise.all` for parallel Supabase queries. Computes:

- Current period totals and previous period totals (for variation %)
- Monthly/quarterly bucketing
- Pipeline phase counts with values
- Per-event profitability (join booking_offers + booking_expenses)

Key formulas:
- **Gross revenue**: SUM of `fee` from confirmed/facturado bookings + `sync_fee + master_fee` from closed syncs + `amount` from platform_earnings
- **Net revenue**: Gross - SUM of booking_expenses - commissions (comision_euros)
- **Conversion rate**: COUNT(phase IN confirmado,facturado) / COUNT(all phases except cancelled)
- **Average fee**: SUM(fee) / COUNT(confirmed bookings)
- **Variation %**: `((current - previous) / previous) * 100`

#### 3. KPI Cards (`KPICards.tsx`)

8 cards in 2 rows of 4. Each card shows:
- Icon + label
- Large formatted number (e.g., "15.000 EUR")
- Variation badge: green up arrow or red down arrow with %
- Optional subtitle (e.g., "32 conciertos" under concert revenue)

Number formatting: `new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` for money, `new Intl.NumberFormat('es-ES')` for counts.

#### 4. Revenue Over Time (`RevenueTimeChart.tsx`)

Using Recharts (already installed):
- `ComposedChart` with stacked `Bar` components (booking, sync, royalties) + `Line` for total trend
- Toggle: month / quarter / year granularity
- Optional "compare with previous period" toggle showing lighter bars
- Custom tooltip with full breakdown

#### 5. Artist Breakdown (`ArtistBreakdownChart.tsx`)

Horizontal `BarChart` from Recharts:
- Data: artist name + total revenue + % of grand total
- Sorted descending
- Top 5 shown, expandable "Ver todos"
- Colors from `artist.brand_color` or a default palette

#### 6. Source Distribution (`SourceDistributionChart.tsx`)

`PieChart` with inner radius (donut):
- Segments: Conciertos, Sincronizaciones, Royalties, Otros
- Legend with EUR amounts and %
- Click on segment sets the source filter

#### 7. Booking Pipeline (`BookingPipelineFunnel.tsx`)

Custom funnel visualization using stacked horizontal bars (no extra dependency):
- Phases: interes -> oferta -> negociacion -> confirmado -> facturado
- Each bar shows: phase name, count, total EUR value
- Between bars: conversion rate percentage
- Color gradient from light to dark green

#### 8. Event Profitability (`EventProfitabilityTable.tsx`)

Sortable table using existing `Table` components:
- Columns: Evento | Fee bruto | Gastos | Comisiones | Fee neto | Margen %
- Margin color coding: green (>40%), yellow (20-40%), red (<20%)
- Data from `booking_offers` LEFT JOIN `booking_expenses` (aggregated)
- Default sort by margin descending

#### 9. Alert Banners (`AnalyticsAlerts.tsx`)

Computed from the data:
- Overdue payments: bookings with `estado_facturacion = 'pendiente'` and `fecha < today - 7 days`
- Low conversion: if current conversion rate dropped >20% vs previous period
- Inactivity: no confirmed bookings in next 60 days

#### 10. Empty States and Loading

- Skeleton loading for all sections (already have `Skeleton` component)
- Empty state with illustration + CTA when no data exists

### Files Modified

| File | Action |
|------|--------|
| `src/pages/Analytics.tsx` | **Rewrite** - new layout with filters + sections |
| `src/hooks/useAnalytics.ts` | **Rewrite** -> `useAnalyticsData.ts` (keep old for backward compat) |
| `src/components/AnalyticsCharts.tsx` | **Delete** - replaced by individual components |
| `src/hooks/useAnalyticsFilters.ts` | **New** |
| `src/components/analytics/*.tsx` | **New** - 9 new component files |

### No Database Changes Required

All data needed already exists in `booking_offers`, `booking_expenses`, `transactions`, `sync_offers`, `platform_earnings`, `artists`, and `contacts`. No migrations needed for Phase 1.

### Phase 2 (future)

- Geographic distribution (requires `pais`/`ciudad` data from booking_offers - already exists)
- Contract status analysis (from `booking_documents`)
- Payment timing analysis
- Royalties deep dive (per-song, per-platform)
- Sync analysis by type/territory
- Cost analysis by category
- Team metrics
- Revenue forecasting (3 scenarios)
- PDF export
- Comparison mode
- Monthly auto-report
