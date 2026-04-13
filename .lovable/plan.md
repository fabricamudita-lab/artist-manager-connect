

## Plan: Corregir formato PDF — 4 cambios obligatorios

### Archivo afectado
- `src/components/IPLicenseGenerator.tsx`

### Cambio #1 — Justificación del texto

**Problema**: Varias llamadas a `pdf.text()` no usan `align: 'justify'`:
- `addHangingParagraph` línea 148: primera línea sí tiene justify, pero la línea del label (141) no.
- `addNumberedHanging` línea 177: primera línea al lado del número NO tiene justify.
- `addBoldInline` línea 236: primera línea NO tiene justify.
- `addSubItem` línea 215: valor en misma línea NO tiene justify.

**Fix**: Añadir `{ maxWidth: ..., align: 'justify' }` a todas las llamadas `pdf.text()` que renderizan texto de párrafo.

### Cambio #2 — Espacio después de coma

**Problema**: En líneas 282 y 287, el label es `'DE UNA PARTE,'` y el texto empieza con el nombre directamente. Al renderizar, `pdf.text(label, ml, y)` pone la coma pegada y el texto siguiente empieza sin espacio visual.

**Fix**: Cambiar los labels a `'DE UNA PARTE, '` (con espacio al final) o asegurar que el texto empiece con un espacio. La solución más limpia: en `addHangingParagraph`, añadir un espacio entre label y texto calculando `labelW` con ese espacio ya incluido (actualmente usa `label + ' '` en getTextWidth pero no lo renderiza).

### Cambio #3 — Sangría francesa real

**Problema**: El hanging indent actual pone continuaciones en `ml + indent1` (36.3mm), pero la primera línea de texto empieza en `ml + labelW`. Para un hanging indent real, la primera línea debe sobresalir (empezar más a la izquierda que las continuaciones).

**Fix para "DE UNA PARTE"**: 
- Primera línea: label bold en `ml`, texto normal en `ml + labelW` (como ahora).
- Continuaciones: en `ml + indent1` (6.3mm de sangría) — ya está correcto según las instrucciones (103pts = ml + 18pts = ml + indent1).

**Fix para puntos romanos I-IV)**:
- Número en `ml + indent1`, texto al lado.
- Continuaciones en `ml + indent2` (121pts) — ya está implementado así. Verificar que funciona correctamente.

### Cambio #4 — Espaciado vertical aumentado

**Problema**: Las instrucciones piden 44pts (~15.5mm) entre muchas más secciones de las que actualmente lo usan. Específicamente:

| Sección | Actual | Requerido |
|---------|--------|-----------|
| Antes de bloques DE UNA/OTRA PARTE | `sectionSpace` (15.5mm) ✓ | 15.5mm ✓ |
| Entre DE UNA y DE OTRA PARTE | `interline` (4.9mm) | `sectionSpace` (15.5mm) |
| Antes de MANIFIESTAN | `subItemSpace` (7.7mm) | `subItemSpace` (7.7mm) — las instrucciones dicen 22pt=7.7mm ✓ |
| Antes de cada punto romano | `sectionSpace` ✓ | ✓ |
| Antes de cada cláusula principal | `sectionSpace` ✓ | ✓ |
| Antes de sub-cláusulas (1.1, 1.2) | `sectionSpace` ✓ | ✓ |
| Entre sub-ítems (a, b, c) | `subItemSpace` ✓ | ✓ |

**Fix principal**: Línea 286 — cambiar `y += interline` a `y += sectionSpace` para el espacio entre "DE UNA PARTE" y "DE OTRA PARTE".

### Resumen de edits

1. **Línea 177**: Añadir `{ maxWidth: ..., align: 'justify' }` a primera línea de `addNumberedHanging`
2. **Línea 215**: Añadir justify a valor de `addSubItem` cuando cabe en una línea
3. **Línea 236**: Añadir justify a primera línea de `addBoldInline`
4. **Línea 282**: Asegurar espacio visual después de "DE UNA PARTE," (ajustar label o spacing)
5. **Línea 287**: Idem para "DE OTRA PARTE,"
6. **Línea 286**: Cambiar `interline` → `sectionSpace` para separación entre bloques DE UNA/OTRA PARTE

