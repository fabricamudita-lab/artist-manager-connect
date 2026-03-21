

## Show ISRC Always & Minimize Edit/Delete Buttons

### Changes

**File: `src/pages/release-sections/ReleaseCreditos.tsx`**

1. **Show ISRC in accordion trigger** (always visible, next to track title): Add `track.isrc` as a muted text span after the title, e.g. `<span className="text-xs text-muted-foreground">{track.isrc}</span>`.

2. **Minimize edit/delete buttons**: Replace the two `Button variant="outline" size="sm"` with text labels → icon-only `Button variant="ghost" size="icon"` (just `<Pencil>` and `<Trash2>` icons, no text). This makes the action row more compact and minimal.

### Technical Details

- Lines ~511-512: Add ISRC display after track title
- Lines ~550-558: Change buttons from labeled to icon-only ghost buttons

