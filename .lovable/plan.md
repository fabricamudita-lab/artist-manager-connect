

## Plan: Corregir justificación en sub-items y cambio de tamaño de fuente

### Problema 1: Sub-items (a. b. c. d.) justificados incorrectamente
`addSubItem` (línea 347) y `addBoldInline` (línea 367) llaman a `drawJustifiedLine` para valores cortos como "Ver el mundo pasar" o "A perpetuidad." — esto distribuye las palabras por toda la línea, creando espacios enormes. Estos items NO deberían justificarse, solo alinearse a la izquierda.

### Problema 2: Cambio repentino de tamaño de texto
`addFooter()` (línea 223) cambia la fuente a 9pt para el número de página. Cuando `checkPage()` detecta que hay que saltar de página, llama a `addFooter()` y la fuente queda en 9pt. Las funciones que continúan renderizando después (`renderLines`, `addNumberedHanging`, etc.) NO restauran la fuente después de cada `checkPage()`, así que el texto restante sale en 9pt en vez de 11pt.

### Cambios en `src/components/IPLicenseGenerator.tsx`

#### Fix 1: No justificar sub-items
- **`addSubItem`** (línea 347): Reemplazar `drawJustifiedLine(value, valX, y, remaining)` por `pdf.text(value, valX, y)` — el valor se renderiza alineado a la izquierda junto a su etiqueta.
- **`addBoldInline`** (línea 367): Misma lógica — la primera línea del valor no se justifica cuando es la única línea. Si hay múltiples líneas, justificar todas menos la última (comportamiento actual correcto).

#### Fix 2: Restaurar fuente después de checkPage
- Modificar `checkPage()` para que, después de llamar a `addFooter()` y crear nueva página, restaure la fuente a `times normal 11pt`. Esto garantiza que cualquier función que llame a `checkPage()` nunca herede el 9pt del footer.

### Resultado
- Los items a., b., c., d. se mostrarán con texto pegado a la etiqueta (sin espacios artificiales)
- El texto mantendrá tamaño 11pt constante en todas las páginas, sin saltos a 9pt

### Archivos a modificar
- `src/components/IPLicenseGenerator.tsx` — 3 cambios puntuales (~6 líneas)

