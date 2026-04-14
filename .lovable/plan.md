

## Plan: Implementar justificación real del texto en el PDF de Licencia IP

### Problema raíz
jsPDF's `align: 'justify'` **no funciona** cuando se pasan líneas individuales pre-divididas con `splitTextToSize`. jsPDF necesita el texto completo para justificar, pero el código divide primero y pasa línea a línea — resultado: texto alineado a la izquierda.

### Solución
Implementar justificación manual: calcular el espacio sobrante en cada línea y distribuirlo entre las palabras, renderizando palabra por palabra.

### Cambios en `src/components/IPLicenseGenerator.tsx`

#### 1. Nueva función `drawJustifiedLine` (~15 líneas)
```text
function drawJustifiedLine(pdf, text, x, y, maxWidth):
  words = text.split(' ')
  if words.length <= 1: draw normally, return
  totalTextWidth = sum of each word's width
  extraSpace = (maxWidth - totalTextWidth) / (words.length - 1)
  cursorX = x
  for each word:
    pdf.text(word, cursorX, y)
    cursorX += wordWidth + extraSpace
```

#### 2. Actualizar `renderLines` (línea 237-251)
Reemplazar `pdf.text(lines[i], ..., { align: 'justify' })` por `drawJustifiedLine(pdf, lines[i], xLeft, y, maxW)` para líneas no-finales. Última línea sigue left-aligned.

#### 3. Actualizar `addHangingParagraph` (línea 266)
Reemplazar la llamada con justify por `drawJustifiedLine` para la primera línea.

#### 4. Actualizar `addNumberedHanging` (línea 292, 300)
Mismo cambio: usar `drawJustifiedLine` en lugar de `align: 'justify'`.

#### 5. Actualizar `addBoldNormal` (líneas 352, 356)
Mismo patrón.

### Resultado
El texto del contrato quedará con **justificación completa** real (ambos márgenes alineados), como en un contrato legal estándar. La última línea de cada párrafo permanece alineada a la izquierda (comportamiento correcto de justificación).

### Archivos a modificar
- `src/components/IPLicenseGenerator.tsx` — nueva función + ~8 reemplazos de `align: 'justify'`

