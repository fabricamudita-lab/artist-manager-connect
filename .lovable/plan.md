

## Show "Copy ISRC" Option on Click (Instead of Auto-Copy)

### Change

**File: `src/pages/release-sections/ReleaseCreditos.tsx`** — Lines 513-528

Replace the current button (which copies immediately on click) with a Popover that shows a "Copiar ISRC" option when clicking the ISRC code. The copy only happens when the user clicks that option.

**Implementation:**
- Import `Popover`, `PopoverTrigger`, `PopoverContent` from shadcn
- Import `Copy` icon from lucide-react
- Wrap the ISRC display in a Popover:
  - **Trigger**: clicking the ISRC code opens the popover
  - **Content**: a small button showing `Copy` icon + "Copiar ISRC" text
  - Clicking "Copiar ISRC" copies to clipboard, shows toast, and closes popover

```tsx
{track.isrc && (
  <Popover>
    <span className="text-xs text-muted-foreground ml-2 inline-flex items-center gap-1">
      ISRC:
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()}
          className="hover:text-foreground cursor-pointer transition-colors">
          {track.isrc}
        </button>
      </PopoverTrigger>
    </span>
    <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="sm" onClick={() => { copy & toast }}>
        <Copy className="h-3 w-3 mr-1" /> Copiar ISRC
      </Button>
    </PopoverContent>
  </Popover>
)}
```

- 1 file modified, ~15 lines changed

