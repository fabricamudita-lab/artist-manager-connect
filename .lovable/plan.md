

## Adapt Cronograma Wizard for Singles

### Problem
When the release type is `single`, the wizard still asks irrelevant questions:
- **Step 1**: "¿Incluir videoclip?" toggle (should ask which video type directly, not a boolean)
- **Step 2**: "Número de canciones" selector (a single is always 1 song), "Singles a lanzar antes del álbum" (irrelevant), Focus Track selector (irrelevant for 1 song)

### Changes

**File: `src/components/releases/CronogramaSetupWizard.tsx`**

1. Add a new prop `releaseType?: 'single' | 'ep' | 'album'`
2. When `releaseType === 'single'`:
   - **Step 1**: Replace the boolean "¿Incluir videoclip?" toggle with a direct video type selector (none / videoclip / visualiser / videolyric) using the existing `VIDEO_TYPE_OPTIONS` — store choice in a new `singleVideoType` state
   - **Step 2**: Hide "Número de canciones" (force `numSongs = 1`), hide "Singles a lanzar antes del álbum", hide "Focus Track"
   - Step 2 becomes effectively just the track creation/linking UI if tracks exist, or can be skipped entirely
3. In `handleGenerate`, when single: set `numSongs: 1`, `numSingles: 0`, and pass the video type from step 1 into `hasVideo` + config

**File: `src/pages/release-sections/ReleaseCronograma.tsx`**

4. Pass `releaseType={release?.type}` to both `<CronogramaSetupWizard>` instances (lines ~2123 and ~2474)

### UX result
- For singles: Step 1 shows dates + physical toggle + video type picker (not a boolean). Step 2 is simplified or auto-skipped. Step 3 unchanged.
- For albums/EPs: No change — everything works as before.

