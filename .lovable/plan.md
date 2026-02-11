
# Zoom out / Vista completa del Cronograma

## Objetivo

Agregar un boton de "vista completa" (icono de ventana/maximize) en la barra de herramientas del cronograma que permita alternar entre la vista normal (con scroll horizontal para timelines largos) y una vista comprimida que muestre todo el cronograma de un vistazo.

## Como funciona

El Gantt actualmente usa posicionamiento por porcentajes, asi que siempre se ajusta al ancho del contenedor. El problema es que cuando hay muchos meses, las barras quedan muy pequenas y dificiles de leer.

La solucion es introducir un sistema de zoom con dos niveles:

- **Vista normal**: El Gantt tiene un `minWidth` calculado segun el numero de dias del timeline (ej. ~25px por dia), lo que genera scroll horizontal cuando el timeline es largo. Esto da barras legibles.
- **Vista completa (zoom out)**: Se elimina el `minWidth` y el Gantt ocupa el 100% del ancho visible, comprimiendo todo para dar una vision panoramica.

## Cambios tecnicos

### 1. GanttChart.tsx - Agregar prop `fitToView`

- Agregar prop `fitToView?: boolean` a `GanttChartProps`
- Cuando `fitToView` es `false` (defecto), envolver el contenido en un div con `minWidth` dinamico basado en `totalDays` (ej. `totalDays * 25` pixels) y el contenedor padre con `overflow-x: auto`
- Cuando `fitToView` es `true`, no aplicar `minWidth` (el Gantt se comprime al 100% del ancho)

### 2. ReleaseCronograma.tsx - Estado y boton

- Agregar estado `const [fitToView, setFitToView] = useState(false)`
- Agregar un boton con icono `Maximize2` / `Minimize2` (de lucide-react) junto al selector de vista Lista/Cronograma
- El boton solo se muestra cuando `viewMode === 'gantt'`
- Tooltip: "Vista completa" / "Vista detallada"
- Pasar `fitToView` como prop al `GanttChart`

### Archivos afectados

- `src/components/lanzamientos/GanttChart.tsx` - Nueva prop + wrapper con scroll/minWidth
- `src/pages/release-sections/ReleaseCronograma.tsx` - Estado + boton en toolbar
