## Diagnóstico

Estoy mejorando 3 puntos del módulo **Imagen & Video** de Discografía:

1. **Resolución sugerida automáticamente.** El sistema ya detecta dimensiones (`detectImageDimensionsFromUrl`) y precarga `form.resolution`, pero el campo es un `Select` con lista cerrada (`3000×3000`, `1920×1080`...). Si la dimensión real es `3582×2400`, no coincide y el campo aparece **vacío**.
2. **Demasiados clics** para cambiar estado y marcar cover desde la tarjeta.
3. **Sin lightbox** para visualizar imagen a pantalla completa con navegación por flechas.

## Cambios

### 1. Resolución como input libre con sugerencia auto

**`AssetDetailPanel.tsx`** — sustituir el `Select` de Resolución por un `Input` de texto con placeholder `"Ej: 3582×2400 (auto)"` que se autocompleta con el valor detectado. Mantener `RESOLUTION_OPTIONS` como botones rápidos opcionales encima.

Igual para **Formato**: si el detectado no está en `FORMAT_SPECS` (p. ej. `3000×3000`), añadirlo dinámicamente a las opciones del Select.

### 2. Acciones rápidas sobre la tarjeta de foto

**`DAMAssetCard.tsx`** (vista grid) — añadir en el overlay hover:
- Botón rápido **"Estado"** que abre un mini-popover con los 4 estados (En producción / Pendiente / Listo / Publicado) y los aplica al instante (`update release_assets.status`) sin abrir el panel ni entrar en modo edición.
- Botón rápido **"Marcar cover"** (solo en sección `artwork`): aplica `sub_type='Cover Álbum'`, `status='listo'` y dispara la sincronización con `releases.cover_image_url` (misma lógica que ya existe en `handleSave`).

Nuevos props opcionales: `onQuickStatusChange`, `onSetAsCover`. Si no se pasan, los botones no se muestran (no rompemos otros usos).

### 3. Selección múltiple + acción masiva

**`PhotoSessionPipeline.tsx`** — añadir modo selección:
- Click + tecla Shift / checkbox al hacer hover sobre la card → entra en modo "selección".
- Aparece una barra superior sticky con `N seleccionadas` y acciones: **Cambiar estado**, **Mover a etapa** (Backup/Seleccionadas/Editadas/Compartir), **Marcar como cover** (si todas son artwork — solo tiene sentido para una, deshabilitar si N>1), **Eliminar**.
- Estado local `selectedIds: Set<string>`. Click normal sigue abriendo el panel; checkbox o Shift-click activa selección.

### 4. Lightbox a pantalla completa

Nuevo componente **`src/components/dam/AssetLightbox.tsx`**:
- Modal full-screen con fondo negro 90 %.
- Imagen central `object-contain max-h-screen`.
- Botones **‹** **›** flotantes a los lados + atajos teclado `←` / `→` para navegar entre imágenes.
- `Esc` cierra. Botón `X` arriba derecha.
- Indicador `n / total` y nombre del archivo abajo.
- Soporta vídeos: si `external_url` (YouTube/Vimeo) embebe iframe; si es archivo, `<video controls>`.

**Integración en `AssetDetailPanel.tsx`**: la preview superior pasa a ser clicable → abre lightbox con la lista de assets de la misma sección/sesión. Pasar `assets[]` y `currentIndex`.

Pasar `assets[]` desde `ReleaseImagenVideo.tsx` al panel (los de la sesión activa o la sección).

## Fuera de alcance

- No tocar `AddAssetDialog` (ya detecta y guarda dimensiones al subir).
- No reorganizar las pestañas Backup/Seleccionadas/Editadas/Para compartir (al usuario no le molestan, solo el flujo de cambio de estado).
- No añadir rotación / edición de imagen.

## Detalles técnicos

- Los cambios rápidos de estado y promoción de etapa usan el mismo patrón actual: `supabase.from('release_assets').update({...}).eq('id', ...)` + `refreshData()` + toast.
- Cover sync: replicar el bloque ya existente en `AssetDetailPanel.handleSave` (líneas 128-143) en una función helper compartida `syncCoverIfNeeded(asset, newSubType, newStatus)`.
- Lightbox usa `Dialog` de shadcn con `className="max-w-screen-2xl p-0 bg-black/95"` y listeners `keydown` en `useEffect`.
