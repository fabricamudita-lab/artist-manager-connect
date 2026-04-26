## Problema

En el PDF del presupuesto (página de notas), el glosario se imprime como una sola línea continua:

> `Neto = Precio base sin impuestos | Bruto = Neto + IVA | Líquido = Bruto − IRPF`

Visualmente queda apretado y ambiguo (las palabras "Neto", "Bruto", "Líquido", "IRPF" se mezclan al leerse en línea). Está en `src/components/BudgetDetailsDialog.tsx` líneas 2562–2573, dentro del bloque de exportación PDF (`exportToPDF`).

## Cambio propuesto

Reemplazar ese bloque por un glosario estructurado, con título en negrita y cada término en una línea independiente, definición alineada en columna.

### Archivo único: `src/components/BudgetDetailsDialog.tsx` (líneas 2562–2573)

Resultado en el PDF (pág. 2):

```
Glosario de términos
Neto:     Precio base sin impuestos.
IVA:      Impuesto sobre el Valor Añadido aplicado al neto.
Bruto:    Neto + IVA.
IRPF:     Retención fiscal aplicada sobre el neto.
Líquido:  Bruto − IRPF. Importe final a transferir.

* Total a Facturar = Neto + IVA − IRPF (Líquido, importe final a transferir).
Generado el …
```

### Detalles técnicos

- Título "Glosario de términos" en negrita 8pt, color gris oscuro.
- Cada entrada: término en negrita + definición en regular, alineados en dos columnas (≈18 mm para la etiqueta).
- Interlineado 3.6 mm para mantener compacto pero legible.
- Mantener nota `*` y fecha de generación al final, en cursiva.
- `checkPage(32)` en lugar de `25` para asegurar que cabe el bloque completo sin partirse.
- No se cambia el CSV, solo el PDF (que es donde el usuario detectó el problema).

Aplica a todos los presupuestos exportados desde ahora — el de Curtcircuit y los siguientes.
