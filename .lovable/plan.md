

## Plan: Que el link público refleje el tipo de contrato (single / album / fullAlbum) y el idioma

### Diagnóstico

El generador `IPLicenseGenerator` ya soporta los 3 tipos (`single`, `album`, `fullAlbum`) e idioma (`es`/`en`), pero al guardar el borrador:

- No se persiste `recording_type` ni `language` en `contract_drafts`.
- `clauses_data` puede guardar las cláusulas resueltas, pero el viewer público (`ContractDraftView.tsx`) tiene **hardcodeado** un `DEFAULT_IP_CLAUSES` en castellano + un layout de subitems a-f de la variante `single/album`. Nunca renderiza inglés ni el bloque a-g + Anexo I del `fullAlbum`.

Resultado actual: el colaborador siempre ve el contrato en castellano y como single/album-track aunque el generador haya producido un fullAlbum o un EN.

### Cambios

**1. Migración (schema)**

Añadir 2 columnas a `contract_drafts` (no rompen RLS existente, todas con default seguro):

```sql
ALTER TABLE public.contract_drafts
  ADD COLUMN recording_type text NOT NULL DEFAULT 'single'
    CHECK (recording_type IN ('single','album','fullAlbum')),
  ADD COLUMN language text NOT NULL DEFAULT 'es'
    CHECK (language IN ('es','en'));

-- Índices para filtros frecuentes (listados por tipo/idioma + por release)
CREATE INDEX IF NOT EXISTS idx_contract_drafts_recording_type ON public.contract_drafts(recording_type);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_language      ON public.contract_drafts(language);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_release_id    ON public.contract_drafts(release_id);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_share_token   ON public.contract_drafts(share_token);
```

CHECK constraints son admisibles aquí (valores estáticos, inmutables — no dependen de `now()`). RLS no se toca: el viewer público usa el hook existente `usePublicDraft` con `share_token` (consulta `eq('share_token', token).single()`) y no requiere auth.

**2. Tipos y hook (`src/hooks/useContractDrafts.ts`)**

- Ampliar `ContractDraft` con `recording_type: 'single'|'album'|'fullAlbum'` y `language: 'es'|'en'`.
- En `saveDraft`: aceptar `recordingType` y `language` y persistirlos.
- En `updateDraft`: permitir actualizarlos.

**3. Guardado desde el generador (`src/components/IPLicenseGenerator.tsx`)**

- En `handleSaveDraft`, pasar `recordingType` y `language` al `saveDraft` / `updateDraft`. Sin más cambios de UX (los selectores ya existen).

**4. Viewer público (`src/pages/ContractDraftView.tsx`) — núcleo del fix**

- Leer `draft.recording_type` y `draft.language`.
- Eliminar el `DEFAULT_IP_CLAUSES` hardcodeado y obtenerlas vía `getDefaultIPClauses(language, recordingType)` (importado de `src/lib/contracts/ipLicenseTemplates.ts`).
- `renderIPLicenseContent` se separa en 3 sub-renderers que comparten utilidades:
  - `renderIPLicenseSingleAlbum(formData, clauses, recordingType, language, ...)` — el actual, parametrizando textos fijos (REUNIDOS, MANIFIESTAN, CLÁUSULAS, encabezados, sub-items a-f, "La PRODUCTORA / La COLABORADORA", etc.) usando `getPDFLabels(language)` o un nuevo objeto de labels UI (`getViewerLabels(language)`).
  - `renderIPLicenseFullAlbum(...)` — usa el bloque a-g de la cláusula 1.1 + secciones de Manifiesto II/IV específicas de fullAlbum + render del **Anexo I** con la lista numerada de `formData.album_tracks` y la frase de cierre legal.
- Cabeceras y títulos dinámicos por idioma (título principal, "REUNIDOS"/"PARTIES", etc.), reutilizando los strings ya definidos en `ipLicenseTemplates.ts` (`getPDFLabels`) y, donde falten, añadiéndolos al mismo módulo (centralizar i18n en una sola fuente).
- El sistema de resaltado en amarillo (`ClauseParagraph` + `selectionComments`) sigue intacto: solo cambian los textos que recibe.

**5. Validación y robustez (backend lógico en cliente)**

- Esquema Zod compartido (`src/lib/validation/contractDraft.ts`) para los inputs de `saveDraft`/`updateDraft` (`recordingType`, `language`, longitudes máximas de `title`, emails). Se valida antes del insert/update; los errores se muestran con `toast`.
- En el viewer: si `recording_type`/`language` vienen ausentes (borradores antiguos) → fallback a `'single'`/`'es'`. Sin romper nada existente.
- Sanitización: el contenido se renderiza siempre como texto React (nunca `dangerouslySetInnerHTML`), evitando XSS. Los inputs `selected_text`, `proposed_change`, `message` ya pasan por React text nodes.
- SQL: todas las consultas usan supabase-js parametrizado; sin SQL crudo. La nueva migración usa CHECK con valores literales, no acepta input de usuario.

**6. Paginación de comentarios (escalabilidad del viewer)**

- En `usePublicDraft.fetchComments`: añadir `.range(0, PAGE_SIZE-1)` con `PAGE_SIZE = 100` y `count: 'exact'`. Exponer `loadMoreComments()` que incrementa el rango. Realtime sigue conectado para nuevos.
- El viewer no cambia de UX salvo un botón discreto "Cargar más comentarios" si `total > loaded`.

**7. Separación lógica de negocio / UI**

- Mover toda la lógica de "qué cláusulas y labels corresponden" a `src/lib/contracts/ipLicenseTemplates.ts` (ya existe). El viewer solo consume.
- Crear `src/lib/contracts/draftSchema.ts` (Zod) reutilizable por generador y futuras edge functions.

**8. Compatibilidad con auth / panel**

- El viewer público no usa auth (token); solo lectura del draft + escritura de comentarios. Los nuevos campos no afectan a las RLS porque ya se consulta por `share_token`. El `useAuth` se sigue usando solo para detectar `isOwner`. Sin tocar `auth_role_bindings`, `workspace_memberships` ni nada del panel autenticado.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Migración SQL | +2 columnas + 4 índices + CHECKs |
| `src/integrations/supabase/types.ts` | Auto-regenerado tras migración (no se edita manualmente) |
| `src/hooks/useContractDrafts.ts` | Tipos + persistencia de `recording_type` y `language`, paginación de comentarios |
| `src/components/IPLicenseGenerator.tsx` | Pasar `recordingType` y `language` a `saveDraft`/`updateDraft` |
| `src/pages/ContractDraftView.tsx` | Render dinámico por tipo+idioma, eliminar default hardcoded, añadir Anexo I para fullAlbum, fallback a single/es |
| `src/lib/contracts/ipLicenseTemplates.ts` | Añadir labels UI ES/EN faltantes (encabezados secciones, "La PRODUCTORA"/"The PRODUCER", etc.) |
| `src/lib/contracts/draftSchema.ts` (nuevo) | Esquema Zod para validación cliente |

### Comportamiento resultante

- Generador EN + fullAlbum → link público muestra contrato en inglés con bloque a-g, Manifiesto II/IV en EN y Anexo I al final con los tracks listados.
- Generador ES + album track → link público idéntico al actual.
- Borradores antiguos sin las nuevas columnas → fallback transparente a `single` + `es`.
- Resaltado amarillo de comentarios activos sigue funcionando para los 3 tipos y ambos idiomas.

