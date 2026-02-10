
# Reordenar flujos del cronograma con drag-and-drop

## Que cambia

Los flujos (Flujo de Audio, Flujo Visual y Arte, etc.) se podran arrastrar arriba y abajo para cambiar su orden, tanto en la vista Lista como en el Gantt. El orden se persiste en `localStorage` para que se mantenga entre sesiones.

## Como funciona

- Cada flujo (Card) tendra un icono de "agarre" (GripVertical) a la izquierda del nombre
- Al arrastrar un flujo, este se eleva visualmente y los demas se desplazan para indicar donde se soltara
- Al soltar, el nuevo orden se aplica al estado `workflows` y se guarda en `localStorage`

## Detalle tecnico

### Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`

1. **Importar** `DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors` de `@dnd-kit/core` y `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `arrayMove` de `@dnd-kit/sortable`
2. **Importar** `GripVertical` de `lucide-react`
3. **Crear componente interno** `SortableWorkflowCard` que envuelve cada Card de flujo con `useSortable` y anade el handle de arrastre (icono GripVertical) en el header
4. **Envolver** la lista de workflows en `DndContext` + `SortableContext` con `verticalListSortingStrategy`
5. **Manejar** `onDragEnd`: reordenar el array `workflows` usando `arrayMove` y guardar el orden de IDs en `localStorage` con clave `workflow_order_{releaseId}`
6. **Cargar** el orden guardado al montar: reordenar `EMPTY_WORKFLOWS` segun el orden almacenado en `localStorage`
7. **Aplicar** el mismo orden en la vista Gantt (ya que `workflowsWithTasks` deriva de `workflows`, el orden se propaga automaticamente)

### Sin cambios en base de datos

El orden se guarda solo en `localStorage` (patron ya usado para `hiddenTaskIds`), sin necesidad de migrar la tabla.
