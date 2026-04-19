

## Plan: Click en comentario → scroll al texto resaltado en el documento

### Diagnóstico
Hoy el flujo inverso ya funciona: click en `<mark>` amarillo → scroll al comentario en el panel. Falta el flujo directo: click en una tarjeta de comentario del panel lateral → scroll al `<mark>` correspondiente en el documento + pulso visual.

### Exploración necesaria al implementar
- `src/pages/ContractDraftView.tsx`: localizar el panel lateral de comentarios (tarjetas "§ 2.1 / Abierto / test 2") y la función `highlightText` / `LabeledHighlight` para añadir un atributo `data-comment-id={cid}` al `<mark>` (si aún no lo tiene de forma consistente).
- Verificar si el componente del panel es inline o vive en `src/components/contract-drafts/*`.

### Cambios

**1. Marcar cada highlight con `data-comment-id`**
- En `highlightText` y `LabeledHighlight`, añadir `data-comment-id={comment.id}` al `<span>`/`<mark>` resaltado (además del `onClick` ya existente).

**2. Handler `scrollToHighlight(commentId)` en `ContractDraftView`**
```ts
const scrollToHighlight = (commentId: string) => {
  const el = document.querySelector<HTMLElement>(`[data-comment-id="${commentId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2', 'transition-all');
  setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2', 'transition-all'), 2500);
};
```

**3. Hacer clickable la tarjeta de comentario**
- En el render de cada tarjeta del panel lateral (la que muestra `§ 2.1`, snippet, autor, "test 2"), añadir `onClick={() => scrollToHighlight(comment.id)}` y `cursor-pointer` + `hover:bg-muted/50`.
- Evitar que botones internos (`Responder`, `Proponer cambio`, `Resolver`) propaguen el click: añadir `e.stopPropagation()` en sus handlers.

### Edge cases
- Comentario sin `<mark>` correspondiente (texto cambió y no se encontró match) → fallback: scroll a la cláusula `data-clause={clause_number}` si existe; si no, no hacer nada.
- Múltiples `<mark>` del mismo comentario → `querySelector` toma el primero, suficiente.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/pages/ContractDraftView.tsx` | Añadir `data-comment-id` en highlights, función `scrollToHighlight`, y `onClick` en tarjetas del panel de comentarios |

