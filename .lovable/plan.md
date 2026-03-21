

## Auto-Create Contacts from New Credits

### Problem
When adding a credit with a new name (tab "Nuevo"), the name is saved only in `track_credits` as plain text. It doesn't create a contact record, so the person never appears in Teams, can't be searched, and has no linkable profile.

### Solution
When creating a credit in "Nuevo" mode (no existing profile selected), automatically:
1. Create a new `contacts` record with the name and a category derived from the credit role
2. Link the new contact to the release's artist via `contact_artist_assignments`
3. Save the new contact's ID as `contact_id` in the `track_credits` row

### Changes

**File: `src/pages/release-sections/ReleaseCreditos.tsx`** — Expand `createCredit.mutationFn`

Before inserting into `track_credits`, check if `contact_id` is missing. If so:
1. Insert into `contacts` table with `name` and `category` mapped from the credit's role category:
   - `compositor` / `autoria` → contact category `compositor`
   - `produccion` → contact category `tecnico`
   - `interprete` → contact category `banda`
   - `contribuidor` → contact category `artistico`
2. Insert into `contact_artist_assignments` linking the new contact to `releaseArtistId`
3. Use the new contact's ID as `contact_id` in the `track_credits` insert

**File: `src/components/credits/AddCreditWithProfileForm.tsx`** — No changes needed

The form already passes `contact_id: undefined` when in "Nuevo" mode, which is the signal for the mutation to auto-create.

### Category Mapping Logic

```text
Credit Category    →  Contact Category
compositor           compositor
autoria              letrista
produccion           tecnico
interprete           banda
contribuidor         artistico
```

### Summary
- 1 file modified (`ReleaseCreditos.tsx`)
- No DB migration needed (uses existing `contacts` and `contact_artist_assignments` tables)
- New credits automatically create searchable, linkable contact profiles
- Contacts are assigned to the artist, so they appear in Teams when filtering

