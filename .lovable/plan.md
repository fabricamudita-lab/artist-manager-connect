

## Funcionalidad de subida de archivos en Imagen & Video

### Problema actual
Los botones "Subir" y "Subir Archivos" en la pagina de Imagen & Video no hacen nada. No hay bucket de storage ni logica de subida implementada.

### Cambios necesarios

**1. Crear bucket de storage `release-assets` (migracion SQL)**

Nueva migracion que:
- Crea el bucket `release-assets` como publico (para poder mostrar las imagenes directamente)
- Agrega politicas RLS para que usuarios autenticados puedan subir, leer y eliminar archivos

**2. Agregar hook de subida de assets en `src/hooks/useReleases.ts`**

Nuevo mutation `useUploadReleaseAsset` que:
- Recibe un `File` y metadata (release_id, type, title)
- Sube el archivo a `release-assets/{release_id}/{filename}` en Supabase Storage
- Obtiene la URL publica
- Inserta un registro en `release_assets` con la URL, tipo, titulo
- Invalida la query `release-assets` para refrescar la galeria

Nuevo mutation `useDeleteReleaseAsset` que:
- Elimina el archivo del storage
- Elimina el registro de `release_assets`

**3. Actualizar `src/pages/release-sections/ReleaseImagenVideo.tsx`**

- Agregar un input `<input type="file" accept="image/*,video/*" multiple>` oculto
- Los botones "Subir" activan el file input via `ref.click()`
- Al seleccionar archivos, se llama al mutation por cada archivo
- Mostrar estado de carga (spinner/progress) mientras se suben
- Agregar boton de eliminar en cada asset card (visible en hover)
- Permitir subir multiples archivos a la vez

### Archivos a modificar/crear

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Crear bucket `release-assets` + politicas |
| `src/hooks/useReleases.ts` | Agregar `useUploadReleaseAsset` y `useDeleteReleaseAsset` |
| `src/pages/release-sections/ReleaseImagenVideo.tsx` | Conectar botones a subida real con file input |

