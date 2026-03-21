

## Add "ISRC" Label and Copy-on-Click

### Changes

**File: `src/pages/release-sections/ReleaseCreditos.tsx`** — Line 513

1. Add "ISRC:" label before the code
2. Wrap the ISRC value in a clickable element that copies to clipboard using `copyToClipboard` from `exportUtils` and shows a toast

Current:
```tsx
{track.isrc && <span className="text-xs text-muted-foreground ml-2">{track.isrc}</span>}
```

New:
```tsx
{track.isrc && (
  <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1">
    ISRC:
    <button onClick={(e) => { e.stopPropagation(); copyAndToast(track.isrc); }}
      className="hover:text-foreground cursor-pointer transition-colors">
      {track.isrc}
    </button>
  </span>
)}
```

- Import `copyToClipboard` and `toast`, add a small helper `copyAndToast` that copies + shows "ISRC copiado"
- `e.stopPropagation()` prevents the accordion from toggling when clicking the ISRC

