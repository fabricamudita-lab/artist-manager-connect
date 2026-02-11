

# Mover barra resumen al lado del titulo y corregir alineacion

## Cambios

### 1. Barra resumen en la misma linea que el titulo del flujo

Actualmente la barra resumen ocupa una fila separada debajo del titulo. Se movera para que aparezca en la misma fila, al lado derecho del titulo (como en la vista global "Cronogramas" de Discografia).

La estructura pasara de:

```text
[Icono] Flujo de Audio              0/4
[=========barra resumen=========]
  Grabacion   [==]
  Mezcla         [==]
```

A:

```text
[Icono] Flujo de Audio  0/4  [=========barra resumen=========]
  Grabacion   [==]
  Mezcla         [==]
```

El titulo quedara en un lado fijo (como el panel izquierdo de la vista global) y la barra resumen se posicionara en el area del timeline a su derecha.

### 2. Corregir calculo de fechas de la barra resumen

El calculo actual toma `t.startDate.getTime()` para el inicio y `addDays(t.startDate, t.estimatedDays).getTime()` para el final. Se normalizara con `startOfDay()` para que coincida exactamente con el calculo de `getBarPosition`, que internamente usa `startOfDay(startDate)`. Esto eliminara el desfase visual entre la barra resumen y la primera tarea.

## Detalle tecnico

### Archivo: `src/components/lanzamientos/GanttChart.tsx`

1. Reestructurar cada seccion de workflow para usar un layout similar al de `AllCronogramasView`: una fila con el titulo a la izquierda y la barra resumen posicionada en el area del timeline a la derecha
2. El titulo + contador se queda en un contenedor de ancho fijo a la izquierda
3. La barra resumen se renderiza en un contenedor `flex-1 relative` a la derecha, usando `getBarPosition()` para posicionarse
4. Normalizar las fechas con `startOfDay()` en el calculo del rango del workflow para alinear con `getBarPosition`
5. Las filas de tareas individuales mantienen su estructura actual debajo

