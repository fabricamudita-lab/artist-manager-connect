## Objetivo

Convertir el botón "Filtrar" desplegable del calendario en una **fila horizontal de filtros siempre visibles**, sin perder ninguna funcionalidad existente (interconexión entre artistas, proyectos, equipo, departamento, multi-selección de proyectos, capas de lanzamientos e hitos).

## Cambios

### Archivo único: `src/components/calendar/CalendarToolbar.tsx`

Reestructurar el bloque "Left: Filters" para eliminar el `Popover` exterior "Filtrar" y mostrar todos los controles directamente en línea.

**Layout propuesto (responsive, con `flex-wrap`):**

```text
[Artistas ▾] [Proyectos ▾ (multi)] [Equipo ▾] [Departamento ▾] | ☑ Lanzamientos  ☑ Hitos
```

- Cada control mantiene su icono pequeño (Users, FolderKanban, UserCircle, Building) como prefijo visual dentro del trigger, no como label superior.
- Anchos compactos y consistentes (`h-8`, ancho mínimo ~160–200px) para que quepan en una sola fila en pantallas medianas/grandes y se envuelvan limpiamente en móvil gracias a `flex-wrap`.
- Las "Capas adicionales" (Lanzamientos / Hitos) pasan a ser dos checkboxes inline al final, separadas por un divisor vertical sutil.
- Se elimina el contador "Filtrar (1)" porque los filtros activos ya son visibles.
- Se conserva intacta toda la lógica: `ArtistSelector`, popover interno de multi-selección de proyectos, `Select` de equipo y departamento, sincronización en cascada existente, y la lista pruneada por artista.

**Contenedor exterior:**
- Mantener el `flex flex-wrap items-center justify-between gap-3` actual del toolbar; los filtros ocuparán la zona izquierda y los controles de navegación (Hoy, ‹, ›) la derecha como hasta ahora.
- En viewports estrechos (~865px del usuario), `flex-wrap` enviará controles a una segunda línea de forma natural.

## Fuera de alcance

- No se cambia la lógica de filtrado, ni el hook `useCalendarReleases`, ni `src/lib/calendar/filters.ts`.
- No se tocan `Calendar.tsx` ni los popovers de hitos/lanzamientos.
- No se modifica el esquema de base de datos (este cambio es puramente de presentación UI).
