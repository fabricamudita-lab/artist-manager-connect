

## Añadir vista de filas (lista) en Hojas de Ruta

### Cambio
Añadir un toggle de vista (cuadrícula / lista) junto al botón "Nueva Hoja de Ruta". La vista lista muestra cada roadmap como una fila horizontal compacta en una tabla, similar al patrón ya usado en la sección Economía del Drive.

### Archivo: `src/pages/Roadmaps.tsx`

**1. Estado y toggle**
- Añadir estado `viewMode: 'grid' | 'list'` con persistencia en `localStorage('roadmaps_view_mode')`
- Añadir iconos `LayoutGrid` y `List` de lucide como botones toggle junto al header

**2. Vista lista**
- Cuando `viewMode === 'list'`, renderizar una tabla/div con filas en lugar del grid de cards
- Cada fila muestra en columnas: Nombre | Artista (avatar + nombre) | Estado (badge) | Fechas | Acciones (menú ...)
- Filas clickables con `cursor-pointer` y hover
- Misma lógica de navegación y dropdown de eliminar

**3. Vista grid**
- Sin cambios, es la vista actual

### Resultado visual (lista)

```text
┌──────────────────────┬──────────────┬───────────┬─────────────────────┬────┐
│ Nombre               │ Artista      │ Estado    │ Fechas              │ ⋮  │
├──────────────────────┼──────────────┼───────────┼─────────────────────┼────┤
│ 03.10.2026...        │ 🎵 Klaus S.  │ Borrador  │ 3 oct - 3 oct 2026  │ ⋮  │
│ 19.02.2026...        │ 🎵 Klaus S.  │ Borrador  │ 19 feb - 19 feb     │ ⋮  │
└──────────────────────┴──────────────┴───────────┴─────────────────────┴────┘
```

Cambio localizado solo en `Roadmaps.tsx`.

