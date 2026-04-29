
## Problema

En el panel **Comentarios** del contrato los comentarios aparecen ordenados por fecha (más nuevo arriba). En la captura, "§ 2.1" se muestra antes que "§ Manifiestan-I", aunque "Manifiestan" aparece antes en el documento. Esto rompe la coherencia: al recorrer los comentarios no sigues el flujo del contrato.

## Causa

En `src/components/contract-drafts/DraftCommentsSidebar.tsx`:

- `rootComments` (línea 72) hereda el orden tal como llega de Supabase y no se reordena.
- El agrupador `grouped` (línea 102-110) ordena las **claves de cláusula alfabéticamente** con `localeCompare` numérico, así que cualquier sección con prefijo no numérico ("manifiestan-I") queda detrás de "2.1".
- Cuando el usuario aplica un filtro distinto a "Todos" (Abiertos/Pendientes/Resueltos), se renderiza la lista plana sin grupos (línea 350) y tampoco se ordena.

## Solución

Ordenar siempre por **posición real en el documento** usando `selection_start` (campo `integer` ya existente en `contract_draft_comments` que indica el offset del rango seleccionado). Cascada de criterios:

1. `selection_start` ascendente.
2. Si falta, `clause_number` con `localeCompare` numérico.
3. Si empata, `created_at` ascendente.

Aplicarlo en dos sitios de `DraftCommentsSidebar.tsx`:

### a) Lista plana de raíces

Reemplazar `rootComments`/`getReplies` por versiones que clonen y ordenen:
- `rootComments` → ordenado con `compareByDocPosition`.
- `getReplies` → ordenado por `created_at` ascendente (las respuestas son una conversación, ahí sí tiene sentido cronológico).

### b) Agrupado por cláusula

En `grouped` (vista "Todos"):
- Construir un `Map<clave, primera_posición>` con el `selection_start` mínimo de cada grupo.
- Ordenar los grupos por esa posición (no alfabéticamente).
- Ordenar también el contenido interno de cada grupo con `compareByDocPosition` para mantener consistencia entre comentarios de la misma cláusula con offsets distintos.

## Resultado esperado

- "§ Manifiestan-I" aparece antes que "§ 2.1" porque su `selection_start` es menor.
- Dentro de cada cláusula, los comentarios siguen el orden del texto.
- Los filtros Abiertos/Pendientes/Resueltos también respetan el orden del documento.
- Las respuestas (replies) siguen mostrándose en orden cronológico dentro de su hilo.

## Archivos a modificar

- `src/components/contract-drafts/DraftCommentsSidebar.tsx` (líneas 72-73 y 101-110).

Sin migraciones de BD ni cambios en el hook de carga: `useContractDrafts.fetchComments` ya devuelve `selection_start` y `clause_number`.
