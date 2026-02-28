

## Fix: Populate "Gastos" column with real budget_items data

### Problem
The "Gastos" column in the budgets list table reads from `budgets.expense_budget`, a static field that is rarely populated. The actual expense data lives in `budget_items` (sum of `unit_price * quantity`), which is what the budget detail page and summary cards use. This causes the column to show "—" for most budgets.

### Solution
After fetching budgets, run a secondary query to aggregate expenses from `budget_items` for all loaded budgets, then merge those totals into the budget objects. This is the same pattern already used by `BudgetSummaryCards`.

### Changes

**File: `src/pages/Budgets.tsx`**

1. After the main budgets query (around line 539), add a follow-up query:
   - Fetch `budget_id, unit_price, quantity` from `budget_items` for all fetched budget IDs
   - Group by `budget_id` and sum `unit_price * quantity` to get total expenses per budget

2. Merge the calculated totals into each budget object, replacing the static `expense_budget` field with the dynamically computed value

3. The existing rendering code (line 1061) and summary calculations (line 760) will automatically use the correct values since they already reference `budget.expense_budget`

### Technical Detail

```typescript
// After fetching budgets, compute expenses from budget_items
const budgetIds = data.map(b => b.id);
const { data: items } = await supabase
  .from('budget_items')
  .select('budget_id, unit_price, quantity')
  .in('budget_id', budgetIds);

const expenseMap = new Map<string, number>();
(items || []).forEach(item => {
  const amount = (item.unit_price ?? 0) * (item.quantity || 1);
  expenseMap.set(item.budget_id, (expenseMap.get(item.budget_id) ?? 0) + amount);
});

// Merge into budget objects
const enrichedBudgets = data.map(b => ({
  ...b,
  expense_budget: expenseMap.get(b.id) ?? b.expense_budget ?? 0
}));
```

This ensures every budget row shows its real calculated expenses without modifying any database schema or other components.
