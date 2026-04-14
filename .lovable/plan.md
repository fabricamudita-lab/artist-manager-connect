

## Plan: Aplicar justificación manual de texto al ContractGenerator (contratos de booking)

### Problema
El `ContractGenerator.tsx` tiene el mismo problema que tenía el `IPLicenseGenerator`: usa `doc.text(line, x, y, { maxWidth })` línea a línea, lo que resulta en texto alineado a la izquierda en vez de justificado.

### Solución
Replicar la misma función `drawJustifiedLine` del IPLicenseGenerator y aplicarla en los puntos clave del PDF.

### Cambios en `src/components/ContractGenerator.tsx`

1. **Añadir función `drawJustifiedLine`** (~15 líneas, después de `ensureSpace`): Misma lógica — calcula el espacio sobrante y lo distribuye entre palabras.

2. **Actualizar `addParagraph`** (línea 805): Reemplazar `doc.text(line, x, y, { maxWidth })` por `drawJustifiedLine` para todas las líneas excepto la última del párrafo (que queda left-aligned).

3. **Actualizar `addLabelValue`** (líneas 849-858): Justificar las líneas de valor (excepto la última).

### Resultado
Todas las cláusulas legales del contrato de booking se renderizarán con texto justificado profesional, igual que los contratos de licencia IP.

