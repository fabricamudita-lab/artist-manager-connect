## Ocultar badges de artistas seleccionados en el calendario

En la barra de filtros del calendario, debajo del selector "Todos los artistas" se están mostrando badges en violeta con cada artista seleccionado (Eudald Payés, PLAYGRXVND, etc.). Esa información ya aparece dentro del propio menú desplegable, así que sobra.

Como `ArtistSelector` es un componente compartido que se usa en otros módulos (donde sí queremos seguir viendo los badges), añadiré una opción para ocultarlos solo donde haga falta.

### Cambios

1. **`src/components/ArtistSelector.tsx`**
   - Añadir prop opcional `showSelectedBadges?: boolean` (por defecto `true`, para no romper el resto del proyecto).
   - Renderizar el bloque de badges (`<div className="flex flex-wrap gap-1 mt-2">…`) solo cuando `showSelectedBadges` sea `true`.

2. **`src/components/calendar/CalendarToolbar.tsx`**
   - Pasar `showSelectedBadges={false}` al `<ArtistSelector />` de la barra de filtros del calendario.

### Resultado

En `/calendar` el filtro de artistas se queda como un único botón compacto ("Todos los artistas" / "N artistas seleccionados"), sin la lista de chips violetas debajo. El comportamiento del selector (multi-selección, "Todos los artistas", búsqueda) se mantiene intacto, y el resto de pantallas que usan `ArtistSelector` siguen mostrando los badges como hasta ahora.