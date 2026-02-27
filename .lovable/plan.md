

## Fix: Subtask display misalignment

### Problem
The `SortableSubtaskRow` component (line 230) injects an extra `<td>` element for the drag handle. This creates 7 columns in subtask rows while the table header has only 6, causing all subtask content to shift right and display incorrectly.

### Solution
Remove the extra `<td>` from `SortableSubtaskRow` and instead position the drag handle as an absolutely-positioned element directly inside the `<TableRow>`, without adding a new table cell.

### Technical Changes

**File: `src/pages/release-sections/ReleaseCronograma.tsx`**

1. **Fix `SortableSubtaskRow` (lines 230-263)**: Remove the `<td>` wrapper for the drag handle. Instead, render the drag handle button as a direct child of `<TableRow>` with absolute positioning. The `<TableRow>` already has `position: relative` from the inline style, so the handle can be positioned with `absolute left-1 top-1/2 -translate-y-1/2`.

Updated component:
```tsx
function SortableSubtaskRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <TableRow ref={setNodeRef} style={style} className="group/subtask-drag">
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/subtask-drag:opacity-100 cursor-grab active:cursor-grabbing z-10 p-0.5 rounded hover:bg-muted"
        aria-label="Arrastrar subtarea"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </button>
      {children}
    </TableRow>
  );
}
```

This removes the rogue `<td>` so subtask rows have the correct 6 columns matching the table header.

### Files modified
| File | Change |
|---|---|
| `src/pages/release-sections/ReleaseCronograma.tsx` | Remove extra `<td>` from `SortableSubtaskRow`, keep drag handle as absolutely positioned button inside `<TableRow>` |

