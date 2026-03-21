

## Auto-link Existing Contacts to Artist on Credit Addition

### Problem
When adding a credit by selecting an existing contact (e.g., Carlos Avatar), the system saves the credit but does NOT create a `contact_artist_assignments` record linking that contact to the release's artist. This means:
- The contact won't appear in future artist-filtered searches
- Adding the same contact to another track would not recognize them as "already linked"

### Solution

**File: `src/pages/release-sections/ReleaseCreditos.tsx`** — Lines ~412-452 (createCredit mutation)

After determining the `contactId` (whether from an existing selection or newly created), and before inserting the `track_credits` row, add an upsert to `contact_artist_assignments` to ensure the contact is linked to the artist. This covers both cases:

1. **Existing contact selected** — creates the assignment if it doesn't exist
2. **New contact created** — already handled, but upsert makes it idempotent

```tsx
// After contactId is resolved, before inserting track_credits:
if (contactId && releaseArtistId) {
  await supabase
    .from('contact_artist_assignments')
    .upsert(
      { contact_id: contactId, artist_id: releaseArtistId },
      { onConflict: 'contact_id,artist_id' }
    );
}
```

This single upsert replaces the existing insert-only logic (lines 442-449) and also handles the case where an existing contact is selected. The `onConflict` ensures no duplicate assignments are created when adding the same person to multiple tracks.

### Technical Details
- The `contact_artist_assignments` table already has a unique constraint on `(contact_id, artist_id)` based on the existing code patterns
- One code change in one file, ~5 lines modified
- The existing insert block (lines 442-449) gets removed and replaced by the unified upsert after contactId resolution

