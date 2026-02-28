

## Filter out zero-amount items from Cashflow panel

### Problem
The "Comprometido" cashflow panel shows budget items with €0 transfer amount, cluttering the view with irrelevant entries (like placeholder or empty line items).

### Change

**File: `src/components/finanzas/CashflowPanel.tsx`**

After building the `cashflowItems` array (line 112), filter out any item where `transferAmount === 0` (and `baseAmount === 0`) before sorting and setting state. This ensures zero-value items are excluded from:
- The item list
- All totals (total pendiente, confirmado, provisional)
- The overdue count

Single line addition after line 112:
```typescript
.filter(item => item.transferAmount !== 0);
```

This filters at the data level so all downstream calculations (totals, grouping, counts) automatically exclude zero-amount items.
