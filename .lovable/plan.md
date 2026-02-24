

## Fix: Template cards not clickable in ScrollArea

### Problem
The custom `ScrollArea` component has drag-to-scroll enabled by default (`enableDragScroll={true}`). When you click on a template card, the ScrollArea's `pointerdown` handler captures the pointer event for drag-scrolling, which prevents the browser from firing a `click` event on the Card underneath.

### Solution
Pass `enableDragScroll={false}` to the two `ScrollArea` components in `TemplateSelectionDialog.tsx` that wrap the template lists (lines 336 and 356). This disables the drag-scroll behavior so clicks pass through normally to the Cards.

### File changed
`src/components/TemplateSelectionDialog.tsx` -- two one-line changes:
- Line 336: `<ScrollArea className="h-[400px]">` becomes `<ScrollArea className="h-[400px]" enableDragScroll={false}>`
- Line 356: same change for the user templates ScrollArea

