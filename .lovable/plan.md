

# Reordenar formatos arrastrando (drag-and-drop)

Actualmente los formatos del artista muestran un icono de arrastre (las 6 bolitas) pero no funciona: solo el crew dentro de cada formato es reordenable. Se implementara drag-and-drop a nivel de formato completo.

---

## Cambios en `src/components/ArtistFormatsDialog.tsx`

### 1. Crear un componente `SortableFormatCard`

Envolver cada `Collapsible` (tarjeta de formato) en un componente sortable usando `useSortable` de `@dnd-kit/sortable`. El drag handle sera el icono `GripVertical` que ya existe en el header de cada card.

Cada formato necesita un `id` estable para dnd-kit. Se usara `format.id || \`new-\${index}\`` como identificador unico.

### 2. Envolver la lista de formatos con DndContext + SortableContext

Alrededor del `div.space-y-4` que mapea los formatos (linea 652), agregar:
- `DndContext` con sensores (PointerSensor con distancia minima de 8px para no interferir con clics) y `closestCenter`
- `SortableContext` con `verticalListSortingStrategy`

### 3. Handler de reordenacion

Crear `handleFormatDragEnd` que use `arrayMove` para reordenar el array `formats` en el estado local. Como el guardado ya respeta el indice del array para `sort_order` (linea 420: `sort_order: idx`), el orden se persistira correctamente al guardar.

### 4. Separar sensors

Crear un segundo set de sensors para los formatos (distancia de activacion de 8px) separado del de crew members, para evitar conflictos entre los dos niveles de drag-and-drop anidados.

---

## Resumen tecnico

| Elemento | Detalle |
|---|---|
| Archivo | `src/components/ArtistFormatsDialog.tsx` |
| Nuevo componente interno | `SortableFormatCard` (wrap del Collapsible existente) |
| DnD wrapper | `DndContext` + `SortableContext` con `verticalListSortingStrategy` |
| IDs | `format.id \|\| \`temp-\${index}\`` |
| Persistencia | Ya funciona: `sort_order: idx` al guardar |
| Sensor | `PointerSensor` con `distance: 8` para no interferir con clic/expand |
