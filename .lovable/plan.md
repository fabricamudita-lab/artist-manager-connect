

## Fix: "Seleccionar artistas" radio button not working

### Problem
In `AutomationCard.tsx`, the "Aplica a" radio group derives its value from `artist_ids.length === 0 ? 'all' : 'selected'`. When you click "Seleccionar artistas", the handler does nothing (only the `'all'` case is handled). Since `artist_ids` remains empty, the computed value stays `'all'` and the radio never switches, nor does the artist selector appear.

### Solution
Add a local state `forceSelectedMode` to track when the user explicitly picks "Seleccionar artistas" even before any artists are chosen. This decouples the radio UI from the data state.

### Changes

**File: `src/components/AutomationCard.tsx`**

1. Add a `const [forceSelectedMode, setForceSelectedMode] = useState(false)` state variable
2. Compute `artistMode` as: `forceSelectedMode || a.artist_ids.length > 0 ? 'selected' : 'all'`
3. In the RadioGroup `onValueChange`:
   - `'all'`: call `onFieldChange(a.key, 'artist_ids', [])` AND `setForceSelectedMode(false)`
   - `'selected'`: call `setForceSelectedMode(true)`
4. The `ArtistSelector` will now appear when the radio is set to `'selected'`, allowing the user to pick artists

This is a one-file, ~5-line fix with no impact on other components.

