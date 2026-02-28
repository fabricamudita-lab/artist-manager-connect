

## Detectar formato y resolucion automaticamente al subir imagenes

Cuando se sube una imagen, el navegador puede leer sus dimensiones reales usando la API `Image()` de JavaScript. Esto permite rellenar automaticamente los campos `resolution` y `format_spec` sin que el usuario tenga que hacerlo manualmente.

### Que se hara

**1. Auto-deteccion en la subida (`AddAssetDialog.tsx`)**

Antes de insertar el registro en la base de datos, para cada archivo de imagen:
- Crear un `new Image()` temporal con `URL.createObjectURL(file)`
- Leer `naturalWidth` y `naturalHeight` al cargar
- Guardar la resolucion como `"3000x3000"` (ancho x alto)
- Detectar el aspect ratio y asignar el `format_spec` mas cercano de la lista existente (ej. si es 1:1 -> `"1:1"`, si es 16:9 -> `"16:9"`, si es exactamente 3000x3000 -> `"3000x3000"`)

**2. Auto-deteccion en el panel de detalle (`AssetDetailPanel.tsx`)**

Si el asset ya existe pero no tiene `resolution` guardada:
- Al abrir el panel, cargar la imagen en un `Image()` temporal
- Mostrar la resolucion detectada en gris como valor sugerido
- Al hacer clic en "Guardar", incluir esos valores auto-detectados

### Detalles tecnicos

- Se creara una funcion utilitaria `detectImageDimensions(file: File | string)` que devuelve `{ width, height, resolution, formatSpec }`
- La funcion acepta tanto un `File` (durante subida) como una URL `string` (en el panel de detalle)
- El mapeo de aspect ratio a format_spec sera: 1:1 -> `"1:1"`, 9:16 -> `"9:16"`, 16:9 -> `"16:9"`, y si coincide con un preset exacto (ej. 3000x3000, 1920x1080), usar ese
- Solo aplica a imagenes, no a videos ni PDFs

### Archivos a modificar

- **Crear**: `src/components/dam/utils/detectImageDimensions.ts` - Funcion utilitaria
- **Modificar**: `src/components/dam/AddAssetDialog.tsx` - Llamar a la deteccion durante `handleFileUpload` y guardar `resolution` y `format_spec` en el insert
- **Modificar**: `src/components/dam/AssetDetailPanel.tsx` - Auto-detectar al abrir si faltan esos campos, mostrar como sugerencia

