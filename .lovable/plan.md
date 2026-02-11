
# Deseleccionar tareas al hacer clic en el fondo del Gantt

## Cambio

Al hacer clic en el area vacia (fondo) del diagrama de Gantt, se deseleccionaran todas las tareas seleccionadas. Esto aplica tanto al contenedor principal del Gantt como al area de la lista.

## Detalle tecnico

### Archivo: `src/components/lanzamientos/GanttChart.tsx`

1. Agregar una nueva prop `onClearSelection` al interface `GanttChartProps`
2. En el contenedor principal del Gantt (`div className="space-y-4"`, linea 374), agregar un `onClick` que llame a `onClearSelection()` 
3. En los handlers de clic de las barras de tarea (linea 631), asegurarse de que ya tienen `e.stopPropagation()` (ya lo tienen) para que el clic en una barra no dispare la deseleccion

### Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`

1. Pasar la nueva prop `onClearSelection={() => setSelectedTaskIds(new Set())}` al componente `GanttChart` (alrededor de la linea 1700)
2. Para la vista de lista, agregar un `onClick` en el contenedor de la lista que tambien limpie la seleccion, con `stopPropagation` en las filas de tarea para evitar deseleccion al hacer clic en una tarea
