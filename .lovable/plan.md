

## Plan: Fix empty credits — missing `sort_order` column

### Root cause
The `useTrackCredits` hook orders by `.order('sort_order', { ascending: true })`, but the `sort_order` column was never added to the `track_credits` table via a database migration. This causes the Supabase query to fail, returning no data — making all credits appear empty.

### Fix

**1. Database migration** — Add the missing column:
```sql
ALTER TABLE public.track_credits ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
```

That's it. One migration, no code changes needed. The query and UI already handle `sort_order` correctly — they just need the column to exist.

