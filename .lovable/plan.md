

## Plan: Fix "Enlace no válido" on Public Artist Form

### Root Cause
The public artist form (`/artist-form/:token`) runs without authentication (anon role). It successfully reads from `artist_form_tokens` (step 1), but then fails when trying to SELECT from `artists` (step 2, line 89-93) because the existing RLS SELECT policies on `artists` require either an authenticated user or a shared release context.

The "Public can view artists for shared releases" policy exists for `anon` but checks for shared release conditions, not artist form tokens.

### Fix: Add RLS Policy

Create a new SELECT policy on `artists` for the `anon` role that allows reading an artist row when a valid, active, non-expired `artist_form_tokens` entry exists for that artist.

```sql
CREATE POLICY "Public can view artists with valid form token"
ON public.artists
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.artist_form_tokens
    WHERE artist_form_tokens.artist_id = artists.id
      AND artist_form_tokens.is_active = true
      AND (artist_form_tokens.expires_at IS NULL OR artist_form_tokens.expires_at > now())
  )
);
```

### Files

| File | Change |
|------|--------|
| Database migration | Add the RLS policy above |

No code changes needed. The form logic is correct; it just can't read the artist due to missing RLS access.

