

## Plan: Fix ISRC overlap in both PDFs

### Root cause
In `exportSplitsPDF.ts` (lines 293-307): After the track title at `y`, `y += 3`, then ISRC is drawn at `y + 4`. This places the ISRC text only 7mm below a 12pt title, and the next section header starts just 3mm after — causing visual overlap.

### Fix

**`src/utils/exportSplitsPDF.ts`** (lines 293-307):
- Change `y += 3` after title to `y += 7` (proper clearance for 12pt font)
- Draw ISRC at `y` directly instead of `y + 4`
- Increase post-ISRC spacing: `y += 6` → `y += 7`

**`src/utils/exportLabelCopyPDF.ts`** (lines 302-323):
- Verify spacing after track title (`y += 7` on line 306 looks correct, but ensure ISRC has enough gap before the sections start)
- Add `y += 2` after ISRC block to prevent overlap with COMPOSITION header

Both are 2-3 line spacing adjustments. No logic changes.

