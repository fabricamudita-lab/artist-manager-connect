

## Plan: Ajustar formato visual del PDF de Licencia IP para coincidir con la plantilla 024

### Archivo afectado
- `src/components/IPLicenseGenerator.tsx` — solo la función `generatePDF` (líneas 87-332)

### Cambios concretos

**1. Título en una sola línea**
- Reducir el `fontSize` del título de 14 a ~12 para que "LICENCIA DE CESIÓN DE DERECHOS DE PROPIEDAD INTELECTUAL" quepa en una línea con los márgenes actuales (25mm cada lado).

**2. Aumentar espaciado vertical entre secciones**
- Más espacio después del título antes de la fecha (de `y += 6` a `y += 10`)
- Más espacio en `addSection` antes del texto (de `y += 4` a `y += 8`)
- Más espacio entre los bloques "DE UNA PARTE" y "DE OTRA PARTE" (añadir `y += 4` entre ellos)
- Más espacio antes de "CLÁUSULAS"

**3. Sangría francesa en REUNIDOS (hanging indent)**
- Modificar `addBoldInline` para que en los bloques "DE UNA PARTE" y "DE OTRA PARTE", la primera línea empiece sin sangría pero las líneas siguientes tengan sangría (~10mm). Esto se logra renderizando la primera línea (con la parte bold) al margen izquierdo y las siguientes con `indent`.

**4. Sangría francesa en MANIFIESTAN**
- Los párrafos I), II), III), IV) deben usar sangría francesa: el número romano al margen, y las líneas siguientes con sangría (~8-10mm). Crear una función `addHangingParagraph(label, text, hangIndent)` que renderice el label a `ml` y el texto restante con indent.

**5. Sub-ítems con títulos en negrita y mayor sangría**
- Modificar `addSubItem` para que el label (ej. "a. Título de la obra Grabación:") se renderice en **negrita** y el valor en normal.
- Aumentar la sangría de 10mm a 15mm.
- Aumentar el espacio vertical entre ítems de 6mm a 8mm.

**6. Sub-opciones a, b, c en cláusula 2.1 con sangría adicional**
- Las llamadas a `addBoldInline('a. PERIODO:', ...)` ya usan indent 10. Aumentar a 15mm para mayor sangría, consistente con el punto anterior.

### Resumen técnico
- Crear helper `addHangingParagraph(label, text, hangIndent)` para sangría francesa
- Modificar `addSubItem` para poner label en bold y aumentar indent/spacing
- Ajustar constantes de espaciado en `addSection`, `addTitle`, y entre bloques
- Aumentar indent en las llamadas existentes de `addBoldInline` con sub-opciones

