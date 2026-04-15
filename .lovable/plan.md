

## Plan: Mostrar borradores de contratos en Gestión de Documentos

### Problema
La página de Gestión de Documentos solo muestra registros de la tabla `documents`. Los contratos en modo borrador (tabla `contract_drafts`) no aparecen, por lo que el usuario no puede ver ni acceder a ellos desde esta vista centralizada.

### Solución
Hacer fetch de `contract_drafts` junto con `documents` y combinarlos en una lista unificada. Los borradores se mostrarán con un badge de estado (Borrador, En negociación, Listo para firma, Firmado) y al hacer clic abrirán la vista del borrador (`/contract-draft/:token`).

### Cambios en `src/pages/Documents.tsx`

1. **Fetch de `contract_drafts`**: En `fetchDocuments()`, hacer una segunda query a `contract_drafts` y mapear los resultados al mismo formato `Document[]`, usando campos sintéticos:
   - `title` → del draft
   - `category` → `'contract'`
   - `file_type` → `'draft'`
   - `file_size` → tamaño estimado del JSON
   - `file_url` → vacío (no hay archivo aún)
   - `created_at` → del draft
   - Campos extra: `draft_status`, `share_token`, `draft_type`

2. **Interfaz extendida**: Añadir campos opcionales a la interfaz `Document` para distinguir borradores:
   - `is_draft?: boolean`
   - `draft_status?: string`
   - `share_token?: string`

3. **Renderizado diferenciado**: 
   - Badge de estado del borrador (amarillo para borrador, naranja para negociación, verde para listo, azul para firmado) junto al badge de categoría "Contratos"
   - Los botones de "Ver" y "Descargar" se reemplazan por un botón "Abrir borrador" que navega a `/contract-draft/:share_token`
   - El botón de eliminar llamará a `contract_drafts.delete()` en vez de `documents.delete()`

4. **Filtros**: Los borradores se incluirán en la categoría "Contratos" existente para que los filtros funcionen sin cambios adicionales.

### Archivos a modificar
- `src/pages/Documents.tsx` — fetch, interfaz, renderizado

### Sin cambios en base de datos

