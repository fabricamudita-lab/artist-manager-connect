

## Independent Scroll for Left and Right Panels

### Problem
When scrolling the left panel (asset grid) to find files, the right detail panel also moves because both share the page scroll. The user wants each panel to scroll independently so the detail panel stays visible while browsing assets.

### Changes

**File: `src/pages/release-sections/ReleaseImagenVideo.tsx`**

The outer container `<div className="flex h-full">` already sets full height. Changes needed:

1. Make the left panel (`flex-1`) a scroll container with `overflow-y-auto` and remove any overflow from the outer wrapper if needed. It already has `overflow-auto`, so this should work.
2. Ensure the outer `flex` container does NOT scroll itself — add `overflow-hidden` to it so only the children scroll independently.

The right panel (`AssetDetailPanel`) already has its own `ScrollArea` with `flex-1` and `h-full`. It just needs the parent to constrain its height.

**File: `src/components/dam/AssetDetailPanel.tsx`**

The panel root is `<div className="w-[420px] border-l bg-background flex flex-col h-full">` — this is correct. The `ScrollArea` inside handles its own scrolling. No changes needed here, as long as the parent constrains height (which `h-full` on the flex layout should do).

**Summary of edits:**
- `ReleaseImagenVideo.tsx` line 202: Add `overflow-hidden` to the outer flex container to prevent page-level scroll, ensuring both panels scroll independently within their own boundaries.

