

# Seleccion y ocultacion de tareas en el Cronograma

## Resumen

Implementar un sistema donde el usuario pueda seleccionar tareas (barras grises) con un clic, seleccionar varias a la vez, y luego ocultarlas. Las tareas ocultas desaparecen tanto de la vista Gantt como de la vista Lista. Un boton "Ver ocultos" permite revisar y restaurar tareas ocultas.

## Comportamiento

- **Clic simple** en una barra del Gantt: selecciona/deselecciona la tarea (borde resaltado). Se pueden seleccionar varias.
- **Doble clic** en una barra del Gantt: abre el popover de edicion de fechas (comportamiento actual).
- Cuando hay tareas seleccionadas, aparece una **barra de acciones** con boton "Ocultar seleccionadas".
- Las tareas ocultas desaparecen de ambas vistas (lista y Gantt).
- Boton **"Ver ocultos"** en la toolbar principal que abre un panel/dialogo con las tareas ocultas y un boton para restaurarlas.

## Persistencia

Las tareas ocultas se guardan en `localStorage` con clave `hidden_tasks_{releaseId}` (array de IDs de tarea). No requiere cambios en la base de datos.

## Cambios tecnicos

| Archivo | Cambio |
|---|---|
| `src/pages/release-sections/ReleaseCronograma.tsx` | 1. Estado `hiddenTaskIds` (Set) cargado desde localStorage. 2. Estado `selectedTaskIds` (Set) para multi-seleccion. 3. Filtrar `workflows` para excluir tareas ocultas antes de pasarlos a la vista Lista y al GanttChart. 4. Barra de acciones flotante cuando hay seleccion activa ("Ocultar N tareas"). 5. Boton "Ver ocultos" en la toolbar (junto a "Regenerar fechas") que abre un dialogo con lista de tareas ocultas y boton "Hacer visible". 6. Funcion `toggleHidden` y `restoreTask` que actualizan estado y localStorage. |
| `src/components/lanzamientos/GanttChart.tsx` | 1. Nuevas props: `selectedTaskIds`, `onTaskSelect`, `onTaskDoubleClick`. 2. Clic simple en barra llama `onTaskSelect(taskId)`. 3. Doble clic en barra abre el popover (mover logica actual de clic a doble clic). 4. Estilo visual para tareas seleccionadas (borde/ring azul). |

## Flujo visual

```text
Toolbar:  [Regenerar fechas]  [Ver ocultos (3)]  [Lista | Cronograma]

Gantt:
  Tarea A  [===seleccionada===]   <-- borde azul
  Tarea B  [=======]
  Tarea C  [===seleccionada===]   <-- borde azul

Barra flotante (aparece con seleccion):
  "2 tareas seleccionadas"  [Ocultar]  [Cancelar]
```

## Dialogo "Ver ocultos"

Lista simple con nombre de tarea, flujo al que pertenece, y boton "Hacer visible" por cada una. Tambien un boton "Restaurar todas".
