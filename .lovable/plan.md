
Objetivo
- Corregir el selector de roles en “Derechos de Autor (Publishing)” para que vuelva a ser usable en móvil: poder hacer scroll con el dedo y seleccionar cualquier opción.

Diagnóstico encontrado (basado en el código actual y el replay)
1) En `GroupedRoleSelect`, el listado está dentro de:
   - `ScrollArea className="max-h-[300px]" ...`
2) El `ScrollArea` custom (`src/components/ui/scroll-area.tsx`) renderiza su viewport con `className="h-full ... overflow-auto"`.
   - Con `max-h` (sin altura fija), ese `h-full` no siempre crea un contenedor scrolleable real; puede quedar “expandido” y el scroll interno no se activa correctamente.
3) Además, `ScrollArea` tiene `enableDragScroll=true` por defecto (modo “grab/grabbing”), y en el replay se ve ese estado activo dentro del dropdown, lo que puede interferir con interacción de selección en listas tipo Select.
4) El `onTouchMove={stopPropagation}` añadido en el último parche no resuelve la causa base y puede empeorar la interacción táctil en algunos casos.

Plan de implementación
1) Arreglo principal en `src/components/credits/GroupedRoleSelect.tsx`
- Cambiar el uso de `ScrollArea` para que tenga altura real scrolleable:
  - De `max-h-[300px]` a `h-[300px]` (o equivalente fijo coherente con UI).
- Desactivar drag-scroll en este caso concreto:
  - `enableDragScroll={false}` para evitar modo “grab” dentro de un menú de selección.
- Limpiar handlers táctiles no necesarios:
  - Quitar `onTouchMove={...stopPropagation...}` del `ScrollArea` en este selector.
- Mantener una experiencia estable:
  - Conservar `onWheel` solo si sigue aportando y no afecta selección; si hay conflicto, retirarlo también.

2) Hardening opcional (muy recomendado) en `src/components/ui/scroll-area.tsx`
- Evitar que el drag-scroll se active en superficies de selección/listbox:
  - ampliar exclusiones de `isInteractiveTarget` para elementos con roles tipo `option`, `listbox`, etc.
- Esto previene bugs similares en otros dropdowns que reutilicen `ScrollArea`.

3) Validación funcional (manual en preview)
- Caso Publishing en `/releases/:id/presupuestos`:
  - abrir “Derechos de Autor” > abrir selector de rol.
  - deslizar con dedo (móvil) y verificar que baja/sube toda la lista.
  - seleccionar varios roles distintos y confirmar que el valor cambia.
- Repetir en:
  - modo “añadir participante”
  - modo “editar participante”
  - también en Master para asegurar que no rompemos el otro flujo.
- Confirmar que:
  - no se abre/cierra accidentalmente al intentar scroll,
  - no se queda en estado “grab”,
  - no hay regresión visual.

Resultado esperado tras aplicar
- El dropdown de roles en Publishing vuelve a ser totalmente usable en touch:
  - scroll táctil fluido,
  - selección correcta de cualquier opción,
  - comportamiento consistente con el resto de la app.
