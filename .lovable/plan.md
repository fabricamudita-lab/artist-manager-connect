

## Mostrar botón de eliminar en modo edición y añadir análisis de impacto en Budgets.tsx

### Problema
En `src/pages/Budgets.tsx`, cuando se entra en modo edición inline de un presupuesto:
1. El botón 🗑 está oculto porque está envuelto en `PermissionWrapper requiredPermission="manage"` y el usuario no tiene ese permiso.
2. La función `handleDeleteBudget` no hace borrado en cascada (no elimina `budget_items`, `irpf_retentions`, etc.) y puede fallar por restricciones de FK.
3. No se muestra ningún análisis de impacto antes de eliminar (a diferencia de lo ya implementado en `FinanzasPresupuestos.tsx`).

### Cambios en `src/pages/Budgets.tsx`

**1. Mostrar el botón 🗑 siempre en modo edición**
- Eliminar el `PermissionWrapper` que envuelve el botón de eliminar en el bloque `isEditing` (líneas 1227-1241).
- Mantener el `PermissionWrapper` en el bloque NO-editing (líneas 1269-1298) para que solo aparezca el 🗑 al editar o con permisos.

**2. Añadir análisis de impacto antes de eliminar**
- Portar la lógica de `fetchDeleteImpact` desde `FinanzasPresupuestos.tsx`: consultar `budget_items`, `irpf_retentions`, `irpf_quarter_status`, y verificar vínculos con booking/proyecto/release.
- Reemplazar el `ConfirmationDialog` de doble paso por un `AlertDialog` que muestre las dependencias detectadas con los mismos avisos (partidas, retenciones, trimestres cerrados, vínculos).

**3. Borrado en cascada seguro**
- Actualizar `handleDeleteBudget` para borrar en orden: `irpf_retentions` → `budget_items` → `budget_versions` → `budget_attachments` → `budgets`.
- Mantener la funcionalidad de "Deshacer" solo para el presupuesto en sí (las dependencias borradas no se restauran, lo cual se indicará si es necesario).

**4. Unificar el botón 🗑 del modo NO-editing**
- Reemplazar el `AlertDialog` inline simple (líneas 1270-1297) por la misma llamada a `fetchDeleteImpact` + diálogo con análisis, para que ambos caminos (editando y no editando) usen el mismo flujo seguro.

### Archivo modificado
- `src/pages/Budgets.tsx`

