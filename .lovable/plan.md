

# Mejora de la interaccion del Gantt: fechas visibles, drag simplificado y menu contextual

## Resumen

Redisenar la interaccion de las barras del Gantt para que sea mas intuitiva y practica:

1. **Hover**: Al pasar el raton sobre una barra, mostrar las fechas de inicio y fin justo a la derecha del rectangulo, en una sola linea compacta.
2. **Clic**: Selecciona la tarea (multi-seleccion posible). Una vez seleccionada, se puede arrastrar para mover, mostrando las fechas actualizadas en tiempo real a la derecha.
3. **Clic derecho (menu contextual)**: Abre un menu con opciones "Ocultar tarea" y "Abrir calendario".
4. **Multi-seleccion + ocultar**: Cuando hay varias tareas seleccionadas, el boton flotante "Ocultar" ya existente se mantiene.

## Cambios en detalle

### 1. Fechas inline a la derecha de la barra

Actualmente no se muestran fechas al pasar el raton. Se anadira un elemento de texto posicionado justo despues del extremo derecho de la barra:

- Formato: `"12 dic - 18 dic"` (dd MMM - dd MMM)
- Visible en hover (opacity 0 -> 1 con group-hover)
- Tambien visible siempre durante el drag
- Estilo: texto xs, muted-foreground, sin fondo, posicionado con `left: calc(100%)` respecto a la barra
- Si la barra esta siendo arrastrada, las fechas se actualizan en tiempo real con los valores del drag preview

### 2. Drag simplificado (solo mover, sin resize de bordes)

Se mantiene la logica de drag actual (move completo) pero se simplifica el tooltip: en lugar del tooltip flotante junto al cursor, las fechas ya se muestran a la derecha de la barra en tiempo real. Se elimina el tooltip flotante.

Se mantienen los resize handles en los bordes para cambiar duracion.

### 3. Menu contextual con clic derecho

Reemplazar el doble clic por un **clic derecho** (contextmenu) que abre un pequeno menu con:

- **"Ocultar tarea"**: Llama a la funcion de ocultar existente (nueva prop `onHideTask`)
- **"Abrir calendario"**: Abre el popover de calendario (comportamiento actual del doble clic)

Se usara el componente `ContextMenu` de Radix (ya instalado en el proyecto) o un `DropdownMenu` posicionado manualmente.

### 4. Props actualizadas

Nuevas props en `GanttChart`:
- `onHideTask?: (taskId: string) => void` -- para ocultar una sola tarea desde el menu contextual

## Cambios tecnicos

| Archivo | Cambio |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | 1. Anadir label de fechas inline (`group-hover:opacity-100`) a la derecha de cada barra, que muestra `startDate - endDate` en formato `dd MMM`. 2. Durante drag, mostrar las fechas del preview en vez de las originales (ya calculado). 3. Eliminar tooltip flotante (div fixed). 4. Anadir `onContextMenu` en la barra que abre un menu contextual con "Ocultar" y "Calendario". 5. Nueva prop `onHideTask`. 6. Usar `ContextMenu` de Radix o un `Popover` posicionado en el punto del clic derecho. |
| `src/pages/release-sections/ReleaseCronograma.tsx` | 1. Pasar nueva prop `onHideTask` al GanttChart que anade el ID al set de ocultos y persiste en localStorage. |

## Flujo visual

```text
Estado normal (hover):
  Grabacion  [=======]  12 dic - 18 dic
                         ^-- aparece al hover

Durante drag:
  Grabacion  [=======]  14 dic - 20 dic
                         ^-- se actualiza en tiempo real

Clic derecho sobre barra:
  ┌──────────────────┐
  │ Ocultar tarea    │
  │ Abrir calendario │
  └──────────────────┘
```

