

## Fix: Subtask drag not persisting new position

### Problem
When dragging a subtask bar in the Gantt chart, the confirmation dialog appears but the new position is never saved. Root cause: the drag pipeline loses track of whether the dragged item is a subtask, and `handleTaskDateUpdate` in ReleaseCronograma only searches top-level tasks -- it never finds the subtask by ID, so the update silently fails.

### Changes

**File 1: `src/components/lanzamientos/GanttChart.tsx`**

1. Add `isSubtask` and `parentTaskId` to the `pendingDrag` state type (lines 147-154). The `parentTaskId` comes from `tasksWithDates` to identify which parent task owns the subtask.

2. In `handleMouseUp` (line 351-362), when building `pendingDrag`, also store `isSubtask` from `ds.isSubtask`. Look up the dragged task in `tasksWithDates` to get `parentTaskId`.

3. In `handleConfirmDrag` (line 393-399), if the drag is a subtask, call `onUpdateTaskDate(workflowId, parentTaskId, startDate, days, subtaskId)` passing the subtask's own ID as the 5th argument. If it's a regular task, call as before.

**File 2: `src/pages/release-sections/ReleaseCronograma.tsx`**

4. Update `handleTaskDateUpdate` (line 1577-1627) to accept an optional 5th parameter `subtaskId?: string`. When `subtaskId` is provided, find the parent task by `taskId`, then update the matching subtask's `startDate` and `estimatedDays` instead of the parent task.

### Summary of data flow after fix

```text
Drag subtask bar
  -> handleBarMouseDown(subtaskId, workflowId, ..., isSubtask=true)
  -> handleMouseUp stores pendingDrag with isSubtask=true, parentTaskId from tasksWithDates
  -> User confirms in dialog
  -> handleConfirmDrag calls onUpdateTaskDate(wfId, parentTaskId, date, days, subtaskId)
  -> handleTaskDateUpdate finds parent task, updates nested subtask
```

### Files modified
| File | Change |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | Store `isSubtask` + `parentTaskId` in pendingDrag; pass `subtaskId` in handleConfirmDrag |
| `src/pages/release-sections/ReleaseCronograma.tsx` | Accept `subtaskId` param in handleTaskDateUpdate; update nested subtask when provided |
