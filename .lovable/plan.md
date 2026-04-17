

## Plan: Resaltar en amarillo el texto seleccionado mientras el comentario está activo

### Contexto

En el visor de borradores de contratos (`/releases/:id/contratos`), al seleccionar texto aparece el panel "Comentar selección" (visible en la captura). Actualmente la selección nativa del navegador desaparece en cuanto el usuario hace click en el textarea para escribir el comentario, perdiendo la referencia visual del fragmento que está comentando.

El usuario quiere que ese fragmento quede **resaltado en amarillo** desde que se selecciona y mientras el comentario esté "activo" (sin enviar / sin resolver).

### Exploración pendiente

Necesito identificar:
1. El componente que renderiza el panel "Comentar selección (§ manifiestan-III)" — probablemente vive cerca de `TextSelectionHandler.tsx` (visto en el contexto inicial) y de la vista de borrador de contrato.
2. Cómo se almacena el rango seleccionado (`selectionStart`/`selectionEnd` + `clauseNumber` ya existen en `TextSelection`).
3. Dónde se renderiza el contenido del contrato para inyectar un `<mark>` envolviendo el rango activo.
4. El estado de comentarios pendientes vs resueltos (probablemente tabla `contract_draft_comments` con campo `resolved` o similar).

Buscaré: `TextSelectionHandler`, `contract_draft_comments`, archivos en `src/components/contract-drafts/`, vista del borrador.

### Cambios previstos

**1. Mantener visible el rango activo (selección en curso, aún sin enviar)**
- En el componente que muestra el panel de comentar, además de guardar `currentSelection`, envolver el rango `[selectionStart, selectionEnd]` dentro de la cláusula correspondiente con un `<mark className="bg-yellow-200">`.
- Implementación: en el render del contenido por cláusula, partir el texto en 3 trozos (antes / seleccionado / después) usando los offsets relativos a la cláusula. Aplicar solo a la cláusula con `data-clause === clauseNumber` activo.

**2. Resaltar también los comentarios "activos" (no resueltos)**
- Para cada comentario con `resolved = false` (o equivalente), aplicar el mismo wrap con `<mark>` amarillo en su rango.
- Comentarios resueltos: sin resaltado (o resaltado más tenue / sin color).

**3. Limpiar al cerrar / enviar / resolver**
- Al pulsar la "X" del panel, al enviar el comentario (pasa a la lista de comentarios activos), o al marcar como resuelto: actualizar el estado y el resaltado se recalcula automáticamente desde la fuente de datos.

**4. Estilo**
- Tailwind: `bg-yellow-200 dark:bg-yellow-900/40 rounded-sm px-0.5` para selección en curso.
- Para comentarios ya enviados pero no resueltos: mismo amarillo (consistencia con la petición).

### Archivos previsibles

| Archivo | Cambio |
|---|---|
| Componente visor del borrador (a localizar, probablemente `src/components/contract-drafts/DraftViewer.tsx` o similar) | Función `renderClauseContent` que envuelve rangos activos en `<mark>` |
| `TextSelectionHandler.tsx` | Posible exposición del rango activo al padre para pintarlo (ya lo expone vía `onTextSelected`) — sin cambios o ajuste menor |
| Hook/estado de comentarios | Filtrar comentarios no resueltos para alimentar los rangos resaltados |

Sin cambios de schema ni migraciones (los campos `selection_start`, `selection_end`, `clause_number` y estado de resolución ya existen según la arquitectura de borradores).

### Riesgos

- Solapamiento de rangos (varios comentarios sobre texto que se cruza): aplicar los `<mark>` en orden y partir el texto progresivamente; en caso de solape simple se sigue viendo amarillo.
- Pérdida de selección nativa al hacer click en textarea: ya no importa, el `<mark>` la sustituye visualmente.

