

## Plan: Usar URLs firmadas para ver documentos

### Problema
El bucket `documents` de Supabase no es público. Se está usando `getPublicUrl` que genera una URL pública que no funciona, causando `ERR_BLOCKED_BY_CLIENT`.

### Solución

**En `src/pages/release-sections/ReleaseContratos.tsx`:**

1. **Al guardar documentos**: Guardar solo el `filePath` (ruta relativa dentro del bucket) en `file_url` en vez de la URL pública completa. Ejemplo: `release-documents/{id}/1234_file.pdf`

2. **Al ver documentos**: Reemplazar el link directo `<a href={doc.file_url}>` por un botón que genera una URL firmada (signed URL) al hacer clic:
   - Usar `supabase.storage.from('documents').createSignedUrl(filePath, 3600)` para generar una URL temporal válida por 1 hora
   - Abrir la URL firmada en una nueva pestaña

3. **Misma lógica para el guardado del IPLicenseGenerator**: Cambiar el `getPublicUrl` por guardar solo el path relativo.

### Cambios concretos
- Función `handleViewDocument(fileUrl)` que extrae el path del bucket, genera signed URL y abre en nueva pestaña
- Actualizar los dos puntos de guardado (upload manual y IPLicenseGenerator onSave) para guardar el path relativo
- Para documentos ya guardados con URL completa, extraer el path del URL para retrocompatibilidad

### Archivo afectado
- `src/pages/release-sections/ReleaseContratos.tsx`

