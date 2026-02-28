
## Reordenar elementos del presupuesto arrastrando

### Problema
Los elementos dentro de cada categoria tienen drag handlers visuales (GripVertical, estados de drag) pero el `onDrop` no ejecuta ninguna logica de reordenamiento -- solo limpia el estado. Ademas, la tabla `budget_items` no tiene columna `sort_order`.

### Cambios necesarios

**1. Añadir columna `sort_order` a `budget_items` (migracion SQL)**

Crear una migracion que:
- Añada `sort_order INTEGER DEFAULT 0` a `budget_items`
- Inicialice los valores existentes basandose en `created_at` (para que el orden actual se preserve)

**2. Actualizar la interfaz `BudgetItem` en `BudgetDetailsDialog.tsx`**

Añadir `sort_order?: number` al interface.

**3. Implementar funcion `reorderElements`**

Similar a la existente `reorderCategories`:
- Recibe `draggedId`, `targetId` y `categoryId`
- Calcula el nuevo orden dentro de la categoria
- Actualiza cada elemento con su nuevo `sort_order` en la base de datos
- Actualiza el estado local `items` para reflejar el cambio inmediatamente

**4. Conectar el `onDrop` handler**

En el `onDrop` del `TableRow` de cada elemento (linea ~3744), llamar a `reorderElements` en lugar de solo limpiar estado.

**5. Actualizar `getFilteredAndSortedItems` para respetar `sort_order`**

Cuando no hay un `sortBy` activo (o como ordenamiento por defecto), ordenar por `sort_order` en lugar del orden natural del array.

### Seccion tecnica

```text
budget_items:
  + sort_order INTEGER DEFAULT 0

reorderElements(draggedId, targetId, categoryId):
  1. Obtener items de la categoria, ordenados por sort_order
  2. Splice: mover draggedId a la posicion de targetId
  3. Asignar sort_order = index a cada item
  4. Batch update en Supabase (un update por item cambiado)
  5. Actualizar estado local

onDrop handler:
  if (draggedElement && dragOverElement && draggedElement !== dragOverElement)
    reorderElements(draggedElement, dragOverElement, currentCategoryId)
```

No se modifica ninguna otra seccion, columna ni logica existente.
