
## Add Responsible Selector and Subtask Options to Project Checklist Tasks

### What changes

Each task row in the Project Checklist (Lista view) will get two new interactive elements:

1. **Responsible Selector** -- A button/chip to assign a responsible person using the existing `ResponsibleSelector` component (same one used in the release cronograma). This will appear inline in each task row.

2. **"+" Dropdown Menu** -- A dropdown with 4 options:
   - Subtarea completa (full subtask with its own responsible, dates, status)
   - Casilla de verificacion (simple checkbox item)
   - Nota (directed note to a team member)
   - Comentario (hilo) (threaded comment discussion)

When subtasks exist, they render below the parent task row (expandable), following the same patterns already implemented in `ReleaseCronograma.tsx`.

---

### Technical Details

**File: `src/pages/ProjectDetail.tsx`**

1. **Extend the task data model** (around line 176):
   - Add `responsible_ref?: { type: 'profile' | 'contact'; id: string; name: string } | null`
   - Add `subtasks?: Array<Subtask>` using a `Subtask` type similar to ReleaseCronograma (supports types: `full`, `checkbox`, `note`, `comment`)
   - Add `expanded?: boolean` to control subtask visibility

2. **Add helper functions** (around line 530):
   - `handleAddSubtask(taskId)` -- adds a full subtask
   - `handleAddChecklistItem(taskId)` -- adds a checkbox subtask
   - `handleAddNote(taskId)` -- adds a note subtask
   - `handleAddCommentThread(taskId)` -- adds a comment thread
   - `handleUpdateSubtask(taskId, subtaskId, updates)`
   - `handleDeleteSubtask(taskId, subtaskId)`
   - `handleToggleTaskExpand(taskId)` -- toggle subtask visibility

3. **Update the task row rendering** (lines 442-489):
   - Add expand/collapse chevron button before the status icon (only shown if task has subtasks)
   - Keep existing urgency badge, name, category, responsables chips, and due date
   - Add `ResponsibleSelector` component inline (compact mode)
   - Add `DropdownMenu` with the 4 subtask type options (using `ListTodo`, `CheckCircle2`, `StickyNote`, `MessageCircle` icons)
   - Add a delete button (trash icon)

4. **Add subtask rendering below each task row** (after line 488):
   - When `task.expanded` is true, render subtasks below the parent
   - Each subtask type has its own visual treatment (same patterns as ReleaseCronograma):
     - **Full subtask**: name input, responsible selector, status dropdown
     - **Checkbox**: circle toggle + name, with strikethrough when completed
     - **Note**: amber background, "Nota para:" with ResponsibleSelector + textarea
     - **Comment thread**: blue border, message list, input to add new messages, resolve/reopen button

5. **Add imports**:
   - Import `ResponsibleSelector` from `@/components/releases/ResponsibleSelector`
   - Ensure `ListTodo`, `StickyNote`, `MessageCircle`, `CheckCircle2`, `Circle`, `GripVertical`, `Send`, `AtSign`, `CheckCheck` icons are imported
   - Import `DropdownMenu` components
   - Import `Textarea` if not already imported
