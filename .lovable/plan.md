

## Fix: Presupuesto tab not finding existing budgets

### Problem
The existing budget "2026.06.06 Primavera Sound" (with 8 items and real expense data) has no `booking_offer_id` and no `project_id`. The Presupuesto tab only searches by those two fields, so it never finds the real budget. Instead it shows two empty duplicates that were created from the tab.

### Root Cause
Budgets created via the Drive/folder flow (before the `booking_offer_id` column was added) are "orphan" -- they match by artist + event name/date but lack a direct foreign key link.

### Solution

**File: `src/components/booking-detail/BookingPresupuestoTab.tsx`**

Add a third search path to the query -- find budgets by artist_id that match the event name or date pattern:

```
// 3. Fuzzy match: same artist + (name contains event name OR event_date matches)
if (artistId) {
  const conditions = [];
  if (eventName) conditions.push(`name.ilike.%${eventName}%`);
  
  const { data: fuzzyBudgets } = await supabase
    .from('budgets')
    .select('id, name, fee, expense_budget, budget_status, booking_offer_id, project_id')
    .eq('artist_id', artistId)
    .or(
      [
        eventName ? `name.ilike.%${eventName}%` : null,
        eventDate ? `event_date.eq.${eventDate}` : null,
      ].filter(Boolean).join(',')
    );
  // Add to combined, deduplicated
}
```

These fuzzy-matched budgets will appear in the "unlinked" section with a "Vincular" button, allowing the user to link them with one click. Once linked, they move to the main "linked" section showing KPIs and category breakdown.

This also handles the two empty duplicate budgets -- since they ARE linked (booking_offer_id matches), they show as "linked". The real budget with items will appear below as linkable.

### Additional cleanup
- Also add a note about the 2 empty duplicate budgets in the unlinked section -- the user can delete them from the full budget view. (No code change needed for this, it's just data.)

### Files to modify
| File | Change |
|------|--------|
| `src/components/booking-detail/BookingPresupuestoTab.tsx` | Add fuzzy artist+name/date search as third lookup path |

