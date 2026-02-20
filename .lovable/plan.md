
# Mejora: La barra de flujo colapsada debe mostrar tareas en proceso y retrasadas

## Situación actual

Cuando un flujo está colapsado, la barra de resumen muestra:
- **Fondo tenue**: el color del flujo (siempre visible)
- **Relleno más intenso**: solo avanza cuando hay tareas `completado` (verde si todo completo)
- Las tareas `en_proceso` y `retrasado` son invisibles desde la vista colapsada

## Comportamiento propuesto

La barra de resumen pasará a mostrar **tres capas de información visual**, con esta prioridad (lo más urgente se ve primero):

```text
[──retrasado──][──en_proceso──][──completado──][──pendiente (fondo tenue)──]
```

### Reglas de color por estado del flujo

| Situación del flujo | Barra de fondo | Relleno de progreso |
|---|---|---|
| Todo completado | verde/20 | verde/60 (100%) |
| Tiene retrasadas | rojo/20 | rojo/60 (% retrasadas) |
| Tiene en proceso (sin retrasadas) | azul/20 | azul/60 (% en proceso) |
| Todo pendiente | color flujo/20 | ninguno |

### Detalle: barra con múltiples segmentos (cuando está colapsado)

En lugar de una sola barra de progreso, la barra del flujo colapsado mostrará **hasta 3 segmentos apilados** de izquierda a derecha:

1. **Rojo** → % de tareas retrasadas  
2. **Azul** → % de tareas en proceso  
3. **Verde** → % de tareas completadas  
4. **Fondo tenue** → resto (pendientes)

Ejemplo visual:
```
[█████ retrasado][████ en proceso][█████████ completado][           pendiente]
```

Esto es idéntico a como funciona la barra de progreso actual, pero con múltiples franjas de color en lugar de una sola.

### Tooltip mejorado (al hacer hover)

Actualmente muestra solo las fechas. Se añade un resumen de estado:
```
Mar 2026 – May 2026 · 2 retrasadas · 1 en proceso · 3 completadas
```

## Cambio técnico

Solo se modifica el bloque de la barra colapsada en **`src/components/lanzamientos/GanttChart.tsx`**, entre las líneas 426–474.

### Nuevos cálculos (añadir junto a `completed`):
```ts
const retrasadas = workflowTasks.filter(t => t.status === 'retrasado').length;
const enProceso = workflowTasks.filter(t => t.status === 'en_proceso').length;
const total = workflowTasks.length;

const pctRetrasado = (retrasadas / total) * 100;
const pctEnProceso = (enProceso / total) * 100;
const pctCompletado = (completed / total) * 100;
```

### Color del fondo de la barra (priority: retrasado > en_proceso > completado > flujo):
```ts
const bgColor = isWorkflowComplete
  ? 'bg-green-500/20'
  : retrasadas > 0
    ? 'bg-red-500/20'
    : enProceso > 0
      ? 'bg-blue-500/20'
      : (WORKFLOW_BAR_COLORS[workflow.id]?.bg || 'bg-primary/20');
```

### Reemplazar el único `<div>` de fill por tres segmentos apilados:
```tsx
{/* Segmento retrasado */}
{retrasadas > 0 && (
  <div className="absolute top-0 left-0 h-full rounded-l-full bg-red-500/70"
       style={{ width: `${pctRetrasado}%` }} />
)}
{/* Segmento en proceso */}
{enProceso > 0 && (
  <div className="absolute top-0 h-full bg-blue-500/70"
       style={{ left: `${pctRetrasado}%`, width: `${pctEnProceso}%` }} />
)}
{/* Segmento completado */}
{completed > 0 && (
  <div className={cn('absolute top-0 h-full bg-green-500/70', 
                     retrasadas === 0 && enProceso === 0 ? 'rounded-l-full' : '')}
       style={{ left: `${pctRetrasado + pctEnProceso}%`, width: `${pctCompletado}%` }} />
)}
```

### Tooltip más informativo:
```tsx
<span className="...">
  {format(wfStart, 'dd MMM', { locale: es })} – {format(wfEnd, 'dd MMM', { locale: es })}
  {retrasadas > 0 && ` · ${retrasadas} retrasada${retrasadas > 1 ? 's' : ''}`}
  {enProceso > 0 && ` · ${enProceso} en proceso`}
  {completed > 0 && ` · ${completed} completada${completed > 1 ? 's' : ''}`}
</span>
```

## Archivo a modificar

| Archivo | Líneas |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | Bloque 426–474 (sección de la barra de resumen del workflow colapsado) |

Sin cambios en base de datos, sin nuevos archivos, sin cambios en la leyenda (ya incluye En Proceso y Retrasado).
