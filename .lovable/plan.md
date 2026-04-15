

## Plan: Reordenar participantes arrastrando en Publishing/Master splits

### Situación actual
- `track_credits` ya tiene columna `sort_order` en la base de datos
- `@dnd-kit/sortable` ya está instalado y se usa en 11+ componentes del proyecto
- `useTrackCredits` no ordena por `sort_order` — los resultados llegan sin orden definido
- El componente `SplitRow` no tiene handle de arrastre

### Cambios

**1. `src/hooks/useReleases.ts`** — Añadir `.order('sort_order')` a la query de `useTrackCredits` para que los créditos vengan ordenados

**2. `src/components/releases/TrackRightsSplitsManager.tsx`**:
- Importar `DndContext`, `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `arrayMove`, `CSS`, sensores
- Envolver la lista de splits en `DndContext` + `SortableContext`
- Crear un wrapper `SortableSplitRow` que use `useSortable` y añada un handle de arrastre (icono `GripVertical`) a la izquierda de cada fila
- En `handleDragEnd`: reordenar el array localmente con `arrayMove`, luego actualizar `sort_order` en batch para cada crédito afectado via `supabase.from('track_credits').update({ sort_order }).eq('id', id)`
- Deshabilitar drag cuando una fila está en modo edición

### Resultado
El usuario podrá arrastrar participantes arriba/abajo para cambiar su orden. El orden se persiste en `sort_order` y se refleja en el PDF del Split Sheet.

### Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useReleases.ts` | Añadir `.order('sort_order')` |
| `src/components/releases/TrackRightsSplitsManager.tsx` | DnD sortable con handle y persistencia |

