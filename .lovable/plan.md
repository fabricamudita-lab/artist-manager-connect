

## Fix: Budget auto-population with smart crew categorization

### Problem
When creating a budget from the booking detail (via "Crear Carpeta"), the budget appears empty or with all members dumped into the "Musicos" category. The sophisticated logic that properly categorizes crew members (Artista Principal, Management/Comisiones, Musicos, Equipo tecnico) only exists in `CreateBudgetDialog.tsx` but was never ported to the two other places where budgets are created from bookings.

### Root Cause
There are **3 places** that create budgets from booking data:
1. `CreateBudgetDialog.tsx` -- has the full `loadCrewFromFormat()` with smart categorization (works correctly)
2. `BookingDriveTab.tsx` -- simplified logic, puts everything in "Musicos" category, no artist detection, no commission handling
3. `FileExplorer.tsx` -- same simplified logic as above

The simplified logic in #2 and #3 is missing:
- Artist detection (member_id === artist_id -> "Artista Principal" category)
- Commission detection (is_percentage -> "Management" category)  
- Workspace member role detection (manager/booker roles -> "Management")
- Contact category detection (tecnico -> "Equipo tecnico")
- `budget_categories` table integration (category_id assignment)
- Mirror contact creation for artist and workspace members
- `is_commission_percentage` and `commission_percentage` fields
- `billing_status` field

### Solution

#### 1. Extract shared utility: `src/utils/budgetCrewLoader.ts`

Extract the `loadCrewFromFormat` logic from `CreateBudgetDialog.tsx` into a standalone async function that can be reused. It will:
- Accept `budgetId`, `formatName`, `artistId`, `bookingFee`, `isInternational`, and `userId`
- Look up the booking_product by artist + format name
- Fetch crew members with full categorization logic
- Detect artist principal, management/commissions, and technicians
- Create/find mirror contacts
- Create budget_categories as needed
- Insert budget_items with proper `category_id`, `category`, `is_commission_percentage`, `commission_percentage`, `contact_id`, `billing_status`

#### 2. Update `BookingDriveTab.tsx`

Replace the simplified crew-loading block (lines 240-308) with a single call to the shared utility:
```
await loadCrewFromFormat({
  budgetId: newBudget.id,
  formatName: bookingData.formato,
  artistId,
  bookingFee: bookingData.fee || 0,
  isInternational,
  userId: user.id,
});
```

#### 3. Update `FileExplorer.tsx`

Replace the simplified crew-loading block (lines 699-764) with the same shared utility call.

#### 4. Update `CreateBudgetDialog.tsx`

Replace the inline `loadCrewFromFormat` method with a call to the shared utility, removing ~240 lines of duplicated code.

### Files to create/modify
| File | Change |
|------|--------|
| `src/utils/budgetCrewLoader.ts` | **New** -- shared crew loading + categorization logic |
| `src/components/booking-detail/BookingDriveTab.tsx` | Replace simplified crew block with shared utility call |
| `src/components/drive/FileExplorer.tsx` | Replace simplified crew block with shared utility call |
| `src/components/CreateBudgetDialog.tsx` | Replace inline method with shared utility call |

### What this fixes
- Budget created from booking detail will show crew properly categorized: Artista Principal, Musicos, Management (comisiones), Equipo tecnico
- Commissions (booker %, manager %) appear in their own "Management" category with percentage labels
- Artist fee appears in "Artista Principal" category
- Tour manager and crew appear in correct categories based on their contact/profile roles
- All three budget creation paths produce identical, rich results

