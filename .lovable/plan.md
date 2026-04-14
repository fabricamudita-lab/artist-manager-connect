

## Plan: Rediseñar exportaciones PDF y Excel/CSV del presupuesto

### Problemas detectados

1. **Gráfico donut dice "Importes netos" pero muestra líquido**: `getCategoryChartData()` (línea 1024) usa `calculateTotal()` que devuelve neto+IVA-IRPF (líquido), no neto.
2. **PDF no muestra todas las columnas fiscales**: El detalle solo muestra una columna "Total" según el displayMode. El usuario quiere ver SIEMPRE: Subtotal Neto, IVA, Total Bruto, IRPF, Neto a Pagar — como en su referencia.
3. **PDF no tiene sección de Ingresos**: El usuario quiere ver el caché desglosado (Neto → IVA → Bruto → IRPF → Líquido).
4. **PDF no tiene sección de Resumen Fiscal ni Previsión de Tesorería**: Diferencia IVA repercutido/soportado, diferencia IRPF, flujo de caja neto.
5. **Gastos por categoría sin columnas pagado/pendiente/estado**.
6. **Excel/CSV**: Usa `calculateTotal()` (líquido) en la columna "Total" sin desglose. Debe incluir columnas: Subtotal, IVA, Total Bruto, IRPF, Neto a Pagar, Estado.

### Cambios

**Archivo: `src/components/BudgetDetailsDialog.tsx`**

#### A. Fix gráfico donut (~línea 1024)
Cambiar `calculateTotal(item)` por cálculo neto (`item.unit_price * item.quantity`) en `getCategoryChartData()`. Así el gráfico será coherente con su etiqueta "Importes netos".

#### B. Rediseñar `downloadPDF()` (~líneas 2241-2653)

Estructura nueva del PDF (siguiendo la referencia del usuario):

1. **Cabecera**: Título + ubicación + fecha (ya existe, mantener)
2. **Resumen ejecutivo**: Caché, Presupuesto Gastos, Beneficio Neto, Margen
3. **Ingresos** (NUEVO): Tabla con Concepto | Neto | IVA (21%) | Bruto | IRPF (15%) | Líquido
4. **Gastos por categoría** (MEJORADO): Categoría | Presupuestado | Pagado | Pendiente | Estado (con check pagado)
5. **Detalle de gastos** (MEJORADO): Concepto | Contacto | Cant. | P.Unit. | Subtotal | IVA | Total Bruto | IRPF | Neto a Pagar | Estado — TODAS las columnas siempre visibles
6. **Resumen fiscal** (NUEVO): IVA repercutido/soportado/diferencia, IRPF retenido/soportado/diferencia
7. **Previsión de tesorería** (NUEVO): A cobrar (líquido), A pagar (líquido), Flujo de caja neto
8. **Notas** (NUEVO): Explicación de Neto/Bruto/Líquido
9. **Eliminar subtítulo de displayMode** — ya no aplica porque se muestran todas las columnas

#### C. Rediseñar `downloadExcel()` (~líneas 2656-2801)

Estructura nueva del CSV (siguiendo la referencia XLSX del usuario):

1. Cabecera + Resumen ejecutivo
2. Ingresos (con desglose completo)
3. Gastos por categoría (con Presupuestado | Pagado Real | Pendiente | Estado)
4. Detalle con TODAS las columnas: Concepto | Contacto | Cant. | P.Unit. | Subtotal | IVA | Total Bruto | IRPF | Neto a Pagar | Estado
5. Resumen fiscal (IVA/IRPF repercutido vs soportado)
6. Previsión de tesorería
7. Notas explicativas

### Archivos a modificar
- `src/components/BudgetDetailsDialog.tsx` — fix donut, rediseño completo de `downloadPDF()` y `downloadExcel()`

