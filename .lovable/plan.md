

# Drag para mover barras del Gantt con tooltip de fecha

## Resumen

Permitir arrastrar las barras del Gantt horizontalmente para cambiar las fechas de las tareas. Durante el arrastre, se mostrara un tooltip flotante con la fecha correspondiente a la posicion actual del cursor.

## Comportamiento

- **Arrastre completo (mover)**: Arrastrar la barra desde el centro la desplaza entera, cambiando la fecha de inicio pero manteniendo la duracion.
- **Arrastre borde derecho (resize)**: Arrastrar desde el extremo derecho de la barra cambia la fecha de fin (duracion).
- **Arrastre borde izquierdo (resize)**: Arrastrar desde el extremo izquierdo cambia la fecha de inicio, ajustando la duracion.
- **Tooltip durante arrastre**: Un pequeno chip flotante junto al cursor muestra la fecha (ej. "14 feb") actualizada en tiempo real mientras se arrastra.
- Al soltar, se llama a `onUpdateTaskDate` con los valores finales.
- Los clics simples (seleccion) y doble clics (popover) siguen funcionando igual -- el drag solo se activa si el mouse se mueve mas de 3px.

## Cambios tecnicos

| Archivo | Cambio |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | 1. Nuevo estado de drag: `dragging` con `{ taskId, workflowId, mode: 'move' | 'resize-left' | 'resize-right', startX, origStartDate, origDays }`. 2. En la barra: `onMouseDown` detecta si el clic esta en los 6px del borde izquierdo, 6px del borde derecho, o centro para determinar `mode`. 3. Listeners `mousemove`/`mouseup` a nivel `document` (similar a `useDraggable.ts`): convierte deltaX en dias usando el ancho del contenedor y `totalDays`, calcula nueva fecha y dias, y actualiza un estado temporal `dragPreview` para renderizar la barra en su nueva posicion. 4. Un div tooltip absoluto (posicionado junto al cursor) muestra `format(previewDate, 'dd MMM', { locale: es })` durante el arrastre. 5. Al soltar: llama `onUpdateTaskDate` con los valores finales y limpia el estado de drag. 6. Cursor CSS: `cursor-ew-resize` en los bordes, `cursor-grab` / `cursor-grabbing` en el centro. 7. Umbral de 3px antes de iniciar el drag para no interferir con clics. |

## Detalle de la interaccion

```text
Barra de tarea:
  [|||=================|||]
   ^                    ^
   resize-left         resize-right
         (centro = move)

Durante el arrastre:
  [=================]  "14 feb"  <-- tooltip flotante
                        ^
                   junto al cursor
```

## Calculo de dias desde pixeles

Se usa `containerRef` (referencia al div flex-1 del row) para obtener el ancho total en pixeles. La conversion es:

```text
deltaDays = Math.round((deltaX / containerWidth) * totalDays)
newStartDate = addDays(origStartDate, deltaDays)
```

Para resize-right: `newDays = Math.max(1, origDays + deltaDays)`
Para resize-left: `newStartDate = addDays(origStart, deltaDays)`, `newDays = Math.max(1, origDays - deltaDays)`

## Tooltip

Un `div` con `position: fixed`, `pointer-events: none`, posicionado en `(clientX + 12, clientY - 24)`. Estilo: fondo oscuro, texto blanco, rounded, texto xs. Solo visible cuando `dragging` esta activo.

