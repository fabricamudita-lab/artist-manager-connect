

## Diagnóstico

En el screenshot se ve que el comentario "Comentario de prueba" está sobre el texto de la cláusula **1.1** ("a. Título de la obra Grabación: fruityloopin..."), pero NO aparece el resaltado amarillo en el documento.

La implementación actual solo aplicó `highlightText` a los bloques **"Reunidos"** y **"Manifiestan"**, pero NO a las **cláusulas numeradas** (1.1, 1.2, etc.) que es donde el usuario está comentando.

Necesito explorar `ContractDraftView.tsx` para confirmar dónde se renderizan las cláusulas y aplicar la misma función `highlightText` ahí.

## Plan

### Cambio único en `src/pages/ContractDraftView.tsx`

1. Localizar el render de las cláusulas numeradas (probablemente un `.map()` sobre `clauses_data` que pinta el contenido de cada cláusula).
2. Envolver el texto de cada cláusula con `highlightText(clause.content, comments, onCommentClick)` igual que ya se hace con "Reunidos" y "Manifiestan".
3. Asegurar que el filtro de comentarios por `clause_number` (o por contenido, según cómo esté implementada la función actual) coincida con el identificador de cada cláusula renderizada.
4. Si las cláusulas contienen sub-elementos (a, b, c, d...) renderizados como lista, aplicar el highlight a cada item de texto individualmente.

### Verificación
- Confirmar que el `selected_text` guardado en el comentario existe textualmente en el contenido de la cláusula renderizada (sin diferencias de espacios/saltos).
- Si hay desajuste por whitespace, normalizar ambos lados antes del `indexOf`.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/pages/ContractDraftView.tsx` | Aplicar `highlightText` también al render de cláusulas numeradas (no solo Reunidos/Manifiestan) |

