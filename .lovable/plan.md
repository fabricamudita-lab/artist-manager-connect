

## Plan: 3 Fixes — Artist form visibility, Contact form errors, Contact dialog header

### Issue 1: Artist public form not showing all enabled fields
**Problem**: The `isArtistFieldVisible` function returns `true` for all fields when `field_config` is empty (`{}`), which is correct. But when the manager sets a non-empty `field_config` (e.g. from a preset), fields that are `true` in config should show, and fields that are `false` should hide. The current logic works: `fieldConfig[field] !== false`. However, the `irpf_type`, `irpf_porcentaje`, `actividad_inicio` fields are in `FORM_FIELDS` but **missing from `ARTIST_FIELD_LABELS`** — they appear in the toggle panel but the public form doesn't call `renderInput` for them. Also, some fields like `email`, `phone`, `address` are in the "General Info" section but wrapped correctly. The real issue is that `irpf_type`, `irpf_porcentaje`, and `actividad_inicio` **are** in `ARTIST_FIELD_LABELS` but the public form doesn't render IRPF/fiscal fields that need special controls (selects, date inputs). Will add missing fields to the public form.

**Fix in `src/pages/PublicArtistForm.tsx`**:
- Add `irpf_type` field (as a simple text/select input)
- Add `irpf_porcentaje` field
- Add `actividad_inicio` field (date input)
- Add `nif` and `tipo_entidad` to the fiscal section (they're already there — verify they render)

### Issue 2: Contact public form fails on open
**Problem**: `PublicContactForm.tsx` line 94-104 queries `profiles` table with `.eq('user_id', tokenData.created_by)` as **anonymous user** to get `workspace_id` for custom fields. The `profiles` table has RLS that blocks `anon` access, causing the form to fail.

**Fix in `src/pages/PublicContactForm.tsx`**:
- Instead of querying `profiles` (RLS-blocked for anon), resolve `workspace_id` through the contact's `created_by` → join to artists table or use a different approach
- The contact has `created_by` which is a user ID. The contact itself doesn't have `workspace_id`. Best approach: load custom fields by looking up the workspace through the contact's creator via the `contacts.created_by` → check if any artist in that workspace exists, or better yet, add `workspace_id` to the contact_form_tokens query
- **Simplest fix**: The `contact_form_tokens` table has `created_by`. Query `workspace_memberships` (which likely allows anon reads or we can add a policy) or better, just query `artists` table which the contact's creator also manages — since artists DO have `workspace_id`
- **Best approach**: Query the artists table filtered by the creator to get workspace_id (artists are readable by anon via existing form token policies), OR restructure to avoid needing workspace_id at all for anon
- Actually, the simplest: use `workspace_memberships` to find workspace_id for the created_by user, and add an anon SELECT policy for that table. OR just pass workspace through a different path.
- **Cleanest fix**: The contact form token already has `created_by`. We can resolve workspace_id by querying `artists` (which has `workspace_id`) filtered by `created_by` user's profile. But this is also RLS-blocked.
- **Migration approach**: Add a `workspace_id` column to `contact_form_tokens` table, populated on token creation. Then anon can read it directly from the token without needing profile access.

### Issue 3: Contact dialog missing artist-style header
**Problem**: `ArtistInfoDialog` has a nice header (avatar, name, genre badge, form button) but `EditContactDialog` goes straight to form fields without a header section.

**Fix in `src/components/EditContactDialog.tsx`**:
- Add a header section at the top of the form panel (right side) with:
  - Contact name displayed prominently
  - Role/functions as subtitle
  - Category badge
  - Form link button inline

### Files to change

| File | Change |
|------|--------|
| `src/pages/PublicArtistForm.tsx` | Add missing IRPF fields (irpf_type, irpf_porcentaje, actividad_inicio) to the fiscal section |
| `src/pages/PublicContactForm.tsx` | Fix workspace resolution: instead of querying profiles (blocked by RLS), get workspace_id from a migration-added column on `contact_form_tokens`, or query `artists` by creator |
| `src/components/EditContactDialog.tsx` | Add header section with name, role, category badge in the form panel |
| Migration SQL | Add `workspace_id` to `contact_form_tokens` and populate from creator's profile, with anon SELECT policy |

### Migration SQL
```sql
ALTER TABLE public.contact_form_tokens 
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- Backfill from creator's profile
UPDATE public.contact_form_tokens cft
SET workspace_id = p.workspace_id
FROM public.profiles p
WHERE p.user_id = cft.created_by
  AND cft.workspace_id IS NULL;
```

Then update `PublicContactForm.tsx` to read `workspace_id` directly from the token data instead of querying profiles.

