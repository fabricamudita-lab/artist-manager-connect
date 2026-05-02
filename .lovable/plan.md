# Renombrar pestaña "Archivos y documentos" → "Archivos"

## Cambio

En `src/pages/BookingDetail.tsx` (línea 745), el `TabsTrigger` con `value="files"` muestra el texto "Archivos y documentos". Lo simplificamos a "Archivos".

## Alcance

- Solo se cambia el texto visible. El `value="files"` y el icono `FolderOpen` se mantienen, por lo que ningún `TabsContent`, ruta, estado o referencia interna se ve afectada.
- `rg "Archivos y documentos"` confirma que es la única ocurrencia en todo `src/`.

## Archivo

- `src/pages/BookingDetail.tsx` línea 745.

## Verificación

- Abrir un booking → la pestaña ahora muestra "Archivos" con el mismo icono.
- El click sigue mostrando el contenido de archivos sin regresiones.
