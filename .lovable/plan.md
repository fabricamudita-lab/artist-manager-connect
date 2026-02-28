
Objetivo inmediato: que el reordenamiento por arrastre en “Elementos” funcione de forma visible al instante y que se mantenga al recargar.

Diagnóstico (confirmado)
1) El drag sí está funcionando en backend:
- En la sesión se ven múltiples `PATCH /rest/v1/budget_items?id=eq...` con `{"sort_order": ...}`.
- En base de datos, `budget_items.sort_order` se actualiza correctamente.

2) La UI no refleja ese orden por dos causas de lectura/render:
- `fetchBudgetItems()` carga con `.order('name')`, así que al refrescar siempre vuelve a orden alfabético.
- En render, cada categoría usa `getCategoryItems(category.id)` (sin ordenar por `sort_order`), por lo que aunque cambie `sort_order`, el array en memoria mantiene su orden previo.

3) Además hay una función `getFilteredAndSortedItems()` con lógica de sort que ahora mismo no se usa en el render de la tabla.

Implementación propuesta (sin cambiar comportamiento no relacionado)
1) Corregir fuente de orden al cargar items
- En `fetchBudgetItems()` cambiar orden principal a `sort_order` (ascendente), con fallback estable (por ejemplo `created_at`) para evitar saltos visuales.
- Eliminar dependencia de `.order('name')` para el orden base.

2) Hacer que el render de filas respete `sort_order`
- En el bloque de categorías (sección Elementos), reemplazar:
  - `const categoryItems = getCategoryItems(category.id);`
  por una variante ordenada por `sort_order` (preferible reutilizando `getFilteredAndSortedItems(category.id)` o ajustando `getCategoryItems` para devolver ordenado).
- Regla de orden recomendada:
  - Primero `sort_order` asc
  - Si empate o valores inválidos, fallback por `created_at` asc

3) Asegurar refresco visual inmediato tras soltar
- Mantener `reorderElements(...)` actual de persistencia.
- Ajustar su actualización local para que el estado refleje el nuevo orden de inmediato de forma determinista:
  - O bien reordenar también el array local en `setItems`.
  - O bien, si el render ya ordena por `sort_order`, basta con actualizar `sort_order` en estado (pero garantizando que el selector de render use ese campo).
- Añadir `await` en `onDrop` para evitar carreras visuales (limpiar estados de drag después del reorder).

4) Evitar regresiones con nuevos elementos
- En `addNewItem(categoryId)`, asignar `sort_order` al final de su categoría (`max(sort_order)+1`) en vez de depender del default.
- Así “Agregar” siempre pone el ítem al final y no rompe el orden manual existente.

5) Limpiar coherencia de orden/sort en código
- Si se reutiliza `getFilteredAndSortedItems`, revisar estado `sortBy`:
  - ahora arranca en `'name'` aunque el objetivo de drag es “orden manual”.
  - introducir modo explícito “manual” o dejar por defecto `sort_order`.
- Mantener drag habilitado solo en modo manual (si existe selector de orden) para evitar expectativas confusas.

Validación funcional (E2E manual)
1) Abrir una categoría con varios elementos.
2) Arrastrar elemento A debajo de B.
3) Verificar cambio visual inmediato sin recargar.
4) Recargar página y comprobar que se conserva el mismo orden.
5) Crear nuevo elemento en esa categoría y confirmar que aparece al final.
6) Repetir en otra categoría para comprobar aislamiento por categoría.

Archivos a tocar
- `src/components/BudgetDetailsDialog.tsx`:
  - `fetchBudgetItems`
  - `getCategoryItems` / `getFilteredAndSortedItems`
  - bloque de render de `categoryItems`
  - `onDrop` de filas
  - `addNewItem`
- No hace falta nueva migración: `sort_order` ya existe y está operativo.

Resultado esperado
- El usuario podrá cambiar el orden “arrastrando entre sí” y verlo al instante.
- El orden quedará persistido y será consistente tras recarga.
- Se elimina el conflicto actual entre “orden guardado” y “orden mostrado”.
