

## Optimizar estructura del PDF de Presupuesto

### Resumen
Reestructurar la función `downloadPDF` en `BudgetDetailsDialog.tsx` (líneas 2166-2717) siguiendo las directrices del usuario para mejorar legibilidad y flujo lógico.

### Cambios en el orden y contenido

**Nuevo flujo del PDF:**

```text
PÁGINA 1
─────────────────────────────
1. CABECERA
   - Título del presupuesto
   - Fecha, Lugar (datos del evento)

2. RESUMEN FINANCIERO
   - Tabla actual (Caché, Gastos, IVA, IRPF, etc.)
   - Beneficio negativo resaltado en ROJO
     y con fuente más grande (12pt bold)
   - Margen negativo también en rojo

3. DESGLOSE POR CATEGORÍAS
   - Tabla con Categoría, Elem., Confirmado,
     Provisional, Total Neto, %
─────────────────────────────
PÁGINA 2 (o continuación)
─────────────────────────────
4. DETALLE DE ELEMENTOS
   - Tabla técnica agrupada por categoría
   - Agrupar músicos iguales: si hay N items
     con mismo unit_price y categoría "Músicos",
     mostrar "Músicos (xN)" como una sola fila
     con quantity=N (solo en PDF, no en datos)

5. ANEXO VISUAL: Gráfico Circular
   - Solo el Donut de Distribución de Gastos
   - Aclarar en subtítulo: "Importes con IVA"
     o "Importes Netos" según lo que se calcule
   - Colores con mayor contraste entre sí
     (evitar tonos similares)
─────────────────────────────
```

### Cambios técnicos en `BudgetDetailsDialog.tsx` → `downloadPDF()`

**1. Eliminar gráfico de Barras Horizontales** (líneas ~2280-2350)
- Borrar toda la sección "GRÁFICO 1: BARRAS HORIZONTALES" y su leyenda.

**2. Eliminar gráfico Cascada/Waterfall** (líneas ~2464-2555)
- Borrar toda la sección "GRÁFICO 3: CASCADA".

**3. Mover el Donut al final** (líneas ~2352-2462)
- Reubicar después de la tabla de detalle de elementos.
- Añadir subtítulo aclaratorio indicando si los importes incluyen IVA.

**4. Resaltar Beneficio negativo**
- En la tabla de resumen financiero (~línea 2230), detectar si `beneficio < 0`.
- Si es negativo, aplicar color rojo (`textColor: [220, 38, 38]`) y `fontStyle: 'bold'` a la fila de Beneficio y Margen usando `didParseCell` callback de autoTable.

**5. Mejorar colores del Donut**
- Reemplazar la paleta `chartColors` por colores con mayor separación visual:
  ```
  '#2563eb' (azul), '#dc2626' (rojo), '#16a34a' (verde),
  '#d97706' (ámbar), '#7c3aed' (violeta), '#0891b2' (cyan),
  '#c026d3' (magenta), '#65a30d' (lima)
  ```

**6. Agrupación de músicos en detalle**
- Antes de generar `tableData`, agrupar items de la misma categoría con el mismo `unit_price` y nombre similar, sumando cantidades.
- Solo agrupar si hay 3+ items similares para evitar perder detalle relevante.

### Archivos modificados
- `src/components/BudgetDetailsDialog.tsx` (función `downloadPDF`, líneas 2166-2717)

