

## Plan: Corregir 3 problemas del sistema de negociacion

### Problema 1: Resaltado amarillo del texto seleccionado

**Estado actual**: `ClauseParagraph` solo muestra un emoji 💬 al lado del parrafo, pero no resalta el texto seleccionado en amarillo dentro del parrafo.

**Solucion**: Modificar `ClauseParagraph` para que busque dentro del texto los fragmentos seleccionados por comentarios y los envuelva en `<span>` con fondo amarillo. Usar `dangerouslySetInnerHTML` o split/map del texto para insertar los highlights inline.

- En `ClauseParagraph`, recibir los comentarios completos (con `id` y `selected_text`)
- Partir el texto en fragmentos: texto normal + texto resaltado
- Renderizar cada fragmento resaltado con `background: #FFF9C4`, cursor pointer, y un `onClick` que haga scroll al comentario en el sidebar

**Archivo**: `src/pages/ContractDraftView.tsx` — reescribir `ClauseParagraph`

### Problema 2: Mostrar estado de aprobaciones en sidebar

**Estado actual**: `DraftCommentsSidebar.tsx` ya tiene la seccion de propuesta de cambio (lineas ~170-200) con los checkmarks de productor/colaborador, pero falta claridad visual.

**Solucion**: Revisar y mejorar la seccion existente en el sidebar para que muestre claramente:
- Texto original tachado vs texto propuesto en verde
- Estado explicito: "✅ Aprobado por: Productora" / "⏳ Pendiente: Colaborador/a"
- Ya existe parcialmente — verificar que se renderiza correctamente para estados `pending_approval` Y `proposing_change`

**Archivo**: `src/components/contract-drafts/DraftCommentsSidebar.tsx` — ajustar la seccion de propuestas

### Problema 3: Sistema de identificacion de usuarios

**Cambios de DB**: Añadir `producer_email` y `collaborator_email` a `contract_drafts` para poder determinar el rol del visitante.

```sql
ALTER TABLE contract_drafts
  ADD COLUMN IF NOT EXISTS producer_email TEXT,
  ADD COLUMN IF NOT EXISTS collaborator_email TEXT;
```

**Frontend**: En `ContractDraftView.tsx`:
- Al cargar, comprobar `localStorage` para identidad guardada
- Si no existe, mostrar modal pidiendo nombre + email
- Determinar rol comparando email con `draft.producer_email` / `draft.collaborator_email`
- Pasar el rol al sidebar para que los botones "Aprobar" usen el rol correcto
- El `defaultAuthorName` se saca de la identidad guardada

**Guardar emails al crear draft**: Modificar `IPLicenseGenerator` para que al crear el draft guarde `producer_email` y `collaborator_email` desde `form_data`.

### Archivos a modificar
1. **Migration SQL** — añadir columnas `producer_email`, `collaborator_email`
2. **`src/pages/ContractDraftView.tsx`** — reescribir `ClauseParagraph` con highlights inline + modal de identidad + logica de rol
3. **`src/components/contract-drafts/DraftCommentsSidebar.tsx`** — mejoras visuales en seccion de aprobaciones
4. **`src/hooks/useContractDrafts.ts`** — añadir campos email al tipo `ContractDraft`
5. **Generador IP License** — guardar emails al crear draft

### Resultado
- Texto seleccionado aparece resaltado en amarillo en el documento
- Click en texto resaltado navega al comentario en sidebar
- Estado de aprobaciones muestra claramente quien aprobo y quien falta
- Cada visitante se identifica con nombre+email, el sistema determina su rol automaticamente

