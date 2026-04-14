

## Plan: Sistema de Negociacion Colaborativa en Contratos

### Resumen
Añadir seleccion de texto inline, comentarios anclados a cláusulas, propuestas de cambio con aprobacion bilateral, y aplicacion automatica de cambios aprobados en la vista publica del borrador.

### Fase 1: Migracion de base de datos

Añadir columnas a `contract_draft_comments`:

```sql
ALTER TABLE contract_draft_comments
  ADD COLUMN selected_text TEXT,
  ADD COLUMN clause_number TEXT,
  ADD COLUMN selection_start INTEGER,
  ADD COLUMN selection_end INTEGER,
  ADD COLUMN proposed_change TEXT,
  ADD COLUMN comment_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN approved_by_producer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN approved_by_collaborator BOOLEAN NOT NULL DEFAULT false;
```

(Usamos `comment_status` en vez de `status` para evitar conflicto con `resolved`.)

### Fase 2: Componentes nuevos y modificados

**Nuevo: `TextSelectionHandler.tsx`**
- Wrappea el contenido del contrato en un `div` con `onMouseUp`
- Detecta `window.getSelection()`, extrae texto seleccionado
- Determina `clause_number` buscando el ancestro con `data-clause` mas cercano
- Calcula `selection_start`/`selection_end` relativo al contenido del contrato
- Emite callback `onTextSelected({ selectedText, clauseNumber, selectionStart, selectionEnd })`

**Nuevo: `InlineHighlights.tsx`**
- Recibe comentarios con `selected_text` y posiciones
- Renderiza resaltados amarillos (`#FFF9C4`) sobre el texto del contrato usando spans con `data-comment-id`
- Tooltip al hover: "Ver comentarios"
- Click: scroll al comentario en sidebar

**Reescribir: `DraftCommentsSidebar.tsx`**
- Añadir filtros: Todos / Abiertos / Pendientes / Resueltos
- Ordenar por posicion en documento o fecha
- Cada comentario con seleccion muestra:
  - Texto seleccionado citado
  - Badge de clausula (ej: "6.1")
  - Thread de respuestas
  - Boton "Proponer cambio" → abre campo de texto propuesto
  - Cuando hay `proposed_change`:
    - Texto original tachado
    - Texto propuesto en verde
    - Estado de aprobacion (checkmarks por parte)
    - Botones "Aprobar" / "Rechazar"
- Formulario inferior: se pre-rellena cuando viene de seleccion de texto

**Modificar: `ContractDraftView.tsx`**
- Envolver renderizado del contrato con `TextSelectionHandler`
- Añadir atributos `data-clause="1.1"` etc. a cada parrafo de clausula
- Banner de negociacion en la parte superior con contadores
- Logica de `applyApprovedChange`: cuando ambas aprobaciones son true, actualizar `clauses_data` del draft reemplazando el texto original por el propuesto
- Scroll bidireccional: click en sidebar → scroll a texto; click en highlight → scroll a comentario

**Modificar: `useContractDrafts.ts`**
- Extender `DraftComment` con los nuevos campos
- Nuevas funciones en `usePublicDraft`:
  - `addSelectionComment(data)`: inserta comentario con campos de seleccion
  - `proposeChange(commentId, proposedText)`: actualiza `proposed_change` y `comment_status`
  - `approveChange(commentId, role: 'producer'|'collaborator')`: marca aprobacion; si ambas → aplica cambio
  - `rejectChange(commentId)`: resetea propuesta
  - `applyChange(commentId)`: actualiza `clauses_data` del draft con el texto propuesto

### Fase 3: UX y animaciones

- Highlight pulsante temporal (2s) al navegar a un comentario
- Banner superior con: "DOCUMENTO EN NEGOCIACION" + contadores de comentarios abiertos/pendientes
- Bloqueo visual: si hay comentarios pendientes, no mostrar boton "Listo para firma"

### Archivos a crear
- `src/components/contract-drafts/TextSelectionHandler.tsx`
- `src/components/contract-drafts/InlineHighlights.tsx`

### Archivos a modificar
- `src/pages/ContractDraftView.tsx` — data-clause attrs, banner, highlight integration, apply logic
- `src/components/contract-drafts/DraftCommentsSidebar.tsx` — reescritura completa con filtros, propuestas, aprobaciones
- `src/hooks/useContractDrafts.ts` — nuevos campos y funciones

### Notas tecnicas
- La seleccion de texto se basa en posiciones de caracteres dentro del contenedor del contrato, no en el DOM HTML
- Los highlights se renderizan como spans wrapper alrededor del texto seleccionado usando `data-clause` como ancla
- La aplicacion de cambios modifica `clauses_data` (JSONB) en la tabla `contract_drafts`, no HTML directo
- Realtime ya esta habilitado para ambas tablas

