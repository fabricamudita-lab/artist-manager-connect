

## Plan: Resaltar texto comentado en amarillo en el link público del contrato

### Diagnóstico
En `/contract-draft/:token` los comentarios se crean con `selection_start`, `selection_end` y `clause_number` (vía `TextSelectionHandler`). El panel lateral muestra el snippet, pero el texto en el documento NO se resalta. Necesitamos pintar un `<mark>` amarillo sobre los rangos de comentarios activos (no resueltos).

### Exploración necesaria al implementar
- `src/pages/ContractDraftView.tsx`: ver cómo se renderizan las cláusulas y el contenido (clauses_data + manifiestos), y dónde se cargan los comentarios.
- Confirmar estructura de `contract_comments` (campos: `clause_number`, `selection_start`, `selection_end`, `status`).
- Reutilizar lógica de offsets ya empleada en `TextSelectionHandler` (offset relativo al `textContent` del contenedor de la cláusula, identificado por `data-clause`).

### Cambios

**1. Nuevo helper `src/components/contract-drafts/HighlightedText.tsx`**
- Recibe `text: string`, `ranges: Array<{ start: number; end: number; commentId: string; status: string }>`.
- Fusiona/ordena rangos solapados y devuelve fragmentos `<span>` planos + `<mark data-comment-id="...">` con clase `bg-yellow-200/70 dark:bg-yellow-500/30 rounded-sm cursor-pointer`.
- Al hacer click sobre un `<mark>`, dispara callback `onCommentClick(commentId)` para abrir/scrollear ese comentario en el panel.
- Solo resaltamos comentarios con `status !== 'resolved'` (o configurable).

**2. `ContractDraftView.tsx`**
- Agrupar `comments` por `clause_number` en un `useMemo`.
- En el render de cada cláusula/sección que tiene `data-clause="X"`, envolver su texto plano con `<HighlightedText text={...} ranges={byClause[X] ?? []} onCommentClick={...} />` en lugar de imprimir el string directamente.
- Para el bloque "Reunidos" (clause `reunidos` en el screenshot), aplicar lo mismo.
- `onCommentClick` → setState `activeCommentId` y scroll al item del panel lateral (con la clase ring ya existente del sistema de highlight).

**3. Estilo**
- Tailwind: `bg-yellow-200/70 hover:bg-yellow-300/80 dark:bg-yellow-500/30 px-0.5 rounded-sm transition-colors`.
- Comentarios resueltos: sin marca (o marca tenue gris si el usuario lo prefiere — por ahora ocultar).

### Edge cases
- Rangos solapados de varios comentarios → fusionar y aplicar `data-comment-ids` múltiples; click abre el primero.
- Offsets fuera de rango (texto cambió) → ignorar silenciosamente con `clamp(0, text.length)`.
- Cláusulas que ya contienen markup (negritas, etc.): aplicar el highlight sobre los nodos de texto preservando los `<strong>` existentes — primera versión asumimos texto plano por cláusula; si encontramos JSX más complejo, ampliamos el helper para recorrer hijos.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/components/contract-drafts/HighlightedText.tsx` (nuevo) | Helper que envuelve rangos en `<mark>` amarillo |
| `src/pages/ContractDraftView.tsx` | Agrupar comentarios por cláusula y aplicar `HighlightedText` en cada bloque renderizado |

