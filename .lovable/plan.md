

## Plan: Replicar formato exacto de la plantilla 024

### Archivo afectado
- `src/components/IPLicenseGenerator.tsx` — reescribir la función `generatePDF` (líneas 89-407)

### Conversión de medidas (pts → mm para jsPDF)

| Plantilla (pts) | mm   | Uso                              |
|-----------------|------|----------------------------------|
| 85              | 30   | Margen izquierdo/derecho         |
| 103             | 36.3 | Sangría nivel 1 (I, II, 1.1)    |
| 121             | 42.7 | Sangría nivel 2 (texto romano)   |
| 120.5           | 42.5 | Sangría sub-ítems (a, b, c)     |
| 13.9            | 4.9  | Interlineado                     |
| 21.9            | 7.7  | Espacio entre sub-ítems          |
| 43.8            | 15.5 | Espacio entre secciones          |
| 65.7            | 23.2 | Título → Fecha                   |

### Cambios concretos

**1. Configuración base**
- Cambiar márgenes de 25mm a 30mm
- Cambiar fontSize global de 12 a 11
- Fuente: mantener `times` (lo más cercano a Garamond en jsPDF)
- Interlineado: de 5.5mm a 4.9mm

**2. Reescribir helpers**
- `addTitle`: fontSize 11 (no 12/13), bold, centrado, sin escalar el lineHeight
- `addSection`: centrado (actualmente alineado a izquierda), sin margen extra propio — usar spacing explícito antes de cada llamada
- `addClauseTitle`: margen izquierdo 30mm, bold, fontSize 11, espacio antes ~15.5mm
- `addParagraph`: fontSize 11, interlineado 4.9mm, indent configurable
- `addHangingParagraph`: label bold en ml(30mm), texto normal, sin sangría adicional en continuación (todas las líneas a 30mm) — el efecto de hanging viene del formato, no de indent extra
- `addNumberedHanging`: número en 36.3mm, texto en 42.7mm, interlineado 4.9mm, espacio entre puntos ~15.5mm
- `addSubItem`: letra normal ("a. ") + título bold ("Título de la obra:") + valor normal. Margen 42.5mm, espacio entre ítems 7.7mm
- `addBoldInline` (para a. PERIODO:, b. TERRITORIO:): todo el label en bold, valor normal. Margen 42.7mm, espacio entre opciones 4.9mm

**3. Espaciado entre secciones**
- Título (y=25.3mm) → Fecha: +23.2mm
- Fecha → REUNIDOS: +15.5mm
- REUNIDOS → DE UNA PARTE: +15.5mm
- Entre bloques DE UNA PARTE / DE OTRA PARTE: +4.9mm
- MANIFIESTAN → I): +15.5mm
- Entre puntos romanos: +15.5mm
- CLÁUSULAS → 1. OBJETO: +7.7mm
- 1. OBJETO → 1.1.: +15.5mm
- Entre cláusulas principales: +15.5mm

**4. Negritas corregidas**
- "DE UNA PARTE," y "DE OTRA PARTE," → bold; resto normal
- REUNIDOS, MANIFIESTAN, CLÁUSULAS → bold centrado
- Títulos cláusula ("1. OBJETO") → bold
- Sub-ítems: "a. " normal + "Título de la obra Grabación:" bold + valor normal
- Sub-opciones: "a. PERIODO:" todo bold + valor normal
- Texto de párrafos, romanos, sub-cláusulas → normal

**5. Sin cambios en**
- Contenido textual de las cláusulas
- Formulario UI (pasos 0-3)
- Lógica de guardado/preview

### Resultado
El PDF generado replicará exactamente la estructura visual de la plantilla 024 con los espaciados, sangrías y negritas correctos.

