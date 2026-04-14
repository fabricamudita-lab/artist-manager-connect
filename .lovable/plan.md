

## Plan: Clarificar correctamente Neto / IVA / Líquido en el PDF del presupuesto

### Problema
El PDF exportado no indica claramente qué tipo de importe se muestra en cada sección:
- La columna "Total" en el detalle de elementos calcula el **líquido** (neto + IVA - IRPF) pero no lo indica
- No hay coherencia con el modo de visualización (`displayMode`) que el usuario tiene seleccionado en la UI
- Falta contexto claro para que el lector del PDF sepa qué está viendo

### Solución

**Archivo: `src/components/BudgetDetailsDialog.tsx`** — función `downloadPDF` (~línea 2241)

1. **Respetar el `displayMode` activo**: El PDF debe exportar los totales según el modo que el usuario tiene seleccionado (neto, con_iva, liquido), igual que la UI.

2. **Añadir subtítulo indicativo al inicio del PDF**: Justo debajo del título, añadir una línea como:
   - `"Importes mostrados en: NETO (sin IVA ni IRPF)"`
   - `"Importes mostrados en: CON IVA (sin IRPF)"`
   - `"Importes mostrados en: LÍQUIDO (Neto + IVA - IRPF)"`

3. **Renombrar cabecera de columna "Total"** en la tabla de detalle (línea 2509):
   - Modo neto: `"Total Neto"`
   - Modo con_iva: `"Total + IVA"`
   - Modo líquido: `"Total Líquido"`

4. **Usar `calculateDisplayTotal` en vez de `calculateTotal`** en la tabla de detalle (líneas 2464, 2497) para que los importes coincidan con el modo seleccionado.

5. **Resumen financiero**: Mantener el desglose completo (neto, IVA, IRPF, total) pero marcar claramente cuál es cuál — ya está bastante bien, solo ajustar la etiqueta "Total a Facturar*" por "Total Líquido (a transferir)*".

6. **Donut chart**: Ya dice "Importes netos" — correcto, no cambiar.

### Cambios concretos
- ~15 líneas modificadas en la función `downloadPDF`
- Sin nuevos archivos ni dependencias

