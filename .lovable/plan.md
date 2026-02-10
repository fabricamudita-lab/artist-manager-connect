

# Doble clic en barra del Gantt para abrir calendario

## Resumen

Dos cambios solicitados:

1. **Doble clic en barra del Gantt abre el calendario** — Actualmente el calendario solo se abre desde el menu contextual (clic derecho). Se anadira un handler `onDoubleClick` en la barra para abrir directamente el popover del calendario.

2. **Boton de ocultar tareas** — Esta funcionalidad ya existe en el cronograma: al hacer clic en las barras se seleccionan, aparece una barra flotante en la parte inferior con el boton "Ocultar" y "Cancelar", y hay un boton "Ver ocultos" para restaurarlas. No se requieren cambios.

## Cambio tecnico

| Archivo | Cambio |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | En el `div` de la barra (linea ~614), anadir `onDoubleClick` que llame a `setOpenPopover(popoverId)` y `setEditingDateType('start')` para abrir el calendario directamente. Se evitara conflicto con el `onClick` de seleccion existente. |

## Detalle

- El `onDoubleClick` abrira el popover del calendario en modo "Inicio" por defecto.
- El `onClick` simple seguira funcionando para seleccionar/deseleccionar la tarea (para el flujo de ocultar).
- El clic derecho (context menu) seguira disponible como opcion alternativa.

