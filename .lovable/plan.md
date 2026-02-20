
# Fix: Las tareas pendientes deben tener su propio color clarito en la barra

## Problema actual

El diseño actual usa el contenedor de la barra como "fondo tenue" para representar las pendientes. Pero como los segmentos (rojo, azul, verde) se posicionan con `left: 0%` acumulándose desde la izquierda, **el fondo queda completamente tapado** por los segmentos visibles. Las pendientes desaparecen visualmente.

Ejemplo con 2 retrasadas + 1 en proceso + 3 completadas + 4 pendientes (10 total):
```
Estado actual (incorrecto):
[██rojo 20%][██azul 10%][██████verde 30%][          invisible          ]
 ↑ el fondo tenue queda tapado debajo

Estado deseado (correcto):
[██rojo 20%][██azul 10%][██████verde 30%][░░░░░░░pendiente 40%░░░░░░░]
```

## Solución

Añadir un **cuarto segmento explícito** para las tareas pendientes, que ocupe el porcentaje restante de la barra, y dejar el contenedor **sin color de fondo** (solo `bg-transparent` o el borde de la pared). El color clarito de las pendientes será el color propio del flujo (igual que antes era el fondo).

### Cambio en los cálculos

```ts
const pendientes = total - retrasadas - enProceso - completed;
const pctPendiente = total > 0 ? (pendientes / total) * 100 : 0;
```

### Nuevo segmento de pendientes

```tsx
{/* Segmento pendientes — siempre visible como color clarito del flujo */}
{pendientes > 0 && (
  <div
    className={cn('absolute top-0 h-full', WORKFLOW_BAR_COLORS[workflow.id]?.bg || 'bg-primary/20')}
    style={{ 
      left: `${pctRetrasado + pctEnProceso + pctCompletado}%`, 
      width: `${pctPendiente}%` 
    }}
  />
)}
```

### El contenedor pasa a ser transparente

El contenedor deja de tener `bgColor` dinámico — ya no necesita hacer de fondo porque el segmento de pendientes lo cubre. El contenedor solo necesita `bg-transparent` y el `rounded-full overflow-hidden` para redondear los extremos correctamente.

### Resultado visual final

```
[███ retrasado][██ en proceso][████████ completado][░░░░░░░ pendiente]
  rojo/70        azul/70        verde/70              color flujo/20
```

Todos los estados siempre visibles, con el color de urgencia de izquierda a derecha.

### Tooltip: añadir pendientes

```tsx
{pendientes > 0 && ` · ${pendientes} pendiente${pendientes > 1 ? 's' : ''}`}
```

## Archivo a modificar

| Archivo | Líneas |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | Líneas 433–501 (bloque de la barra de resumen del workflow colapsado) |

Un solo archivo, sin cambios en base de datos, sin nuevos archivos.
