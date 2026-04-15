

## Plan: Separar Label Copy y Splits de Derechos en dos PDFs + Agrupar créditos por persona

### Problema actual
1. **Créditos duplicados en el PDF**: La misma persona aparece varias veces con roles distintos (ej: "Arreglista: Vicente López", "Guitarra: Vicente López") en vez de agruparse
2. **Porcentajes confusos**: "(15% Autoría)" mezclado con los créditos del label copy no es claro
3. **Un solo documento** mezcla información de label copy (metadatos + créditos para distribuidoras) con splits de derechos (autoría/master), que son documentos con propósitos distintos

### Solución: Dos funciones de exportación independientes

**PDF 1 — Label Copy** (metadatos + créditos agrupados, SIN porcentajes)
- Header: título, artista, UPC, sello, copyright, género, fecha, etc.
- Por canción: artista, ISRC, copyright ©/℗, créditos agrupados por persona, letra
- Créditos agrupados: "Vicente López — Arreglista, Guitarra" en vez de dos filas separadas
- Sin porcentajes de autoría ni master (eso va en el otro documento)

**PDF 2 — Splits de Derechos** (autoría + master por canción)
- Header: mismos datos del release
- Por canción: dos tablas claras
  - **Autoría/Publishing**: nombre, roles, porcentaje — con total al pie
  - **Master/Royalties**: nombre, roles, porcentaje — con total al pie
- Solo aparecen personas que tienen porcentajes asignados

### Cambios técnicos

**1. Refactorizar `src/utils/exportLabelCopyPDF.ts`**
- Eliminar toda la lógica de porcentajes del label copy
- Agrupar créditos por persona (clave: `name.toLowerCase()`) antes de renderizar
- Mostrar: "Nombre — Rol1, Rol2, Rol3" en una sola línea por persona

**2. Crear `src/utils/exportSplitsPDF.ts`**
- Nueva función `exportSplitsPDF()` con los mismos parámetros
- Header idéntico al label copy
- Por canción, dos secciones con tabla:
  - **AUTORÍA**: filas con nombre, roles, % autoría
  - **MASTER**: filas con nombre, roles, % master
- Totales al final de cada tabla

**3. Actualizar `src/pages/release-sections/ReleaseCreditos.tsx`**
- Añadir un segundo botón "Descargar Splits de Derechos" junto al existente de Label Copy
- O un dropdown con las dos opciones
- Reutilizar la misma query de datos para ambos exports

### Archivos

| Archivo | Acción |
|---------|--------|
| `src/utils/exportLabelCopyPDF.ts` | Modificar: quitar %, agrupar créditos por persona |
| `src/utils/exportSplitsPDF.ts` | Crear: nuevo PDF de splits con tablas de autoría y master |
| `src/pages/release-sections/ReleaseCreditos.tsx` | Modificar: añadir botón para el segundo PDF |

