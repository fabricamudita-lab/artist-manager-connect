

## Hacer funcional la sección EPF (Electronic Press Folder)

### Problema

Los botones "Subir Documento" no tienen `onClick` — son puramente decorativos. No hay lógica de upload, edición, filtrado ni eliminación real.

### Cambios

**1. Ampliar `useUploadReleaseAsset` en `useReleases.ts`**

- Cambiar el tipo del parámetro `type` de `'image' | 'video'` a `'image' | 'video' | 'document'` para permitir subir documentos.
- Añadir campo opcional `category` al insert para categorizar documentos (nota de prensa, bio, rider, etc.).

**2. Reescribir `ReleaseEPF.tsx` con funcionalidad completa**

- **Upload**: Input file oculto que se activa al hacer clic en "Subir Documento". Sube el archivo usando `useUploadReleaseAsset` con `type: 'document'`.
- **Edición**: Dialog para editar título, categoría y descripción de cada documento (update directo a `release_assets`).
- **Eliminación**: Usar `useDeleteReleaseAsset` existente con confirmación.
- **Visualización/Descarga**: Los botones de Eye y Download ya están pero sin handlers — conectarlos a `window.open()` y `<a download>`.
- **Filtros**: Barra de filtros con:
  - Búsqueda por texto (filtra por título)
  - Filtro por categoría (select: Nota de prensa, Bio, Rider, Hoja técnica, Otro)
  - Ordenación por fecha (más reciente / más antiguo) y por nombre (A-Z / Z-A)

**3. Archivos afectados**

| Archivo | Cambio |
|---|---|
| `src/hooks/useReleases.ts` | Ampliar tipo en `useUploadReleaseAsset` + añadir mutation `useUpdateReleaseAsset` |
| `src/pages/release-sections/ReleaseEPF.tsx` | Reescribir con upload funcional, edición, eliminación y filtros |

No requiere migración DB — la tabla `release_assets` ya soporta `type: 'document'`, `category`, `tags` y `description`.

