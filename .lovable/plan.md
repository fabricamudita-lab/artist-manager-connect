

## Añadir botón Eliminar en modo edición con doble confirmación

### Qué cambia

Cuando un presupuesto está en modo edición inline (la fila verde con los campos editables), actualmente solo se muestran los botones **Guardar** (✓) y **Cancelar** (✗). Se añadirá un botón **Eliminar** (🗑) que requiere doble confirmación antes de borrar.

### Cómo funciona la doble confirmación

1. El usuario pulsa el icono de papelera → aparece un primer diálogo: *"¿Eliminar presupuesto?"*
2. Al confirmar, aparece un segundo diálogo más severo: *"¿Estás completamente seguro? Esta acción es irreversible."*
3. Solo al confirmar el segundo diálogo se ejecuta `handleDeleteBudget`

### Cambios técnicos

**Archivo: `src/pages/Budgets.tsx`**

- En el bloque de acciones del modo edición (líneas ~1196-1221), añadir un tercer botón de Trash2 envuelto en `PermissionWrapper` con `requiredPermission="manage"`
- Usar el componente `ConfirmationDialog` existente (ya en el proyecto) para el primer paso, y un segundo `ConfirmationDialog` con variant `destructive` para el segundo paso
- Gestionar con dos estados: `deleteStep1Id` y `deleteStep2Id`
- Al confirmar step 1 → abrir step 2. Al confirmar step 2 → ejecutar `handleDeleteBudget(id)` y limpiar estados

