

## Restore Full Budget List in Finanzas → Presupuestos Tab

### Problem
The "Presupuestos" tab in Finanzas currently renders `FinanzasPresupuestos` — a simplified budget list with basic search and status filter. The original `Budgets` page has much richer functionality: KPI summary cards, type/artist filtering, inline editing, duplicate detection, capital/cashflow panels, etc.

### Solution
Replace `<FinanzasPresupuestos />` with `<Budgets embedded />` in the Presupuestos tab. The `Budgets` component already supports an `embedded` prop (skips page title/header), and this pattern is already used in `PagosTab`.

Additionally, pass the selected artist filter down so it respects the global artist filter in Finanzas.

### Changes

**File: `src/pages/Finanzas.tsx`**
1. Replace import of `FinanzasPresupuestos` with import of `Budgets` from `@/pages/Budgets`
2. Replace `<FinanzasPresupuestos />` with `<Budgets embedded />`

**File: `src/pages/Budgets.tsx`** (minor)
1. Accept an optional `artistId` prop alongside `embedded` so the global Finanzas artist filter pre-selects the artist in the budget list

This is a ~10-line change total and immediately restores the full budget management experience (KPIs, type filters, duplicate detection, inline editing) inside the Finanzas hub.

