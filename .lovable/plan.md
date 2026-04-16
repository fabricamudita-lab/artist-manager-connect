

## Plan: Fix public form links to use published URL

### Problem
The "Formulario" button in `ArtistInfoDialog.tsx` generates the share link using `window.location.origin`, which in the dev/preview environment resolves to the Lovable preview URL. That URL requires Lovable authentication, defeating the purpose of the public form.

### Fix
In `src/components/ArtistInfoDialog.tsx` (line 249), replace `window.location.origin` with the published app URL `https://artist-manager-connect.lovable.app`.

This same pattern should be checked in any other place that generates public share links (e.g., `usePublicFileSharing.ts` line 36, and any release/sync form link generators).

### Files to change

| File | Change |
|------|--------|
| `src/components/ArtistInfoDialog.tsx` | Line 249: use `https://artist-manager-connect.lovable.app` instead of `window.location.origin` |
| `src/hooks/usePublicFileSharing.ts` | Line 36: same fix for public file share URLs |
| Any other public link generators | Same pattern |

### Consideration
Hardcoding the published URL is simple and reliable. An alternative is an env variable (`VITE_PUBLIC_URL`), but the published URL is stable and already known.

