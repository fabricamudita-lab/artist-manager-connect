
# Plan: Multi-Anclaje con Fechas Personalizables

## Estado: ✅ Completado

### Cambios realizados:
- [x] Cambiar `anchoredTo` de `string` a `string[]` en todas las interfaces
- [x] Crear componente `MultiAnchorSelector` para selección múltiple
- [x] Actualizar `GanttChart` para soportar múltiples anclas
- [x] Actualizar `ReleaseCronograma` con el nuevo selector
- [x] Actualizar `Lanzamientos.tsx` con el nuevo tipo
- [x] Actualizar `releaseTimelineTemplates.ts` con el nuevo tipo
- [x] Añadir campo `customStartDate` en las interfaces
- [x] Actualizar propagación para ignorar tareas con `customStartDate: true`

## Resumen

Se modificó el sistema de anclaje de tareas para permitir que una tarea pueda anclarse a **múltiples tareas padre**. Por defecto, la fecha de inicio se calcula automáticamente basándose en la fecha de vencimiento más tardía de las tareas padre, pero el usuario puede **sobrescribir manualmente** esta fecha en cualquier momento.

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/pages/release-sections/ReleaseCronograma.tsx` | Estructura de datos, UI de anclas, lógica de propagación |
| `src/components/lanzamientos/MultiAnchorSelector.tsx` | **NUEVO** - Selector multi-ancla con popover |
| `src/components/lanzamientos/GanttChart.tsx` | Soporte para `anchoredTo: string[]` |
| `src/lib/releaseTimelineTemplates.ts` | Actualizado tipo GeneratedTask |
| `src/pages/Lanzamientos.tsx` | Actualizado tipo ReleaseTask |

## Comportamiento

**Multi-anclas:**
- Las tareas pueden tener múltiples dependencias
- El selector muestra badges/chips con las anclas actuales
- Se pueden añadir/eliminar anclas individualmente

**Fecha personalizada:**
- Cuando el usuario cambia una fecha manualmente, la tarea no se mueve automáticamente cuando cambian las anclas padre
- Las tareas con `customStartDate: true` se excluyen del diálogo de propagación
