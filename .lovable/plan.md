

## Show Track Name in Publishing/Master Splits (Presupuestos)

### Problem
In the Presupuestos tab, the "Derechos de Autor" and "Royalties Master" collapsible sections all show the same generic label regardless of which track they belong to. Since each track renders its own `TrackRightsSplitsManager`, the track name should be visible.

### Fix

**File: `src/components/releases/TrackRightsSplitsManager.tsx`** (1 line change)

Update line 129 to include `track.title`:

```
// Before
{type === 'publishing' ? 'Derechos de Autor' : 'Royalties Master'}

// After  
{track.title} — {type === 'publishing' ? 'Derechos de Autor' : 'Royalties Master'}
```

This will display e.g. "Amor Constante — Derechos de Autor" and "Capullito — Royalties Master" instead of the current repeated generic labels.

### Impact
- Single line change, no new dependencies
- Affects all views that use this component (Presupuestos tab, Audio tab credits panel)

