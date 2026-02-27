

## Distincion visual entre tareas y subtareas en el Gantt

### Objetivo
Hacer que las barras de subtareas sean visualmente mas delgadas (aprox. la mitad de altura) respecto a las tareas principales, para que se distingan claramente en el cronograma.

### Cambios

**Archivo: `src/components/lanzamientos/GanttChart.tsx`**

Modificar las alturas en el componente `GanttBarRow` (linea ~878-914):

| Elemento | Actual (normal) | Nuevo (normal) | Actual (compact) | Nuevo (compact) |
|---|---|---|---|---|
| Contenedor tarea | `h-8` | `h-8` (sin cambio) | `h-5` | `h-5` |
| Contenedor subtarea | `h-6` | `h-4` | `h-4` | `h-3` |
| Barra tarea | `h-6` | `h-6` (sin cambio) | `h-5` | `h-5` |
| Barra subtarea | `h-5` | `h-2.5` | `h-4` | `h-2` |
| Ghost tarea | `h-6` | `h-6` (sin cambio) | `h-5` | `h-5` |
| Ghost subtarea | `h-5` | `h-2.5` | `h-4` | `h-2` |

Ademas, centrar verticalmente las barras de subtarea dentro de su contenedor ajustando los valores de `top-` para que queden centradas (p.ej. `top-[3px]` en modo normal).

Tambien reducir ligeramente la opacidad de subtareas (ya tiene `opacity-70`, se mantiene) y aplicar un `rounded-sm` en vez de `rounded` para subtareas, reforzando la distincion visual.

### Resultado esperado
- Las barras de tareas principales mantienen su grosor actual
- Las barras de subtareas son aproximadamente la mitad de gruesas
- La jerarquia visual queda clara de un vistazo
