

## Plan: Corregir descarga de documentos en la página Documentos

### Problema
En `Documents.tsx`, los botones "Ver" y "Descargar" usan `<a href={document.file_url}>` directamente. Pero `file_url` contiene una ruta de storage de Supabase (ej. `profileId/timestamp_file.pdf`), no una URL pública. Resultado: el navegador descarga la página HTML actual en lugar del PDF.

### Solución
Reemplazar los `<a href>` por funciones que descarguen el blob desde Supabase Storage (mismo patrón que `ReleaseContratos.tsx`).

### Cambios en `src/pages/Documents.tsx`

1. **Añadir función `handleDownloadDocument`** que:
   - Recibe el documento
   - Resuelve la ruta de storage (eliminando prefijos de URL pública legacy si existen)
   - Llama a `supabase.storage.from('documents').download(path)`
   - Crea un blob URL y dispara la descarga programáticamente

2. **Añadir función `handlePreviewDocument`** que:
   - Descarga el blob igual
   - Abre en nueva pestaña con `window.open(blobUrl)`

3. **Reemplazar los 4 `<a href={document.file_url}>`** (2 en vista grid, 2 en vista lista) por `<Button onClick={handleDownload/handlePreview}>` usando las nuevas funciones.

### Líneas afectadas
- ~490-500 (grid: Ver + Descargar)
- ~545-553 (lista: Ver + Descargar)
- Añadir ~20 líneas nuevas para las funciones de descarga/preview

