
# Fix: Reordenar los segmentos de la barra — verde, azul, rojo, pendiente

## Orden actual (incorrecto)
```
[rojo][azul][pendiente][verde]
```

## Orden deseado
```
[verde][azul][rojo][clarito del flujo]
```

La lógica visual es: primero lo positivo (completado), luego lo neutral (en proceso), luego lo urgente (retrasado), y por último el espacio pendiente de color clarito.

## Cambio técnico

Solo hay que reordenar los 4 segmentos dentro del contenedor y recalcular el `left` acumulado de cada uno.

### Nuevas posiciones `left`

| Segmento | Left |
|---|---|
| Verde (completado) | `0%` |
| Azul (en proceso) | `pctCompletado%` |
| Rojo (retrasado) | `pctCompletado + pctEnProceso%` |
| Clarito (pendiente) | `pctCompletado + pctEnProceso + pctRetrasado%` |

### Código actualizado (líneas 469–496)

```tsx
{/* Segmento completado */}
{completed > 0 && (
  <div
    className="absolute top-0 left-0 h-full bg-green-500/70"
    style={{ width: `${pctCompletado}%` }}
  />
)}
{/* Segmento en proceso */}
{enProceso > 0 && (
  <div
    className="absolute top-0 h-full bg-blue-500/70"
    style={{ left: `${pctCompletado}%`, width: `${pctEnProceso}%` }}
  />
)}
{/* Segmento retrasado */}
{retrasadas > 0 && (
  <div
    className="absolute top-0 h-full bg-red-500/70"
    style={{ left: `${pctCompletado + pctEnProceso}%`, width: `${pctRetrasado}%` }}
  />
)}
{/* Segmento pendientes — color clarito del flujo */}
{pendientes > 0 && (
  <div
    className={cn('absolute top-0 h-full', WORKFLOW_BAR_COLORS[workflow.id]?.bg || 'bg-primary/20')}
    style={{ left: `${pctCompletado + pctEnProceso + pctRetrasado}%`, width: `${pctPendiente}%` }}
  />
)}
```

## Archivo a modificar

| Archivo | Líneas |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | Líneas 469–496 |

Un único bloque de reordenación, sin cambios en base de datos ni nuevos archivos.
