

## Diagnóstico

En el screenshot:
- ✅ Comentario §1.2 "test" → resaltado (es texto largo, está en el bloque principal de la cláusula 1.2).
- ❌ Comentario §2.1 "test 2" sobre `": El Universo."` → NO resaltado. El texto está en el sub-item `b. TERRITORIO: El Universo.` que NO pasa por `highlightText`.
- ❌ Otro comentario también sin resaltar, probablemente sobre otro sub-item (a. PERIODO / c. MEDIOS) de la sección 2.1.

**Causa raíz**: En la última iteración apliqué `highlightText` a algunos sub-items dinámicos de 1.1, 2.1, 2.3 y 4.1, pero la sección **2.1 tiene sub-items estáticos** (`a. PERIODO: A perpetuidad`, `b. TERRITORIO: El Universo`, `c. MEDIOS: ...`) cuyo texto plano NO está envuelto en `highlightText`. Lo mismo puede pasar en otras secciones con texto fijo (3, 5, 6, 7, etc.).

La solución parcial actual no escala. Hay que aplicar `highlightText` de forma **sistemática** a TODO el contenido textual del documento, no caso por caso.

## Plan

### Cambio en `src/pages/ContractDraftView.tsx`

1. **Auditar el render completo** del contrato (todas las cláusulas 1–14, sub-items a/b/c/d, párrafos de cierre, firmas, anexos).
2. Para cada nodo de texto plano renderizado dentro del documento, envolverlo con `highlightText(texto, selectionComments, onCommentClick)`.
   - Incluye: `L.subItemsAlcance.a/b/c`, textos largos de cláusulas 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, secciones de "Y para que conste...", lugar/fecha, etiquetas de firmantes.
   - También valores dinámicos sueltos (`s(d.xxx)`) que aún se imprimen directamente.
3. Para evitar repetir el patrón, considerar una mini-función local `H(text)` = `highlightText(text, selectionComments, onCommentClick)` y usarla en todos los puntos. Reduce ruido visual en el JSX.
4. Mantener intactos los `<strong>` de etiquetas (ej. `a. PERIODO:`) renderizándolos fuera de `H()`, y aplicar `H()` solo al valor/texto que sigue.

### Verificación
- Crear un comentario sobre cualquier sub-item estático (ej. "El Universo") y confirmar que se resalta.
- Repetir en cláusulas 3 y 5 para validar cobertura completa.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/pages/ContractDraftView.tsx` | Aplicar `highlightText` (vía helper local `H`) a TODO el texto renderizado del contrato, no solo bloques seleccionados |

