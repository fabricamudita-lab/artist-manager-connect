

## Corregir exportación PDF de presupuestos: desglose por categorías

### Problema
El PDF exportado muestra el 96.5% de los ítems como "Sin categoría" porque la función `downloadPDF` usa `item.category` (campo de texto legacy) en lugar de `item.budget_categories?.name` (la relación real usada en la UI). Además, el usuario quiere reorganizar el orden de las secciones.

### Causa raíz
En `BudgetDetailsDialog.tsx`, línea 2214:
```
const cat = item.category || 'Sin categoría';
```
Debería ser:
```
const cat = item.budget_categories?.name || item.category || 'Sin categoría';
```
Este mismo error aparece en las líneas 2214, 2267-2268 (desglose por categorías) y en el export Excel (~línea 2392, 2411).

### Cambios

**Archivo: `src/components/BudgetDetailsDialog.tsx`**

1. **Función `downloadPDF`** (~líneas 2112-2339):
   - Corregir la resolución de categoría en todas las agrupaciones para usar `item.budget_categories?.name || item.category || 'Sin categoría'`.
   - Reorganizar secciones del PDF:
     1. Titulo + info evento (ya existe)
     2. Resumen financiero (ya existe)
     3. **Resumen por categoría** (tabla con: Categoría, N elementos, Confirmado/Provisional, Total Neto, %)
     4. **Desglose completo por categoría** (cada categoría con sus ítems detallados)
   - Usar `budgetCategories` (ya disponible en el estado) para ordenar las categorías según su `sort_order` real en vez de `getCategorySortPriority`.
   - Incluir el total general al final de la tabla de detalle.

2. **Función `downloadExcel`** (~líneas 2341-2450):
   - Misma corrección de resolución de categoría: usar `budget_categories?.name` como prioridad.

### Resultado esperado
- El PDF exportado refleja las mismas categorías que se ven en la UI (Músicos, Producción, Dietas, etc.).
- El orden es: Resumen financiero → Resumen por categoría → Desglose completo.
- El Excel también muestra las categorías correctas.

