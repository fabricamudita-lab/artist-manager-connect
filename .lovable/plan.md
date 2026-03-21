

## Reorganize Credits Display by Category (Distributor-Style)

### Problem
Currently, track credits are shown as a flat drag-and-drop list. The distributor UI organizes credits into distinct category sections (Composer, Performer, Production/Engineer, Songwriter), each with inline name + role fields and an "Add more" button. This makes it faster to see what's filled and what's missing.

### Approach
Modify the `CreditsSection` component in `src/pages/release-sections/ReleaseCreditos.tsx` to group existing credits by their 5 categories and display them in labeled sections, similar to the distributor screenshots.

### Changes

**File: `src/pages/release-sections/ReleaseCreditos.tsx`** — Refactor `CreditsSection`

1. **Group credits by category**: Use `getRoleCategory5()` to bucket credits into Compositor, Autoría, Producción, Intérprete, Contribuidor sections.

2. **Render each category as a labeled block**: Each section shows a category header (colored like the existing `CreditCategoryMeta`) followed by its credits. Credits within each category show: name on the left, role badge on the right (matching the distributor layout of "Name | Role dropdown").

3. **Per-category "Add" button**: Each category section gets a small inline "+" button that opens the existing `AddCreditWithProfileForm` dialog but pre-filters the `GroupedRoleSelect` to only show roles from that category. This is faster than selecting from the full list.

4. **Keep existing features intact**: Drag-and-drop reordering, percentage badges, edit inline, link-to-contact, copy credits button, and percentage validation warnings all remain unchanged. The only visual change is grouping the flat list into category buckets.

5. **Empty category prompt**: Categories with no credits show a subtle "Sin compositor registrado" placeholder to make it clear what's missing (matching the distributor's requirement of "at least one name for each category").

**File: `src/components/credits/AddCreditWithProfileForm.tsx`** — Add optional `filterCategory` prop

- Accept an optional `filterCategory?: CreditCategory` prop
- When set, pass `filterType` logic to `GroupedRoleSelect` to only show roles from that specific category (e.g., only Compositor roles, only Intérprete roles)
- This enables the per-category quick-add flow

**File: `src/components/credits/GroupedRoleSelect.tsx`** — Support single-category filtering

- Extend `filterType` to also accept a specific `CreditCategory` value (e.g., `'interprete'`), not just `'publishing'`/`'master'`
- When a single category is passed, filter `ROLES_BY_CATEGORY` to just that one category group

### Technical Details

```text
Before (flat list):
┌─────────────────────────────┐
│ Credits & Authorship        │
│ ┌ Klaus — Compositor ─────┐ │
│ ┌ Klaus — Trumpet ────────┐ │
│ ┌ Carlos — Sound Eng ─────┐ │
│ ┌ Klaus — Author ─────────┐ │
│ [+ Añadir Crédito]          │
└─────────────────────────────┘

After (grouped by category):
┌─────────────────────────────┐
│ Compositor                  │
│   Klaus Stroink       [+]   │
│ Autoría                     │
│   Klaus — Author      [+]   │
│ Producción / Ingeniería     │
│   Carlos — Sound Eng  [+]   │
│ Intérprete                  │
│   Klaus — Trumpet     [+]   │
│ Contribuidor                │
│   (vacío)             [+]   │
│                             │
│ [+ Añadir Crédito] (global) │
└─────────────────────────────┘
```

### Summary
- 3 files modified
- No DB changes
- Credits grouped visually by category with per-category quick-add
- All existing functionality preserved

