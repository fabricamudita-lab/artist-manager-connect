

## Filtro de fase multi-selección en Booking

### Problema
El filtro de fase (estado del evento) solo permite seleccionar un valor a la vez. El usuario quiere poder seleccionar múltiples fases simultáneamente (ej. "Oferta" + "Confirmado").

### Cambios

**1. `src/components/BookingFiltersToolbar.tsx`**
- Cambiar `phaseFilter` en `BookingFiltersState` de `string` a `string[]` (array de IDs seleccionados).
- Reemplazar el `<Select>` de fase (líneas 140-152) por un `<Popover>` con checkboxes, similar a un multi-select con chips. Cada fase tendrá un `<Checkbox>` para marcar/desmarcar. Incluir opción "Todas" que limpia la selección.
- Actualizar `hasActiveFilters` y `activeFilterCount` para evaluar `phaseFilter.length > 0` en lugar de `!== 'all'`.
- Mostrar badge con la cantidad de fases seleccionadas o el nombre si es solo una.

**2. `src/pages/Booking.tsx`**
- Cambiar el estado inicial de `phaseFilter` de `'all'` a `[]` (array vacío = todas).
- Actualizar la lógica de filtrado (línea 223): si `phaseFilter.length > 0`, filtrar por `phaseFilter.includes(o.phase)`.
- Actualizar `clearAllFilters` (línea 238): poner `phaseFilter: []`.

### UX
- Array vacío `[]` = "Todas" (sin filtro).
- Al seleccionar fases, se muestra un botón con las fases seleccionadas o un contador (ej. "3 fases").
- Checkbox list dentro de un Popover, manteniendo la misma estética compacta.

