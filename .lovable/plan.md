

## Fix: Side Panel Scroll Not Working

### Problem
The `ScrollArea` component has drag-scroll enabled by default, which captures pointer events and interferes with normal scrolling in the detail panel. The panel contains interactive elements (selects, inputs, buttons) that conflict with the drag behavior.

### Fix

**File: `src/components/dam/AssetDetailPanel.tsx` (line 184)**

Disable drag-scroll on the ScrollArea:

```tsx
<ScrollArea className="flex-1" enableDragScroll={false}>
```

This single prop change will restore normal scroll behavior (mouse wheel, trackpad, touch) without the grab-scroll interference.

