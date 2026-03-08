

## Add "Eliminar cronograma" option

### Approach
Add a discreet "Eliminar cronograma" option inside a dropdown menu (three-dot `MoreHorizontal` icon) placed near the existing action buttons in the header toolbar. This keeps it accessible but not prominent, since it's rarely used.

### Changes

**File: `src/pages/release-sections/ReleaseCronograma.tsx`**

1. Import `MoreHorizontal` from lucide-react and `DropdownMenu` components
2. Add a `DropdownMenu` after the existing toolbar buttons (or after the Undo button) with a single item: "Eliminar cronograma" (red/destructive styling)
3. On click, show a `ConfirmationDialog` (already exists in the project) with variant `destructive`, warning that all milestones will be permanently deleted
4. On confirm: delete all `release_milestones` where `release_id = id`, reset local `workflows` state to empty arrays, show success toast, and invalidate the query cache

### UX details
- The three-dot menu sits at the end of the toolbar row — unobtrusive
- Confirmation dialog: title "Eliminar cronograma", description "Se eliminarán todas las tareas y flujos del cronograma. Esta acción no se puede deshacer."
- After deletion, the empty state / wizard prompt will naturally appear (existing behavior when no milestones exist)

