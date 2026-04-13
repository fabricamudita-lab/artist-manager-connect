

## Plan: Vista previa inline + descarga PDF

### Problema
Al pulsar "Ver documento", se abre una pestaña nueva con `blob:` URL que Chrome sigue bloqueando (`ERR_BLOCKED_BY_CLIENT`). El usuario quiere ver el documento dentro de la app y poder descargarlo como PDF.

### Solución

**Archivo: `src/pages/release-sections/ReleaseContratos.tsx`**

1. **Nuevo estado para vista previa inline**: Añadir estado `previewDoc` (documento seleccionado) y `previewBlobUrl` (blob URL generado).

2. **Reemplazar `handleViewDocument`**: En vez de abrir nueva pestaña, descargar el blob con `supabase.storage.download()`, crear `URL.createObjectURL()` y guardarlo en estado para mostrarlo en un panel lateral.

3. **Panel lateral de vista previa**: Añadir un `Dialog` grande (similar al `InvoicePreviewDialog` existente) que muestre:
   - Para PDFs: un `<iframe src={blobUrl}>` embebido
   - Para imágenes: un `<img src={blobUrl}>`
   - Para otros tipos: mensaje indicando que no se puede previsualizar + botón de descarga
   - Botón "Descargar PDF" que descarga el archivo localmente

4. **Botón de descarga**: Añadir un botón "Descargar" junto a "Ver documento" en la sección expandida de cada documento, que descarga directamente el blob sin abrir ninguna pestaña.

5. **Limpieza**: Revocar el blob URL al cerrar el panel (`URL.revokeObjectURL`).

### Estructura del panel de vista previa

```text
┌─────────────────────────────────────────┐
│ Vista previa - nombre_archivo.pdf    [X]│
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │   <iframe> / <img> embebido     │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│                        [Descargar] [X]  │
└─────────────────────────────────────────┘
```

### Archivos afectados
- `src/pages/release-sections/ReleaseContratos.tsx` — toda la lógica de preview y descarga

### Sin cambios en
- Base de datos, Storage, ni otros componentes

