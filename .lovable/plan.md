
Objetivo: corregir definitivamente la visualización de subtareas en el cronograma y eliminar el espacio en blanco inicial, manteniendo el drag & drop para reordenar arriba/abajo.

Resumen de hallazgos (según el estado actual):
1) En `SortableSubtaskRow` se está renderizando un `<button>` directamente dentro de `<tr>`, lo cual es HTML inválido en tablas y puede provocar render extraño/alineaciones incorrectas.
2) Las subtareas tienen varias sangrías acumuladas (`pl-8`, `ml-8`, `ml-6`) que generan demasiado espacio al inicio.
3) En el mapeo de subtareas faltan `key` explícitas en `SortableSubtaskRow`, lo cual puede producir render inconsistente al reordenar.

Implementación propuesta:

1. Corregir estructura HTML de filas de subtareas (prioridad alta)
- Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`
- Ajustar `SortableSubtaskRow` para que no inserte elementos inválidos en el `<tr>`.
- Mantener el `<TableRow>` limpio y pasar los props de drag handle (`attributes`, `listeners`) a un handle que viva dentro de la primera celda válida (`<TableCell>`), no como hijo directo de `<tr>`.

2. Reubicar el drag handle sin crear hueco visual
- Para cada tipo de subtarea (`note`, `comment`, `checkbox`, `full`), colocar el handle dentro del primer bloque de contenido de la primera celda.
- El handle seguirá siendo visible en hover y usable para arrastrar, pero sin “columna fantasma” ni desplazamiento lateral artificial.

3. Eliminar el espacio blanco inicial en subtareas
- Reducir/eliminar sangrías actuales:
  - `pl-8` en contenedores de subtareas.
  - `ml-6` en textarea/hilos y `ml-8` en “Añadir elemento”.
- Sustituir por espaciado mínimo consistente (p. ej. `pl-1`/`pl-2` solo si hace falta para respirar visualmente).
- Resultado esperado: el contenido empieza alineado con la columna “Tarea”, sin bloque vacío a la izquierda.

4. Estabilizar render al reordenar
- Añadir `key={subtask.id}` en cada `SortableSubtaskRow` dentro del `map`.
- Mantener `items={subtaskList.map(s => s.id)}` como está para compatibilidad con dnd-kit.

5. Validación funcional y visual
- Confirmar que:
  - Las subtareas ya no se “corren” horizontalmente.
  - No hay espacio en blanco grande al principio.
  - El reordenamiento por arrastre sigue funcionando.
  - Inputs/selectores de subtarea siguen editables sin arrastres accidentales.
- Revisar los 4 tipos de subtarea (completa, checkbox, nota, comentario).

Archivos a tocar:
- `src/pages/release-sections/ReleaseCronograma.tsx` (único archivo necesario para este fix).

Criterios de aceptación:
- Subtareas visualmente alineadas bajo “Tarea”.
- Sin hueco inicial excesivo.
- Drag & drop de subtareas funcionando.
- Sin regresiones en edición (responsable, estado, fechas, borrado, comentarios/notas).
