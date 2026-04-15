

## Plan: Fix dialog scroll overflow in Edit Track dialog

### Problem
The "Editar Canción" dialog (`DialogContent` at line 513) has no max-height or scroll constraints. When a track has many fields (ISRC, Copyright, Letra, Artistas para Distribución, etc.), the dialog overflows the viewport and users cannot scroll to see the top or bottom.

### Solution
Add `max-h-[85vh] overflow-hidden` to the `DialogContent` and wrap the content body in a scrollable `div` with `overflow-y-auto flex-1`.

### Changes

**`src/pages/release-sections/ReleaseCreditos.tsx`** (line 513):
- Change `DialogContent className="max-w-lg"` → `DialogContent className="max-w-lg max-h-[85vh] flex flex-col"`
- Wrap the content `div` (line 518) with `overflow-y-auto` so the body scrolls while the header stays fixed

This is a 2-line change ensuring the dialog is always scrollable regardless of content length.

