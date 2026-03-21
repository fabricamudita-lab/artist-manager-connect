

## Fix: Allow Linking Credits to Roster Artists

### Problem
The "Vincular con Perfil" dialog shows roster artists, but selecting one fails because it sets `contact_id` to the artist's UUID — which violates the foreign key constraint (`track_credits_contact_id_fkey` references `contacts`, not `artists`). Per the project's own architecture notes, roster artist credits should have `contact_id = null`.

### Solution

**1. Database migration — Add `artist_id` column to `track_credits`**

```sql
ALTER TABLE public.track_credits 
  ADD COLUMN artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL;
```

This allows credits to be linked to either a contact OR a roster artist, using the appropriate column.

**2. Update `LinkCreditContactDialog.tsx`**

- When a **roster artist** is selected: set `artist_id = artist.id` and `contact_id = null`
- When a **contact** is selected: set `contact_id = contact.id` and `artist_id = null`
- Update `isLinked` check to: `!!credit.contact_id || !!credit.artist_id`
- Update `unlinkContact` to clear both fields

**3. Update `useReleases.ts` (TrackCredit type)**

- Add `artist_id` to the `TrackCredit` interface and the query that fetches credits, so the linked state is correctly detected.

### Key Behavior
- Any profile can be linked regardless of name match — the manual link takes priority
- No confirmation dialog needed (the user explicitly chose the profile)
- Names don't need to match; the link is the source of truth

