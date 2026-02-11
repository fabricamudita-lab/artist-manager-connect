

# Agregar barras resumen de flujo al Gantt individual

## Que se hara

En el cronograma individual de cada lanzamiento (componente `GanttChart`), se agregara una barra resumen por cada flujo de trabajo (Audio, Visual, Marketing, etc.) que abarque desde la primera hasta la ultima tarea del flujo, igual que en la vista global de cronogramas (`AllCronogramasView`).

## Detalle tecnico

### Archivo: `src/components/lanzamientos/GanttChart.tsx`

En la seccion de cada workflow (lineas 397-475), justo despues del titulo del flujo (linea 406) y antes de las tareas individuales, se insertara una barra resumen horizontal:

1. Calcular el rango total del workflow (fecha minima y maxima de sus tareas)
2. Calcular el progreso (tareas completadas / total)
3. Renderizar una barra con fondo suave del color del workflow y una barra interior que represente el progreso
4. La barra tendra el mismo estilo que las barras de la vista global: `rounded-full`, color con opacidad, y un contador "X/Y" al lado del nombre

La estructura para cada workflow quedara:

```
[Icono] Nombre del Flujo   X/Y
[==========barra resumen==========]  <- nueva
  Tarea 1  [===]
  Tarea 2      [====]
  Tarea 3           [==]
```

### Cambios especificos

- Junto al nombre del workflow, agregar un badge con "completadas/total" (como en la vista global)
- Debajo del titulo, antes de las barras de tarea, insertar una fila con la barra resumen usando `getBarPosition(minDate, diffDays)` y el color del workflow con opacidad
- La barra interior mostrara el progreso de completado
- Se reutiliza la misma logica de colores que ya existe en `WORKFLOW_COLORS` para mantener coherencia

