
Diagnóstico:
- He revisado `src/pages/release-sections/ReleaseContratos.tsx` y la corrección anterior sigue haciendo esto al pulsar “Ver documento”: `createSignedUrl(...)` + `window.open(data.signedUrl, '_blank')`.
- Eso significa que, aunque la URL sea privada y válida, la pestaña nueva sigue navegando directamente a `hptjzbaiclmgbvxlmllo.supabase.co`, que en tu navegador está siendo bloqueado con `ERR_BLOCKED_BY_CLIENT`.
- Por tanto, el problema ya no es el bucket ni la firma de la URL: es seguir abriendo el dominio de Supabase en una pestaña nueva.

Plan de implementación:

1. Cambiar la visualización para no abrir nunca la URL de Supabase
- En `src/pages/release-sections/ReleaseContratos.tsx`, reemplazar la lógica actual de `handleViewDocument`.
- En vez de abrir la signed URL, descargaré el archivo desde Storage con `supabase.storage.from('documents').download(path)` y generaré un `blob:` local con `URL.createObjectURL(...)`.
- La pestaña nueva abrirá ese `blob:` local, no `supabase.co`.

2. Hacer la resolución de ruta más robusta
- Añadir un helper para convertir `file_url` en la ruta real del bucket, soportando:
  - rutas relativas actuales (`release-documents/...`)
  - URLs públicas antiguas (`/storage/v1/object/public/documents/...`)
  - posibles URLs firmadas antiguas (`/storage/v1/object/sign/documents/...?...`)
- Así seguirá funcionando con documentos ya guardados antes de los cambios.

3. Diferenciar previsualización y descarga según tipo de archivo
- Cambiar `handleViewDocument` para recibir el documento completo, no solo `file_url`.
- Si el archivo es previsualizable (PDF o imagen), abrirlo en nueva pestaña mediante `blob:`.
- Si es DOC/DOCX u otro formato que el navegador no previsualiza bien, descargarlo directamente y mostrar un toast claro, evitando pestañas vacías o bloqueadas.

4. Mejorar la UX del botón
- Abrir una pestaña vacía inmediatamente solo en archivos previsualizables, y rellenarla después con el `blob:` para evitar bloqueos de popup tras el `await`.
- Añadir estado de carga por documento (`viewingId`) para desactivar temporalmente el botón mientras se obtiene el archivo.
- Mejorar el manejo de errores con `console.error(...)` y toast más específico.

Alcance:
- Archivo afectado: `src/pages/release-sections/ReleaseContratos.tsx`
- Sin cambios en base de datos ni en Supabase.

Resultado esperado:
- “Ver documento” dejará de abrir la URL de Supabase que te bloquea Chrome.
- PDFs e imágenes se abrirán correctamente.
- DOC/DOCX se descargarán de forma controlada.
- Los documentos antiguos seguirán siendo compatibles.
