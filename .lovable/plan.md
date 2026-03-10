

## Add "Presupuestos" as a top-level tab in Finanzas Hub

### Problem
Presupuestos is buried inside "Pagos" as a sub-view toggle, making it hard to find. It deserves its own top-level tab given its importance.

### Changes

**File: `src/pages/FinanzasHub.tsx`**
1. Add a new tab entry `{ value: 'presupuestos', label: 'Presupuestos', icon: Calculator, path: '/finanzas/presupuestos' }` to the `TABS` array (use `Receipt` or `FileSpreadsheet` for the icon to avoid duplicating `Calculator`)
2. Add the rendering case: render `<Budgets embedded artistId={...} />` when `activeTab === 'presupuestos'`
3. Import `Budgets` from `@/pages/Budgets`

**File: `src/components/finanzas/PagosTab.tsx`**
4. Remove the "Presupuestos" sub-view toggle and `BudgetsEmbedded` wrapper — PagosTab becomes just the Cashflow view

**File: `src/App.tsx` (or router config)**
5. Add route `/finanzas/presupuestos` pointing to `FinanzasHub` (same pattern as other finanzas sub-routes)

### Result
Tab bar: **Panel | Cobros | Pagos | Presupuestos | Liquidaciones | Fiscal**

Presupuestos gets direct one-click access with all its KPIs, filters, and inline editing. Pagos simplifies to just the Cashflow timeline.

