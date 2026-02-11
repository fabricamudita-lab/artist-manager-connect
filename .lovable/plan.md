

# Linea roja vertical de "Hoy" en la vista de Cronogramas

## Cambio

Anadir una linea vertical roja que indica el dia actual en el Gantt unificado. La linea atraviesa toda la altura del componente (cabecera de meses + todas las filas de releases/workflows), permitiendo ver de un vistazo que tareas ya deberian estar completadas y cuales estan por venir.

## Detalle tecnico

### Archivo: `src/components/releases/AllCronogramasView.tsx`

1. Calcular la posicion horizontal de "hoy" usando la misma funcion `getBarStyle` / logica de `differenceInDays(now, globalStart) / totalDays * 100`
2. Solo mostrar la linea si la fecha actual cae dentro del rango visible (`globalStart` <= hoy <= `globalEnd`)
3. Anadir un `div` absoluto con:
   - `position: absolute`, `top: 0`, `bottom: 0`
   - `left` calculado como porcentaje
   - `width: 2px`, `background: red` (o `bg-red-500`)
   - `z-index` alto para que quede por encima de las barras
   - Un pequeno indicador circular o etiqueta "Hoy" en la parte superior
4. Este div se coloca dentro de un wrapper `relative` que envuelve la zona del timeline (la parte derecha, excluyendo la columna de nombres)

La linea se renderiza una sola vez como overlay absoluto sobre toda la columna derecha del Gantt, no se repite por fila.

