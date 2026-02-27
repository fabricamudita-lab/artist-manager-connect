

## Mejoras UI para anclas, bloqueo y dependencias en el Cronograma

### 1. Tooltip explicativo en "Anclada a" (ya resuelto)

El componente `MultiAnchorSelector` ya soporta multiples anclas con un badge que muestra el conteo y un popover interactivo para anadir/quitar. No se requieren cambios en esta funcionalidad -- ya funciona como multi-select.

**Mejora adicional**: Anadir un tooltip al badge del trigger que muestre los nombres de las tareas ancladas al hacer hover, sin necesidad de abrir el popover.

**Archivo**: `src/components/lanzamientos/MultiAnchorSelector.tsx`
- Envolver el `PopoverTrigger` en un `Tooltip` que muestre los nombres de las tareas ancladas (usando `getTaskName`) cuando `value.length >= 1`.

### 2. Indicador visual de "bloqueada" (icono candado)

Cuando una tarea tiene `anchoredTo` configurado y al menos una de sus tareas predecesoras tiene estado `pendiente` o `en_proceso`, mostrar un icono de candado gris junto al nombre de la tarea en la vista Lista.

**Archivo**: `src/pages/release-sections/ReleaseCronograma.tsx`
- Crear una funcion helper `isTaskBlocked(task, allTasks)` que recorra `task.anchoredTo`, busque cada tarea predecesora en todos los workflows, y devuelva `true` si alguna tiene status distinto de `completado`.
- En la celda del nombre de la tarea (linea ~413), anadir condicionalmente un icono `Lock` de lucide-react en gris despues del nombre cuando `isTaskBlocked` sea verdadero.
- Envolver el icono en un `Tooltip` con texto "Bloqueada: esperando tareas predecesoras".

### 3. Lineas de dependencia en el Gantt

Dibujar lineas punteadas SVG entre barras ancladas en la vista Gantt para visualizar las dependencias.

**Archivo**: `src/components/lanzamientos/GanttChart.tsx`
- Despues de renderizar todas las barras de tareas dentro de cada workflow (linea ~735), anadir un contenedor SVG overlay con `position: absolute` que cubra todo el area del Gantt.
- Para cada tarea con `anchoredTo`, calcular:
  - La posicion X del final de la barra predecesora (usando `getBarPosition`)
  - La posicion X del inicio de la barra dependiente
  - La posicion Y de ambas barras (basada en el indice de la tarea en la lista)
- Dibujar una linea SVG `<path>` punteada gris (`stroke-dasharray`) desde el punto final de la predecesora hasta el punto inicial de la dependiente.
- Usar un enfoque simplificado: un `<svg>` overlay absoluto sobre el area de barras, con lineas calculadas a partir de porcentajes.

**Implementacion tecnica**:
- Recopilar las posiciones de las barras durante el renderizado usando un Map de `taskId -> { left%, top (row index) }`
- Renderizar las lineas como `<line>` o `<path>` SVG con `stroke: gray`, `stroke-dasharray: 4 4`, `stroke-width: 1`
- Las lineas solo se renderizan entre tareas visibles del mismo workflow expandido (para simplificar, se pueden dibujar tambien entre workflows usando coordenadas globales)

### 4. Alerta de riesgo de fabricacion

Detectar cuando el workflow de fabricacion tiene la tarea "Envio a Fabrica" sin fecha asignada y la fecha de salida digital (`release_date`) esta a menos de 10 semanas.

**Archivo**: `src/pages/release-sections/ReleaseCronograma.tsx`
- Crear un `useMemo` que:
  1. Busque el workflow `fabricacion`
  2. Busque una tarea cuyo nombre contenga "Envio a Fabrica" o cuyo id contenga "fab-envio" o "fab-1"
  3. Verifique si `startDate` es null
  4. Verifique si `release?.release_date` existe y esta a menos de 70 dias (10 semanas)
  5. Devuelva un objeto `{ show: boolean }` cuando ambas condiciones se cumplan
- Renderizar un `Alert` con variante `destructive` justo despues del progress bar (linea ~2239), antes del contenido de vista:
```
El proceso de fabricacion fisica requiere minimo 8-10 semanas.
Revisa las fechas de Envio a Fabrica.
```
- Usar el componente `Alert` + `AlertDescription` existente con un icono `AlertTriangle`.

### Resumen de archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/lanzamientos/MultiAnchorSelector.tsx` | Anadir tooltip con nombres de anclas al trigger |
| `src/pages/release-sections/ReleaseCronograma.tsx` | Icono candado en tareas bloqueadas + alerta fabricacion |
| `src/components/lanzamientos/GanttChart.tsx` | Lineas de dependencia SVG entre barras ancladas |

### Lo que NO se toca
- `handleTaskDateUpdate`, `getFullDependencyChain`, `AnchorDependencyDialog`
- IDs, `estimatedDays`, orden de tareas
- Solo se anaden elementos UI informativos

