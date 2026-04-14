

## Plan: Alinear PDF y CSV con la UI del presupuesto

### Contexto
Los cambios anteriores no se aplicaron al PDF que descargaste (el PDF muestra "RESUMEN FINANCIERO" y "Total a Facturar*" del código antiguo). El código actual YA tiene las mejoras (Resumen Ejecutivo, Ingresos, Resumen Fiscal, etc.), pero la tabla de detalle no coincide con lo que ves en la UI.

### Cambios en `src/components/BudgetDetailsDialog.tsx`

#### 1. Resumen Financiero — mantener tu formato preferido
Renombrar "RESUMEN EJECUTIVO" de vuelta a **"RESUMEN FINANCIERO"** (como en tu captura) y añadir las líneas que faltan:
- Caché (Ingresos)
- Presupuesto Gastos
- Gastos Reales (Neto)
- IVA Repercutido (+)
- IRPF Retenido (-)
- Total a Facturar*
- Beneficio (en rojo si negativo)
- Margen

#### 2. Detalle de gastos — alinear con la UI
Cambiar las columnas del detalle para que coincidan con la UI:

```text
Antes (PDF actual):
Concepto | Contacto | Cant. | P.Unit. | Subtotal | IVA | Total Bruto | IRPF | Neto a Pagar | Estado

Después (como la UI):
Concepto | Contacto | Fecha Emisión | Precio/Comisión | IVA (%) | IRPF (%) | Total (€) | Estado
```

- **Fecha Emisión**: Usar `item.fecha_emision` formateado dd/MM/yyyy o "-"
- **IVA (%)**: Mostrar el porcentaje (ej. "21%") en vez del importe
- **IRPF (%)**: Mostrar el porcentaje (ej. "15%")
- **Total (€)**: Mostrar el líquido como valor principal. Debajo, en texto más pequeño: "+ €X retención" (como en la UI)

#### 3. Categorías por grupo — añadir total líquido
En la cabecera de cada categoría, mostrar el total líquido (como en la UI: "Líquido €2.650,00 + €375 ret.")

#### 4. Excel/CSV — mismos cambios
Actualizar `downloadExcel()` con las mismas columnas: Concepto, Contacto, Fecha Emisión, Precio, IVA (%), IRPF (%), Total Líquido, Retención, Estado

#### 5. Gráfico donut — verificar
El código ya usa importes netos (`unit_price * quantity`). Si al descargar ahora sigue mostrando líquido, es porque el navegador usaba código cacheado. Tras estos cambios se regenerará correctamente.

### Resultado esperado
El PDF será un reflejo fiel de la UI: mismas columnas, mismos porcentajes de IVA/IRPF visibles, fecha de emisión, y el total mostrando claramente el líquido con la retención indicada.

