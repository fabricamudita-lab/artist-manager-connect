# Reordenar nombres en Créditos y Autoría

## Diagnóstico

El icono de "agarre" (⠿) aparece junto a cada nombre, pero **el drag & drop no está conectado**. Hay dos problemas:

1. **`PersonRow` no es arrastrable.** Muestra el `GripVertical`, pero no usa `useSortable`, así que dnd-kit no escucha eventos sobre la fila. De hecho, el contenedor del icono lleva `onClick={(e) => e.stopPropagation()}`, lo que bloquea cualquier interacción.
2. **Los IDs del `SortableContext` no coinciden con lo que se renderiza.** Después de agrupar créditos por persona (una persona con dos roles = una sola fila), el contexto recibe IDs de créditos individuales en vez de claves de grupo.

Resultado: aunque el cursor cambia a "grab", arrastrar no produce ningún efecto.

## Cambios propuestos

Archivo: `src/pages/release-sections/ReleaseCreditos.tsx`

1. **Hacer `PersonRow` sortable**
   - Usar `useSortable({ id: group.key })` dentro del componente.
   - Aplicar `setNodeRef`, `style` (transform/transition) al contenedor de la fila.
   - Mover `attributes` + `listeners` al div del `GripVertical` (handle dedicado), quitando el `stopPropagation` actual.

2. **Alinear `SortableContext` con los grupos por categoría**
   - En lugar de un único contexto con todos los `credit.id`, envolver cada categoría en su propio `SortableContext` con `items={catGroups.map(g => g.key)}`. Así sólo se reordena dentro de la misma sección (Compositor, Autoría, etc.), que es el comportamiento esperado.

3. **Reescribir `handleDragEnd` para grupos**
   - Recibir `active.id` y `over.id` como `group.key`.
   - Detectar la categoría afectada, reordenar `catGroups` con `arrayMove`.
   - Recalcular `sort_order` de **todos los créditos de cada grupo** según el nuevo orden de personas (asignando bloques consecutivos para mantener juntos los roles de una misma persona).
   - Persistir con `update` por cada `track_credits.id` afectado e invalidar la query.

4. **Feedback visual mínimo**
   - Aplicar opacidad/elevación a la fila mientras `isDragging` para que se note el arrastre.

## Resultado esperado

- Arrastrando el icono ⠿ se puede reordenar libremente cada persona dentro de su categoría (Compositor / Autoría / Producción / Intérprete / Contribuidor).
- El nuevo orden persiste tras recargar.
- Los roles múltiples de una misma persona se mantienen agrupados.
