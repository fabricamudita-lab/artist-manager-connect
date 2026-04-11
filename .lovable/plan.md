

## Eliminar CityZen del módulo de Booking

CityZen era el antiguo booker y ya no cumple ninguna función. Se eliminará toda referencia visual y lógica de CityZen, manteniendo el campo `es_cityzen` en la base de datos (sin tocar migraciones).

### Archivos a modificar (~17 archivos)

**1. `src/components/BookingFiltersToolbar.tsx`**
- Eliminar el checkbox "Solo CityZen" del panel de filtros avanzados
- Eliminar `showCityzen` de la interfaz `BookingFiltersState`
- Eliminar import de `Sparkles`

**2. `src/pages/Booking.tsx`**
- Eliminar `showCityzen` del estado inicial de filtros y de `clearAllFilters`
- Eliminar la línea de filtrado por `es_cityzen`
- Eliminar columna `es_cityzen` del CSV export
- Cambiar el subtítulo "con reglas CityZen" por algo genérico

**3. `src/components/BookingKanban.tsx`**
- Eliminar la tarjeta KPI "CityZen" del dashboard
- Eliminar el filtro `showCityzen` y su lógica
- Eliminar columna CityZen del export CSV
- Eliminar el badge CityZen de las tarjetas del Kanban
- Eliminar el comentario "Validate CityZen rules" (mantener la validación de comisión si tiene sentido por sí sola)

**4. `src/components/booking-detail/BookingOverviewTab.tsx`**
- Eliminar el badge "CityZen" de la vista de detalle

**5. `src/pages/BookingDetail.tsx`**
- Eliminar `es_cityzen` de la exportación PDF

**6. Resto de archivos** (formularios, tipos, etc.)
- Eliminar checkboxes y campos de formulario `es_cityzen`
- Eliminar badges naranjas de CityZen en tarjetas y listas
- No tocar la columna de la base de datos

### Resultado
La UI queda limpia sin referencias a CityZen. El campo sigue en la BD por si acaso, pero no se muestra ni se filtra.

