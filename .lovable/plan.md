

## Pulido visual del módulo de Presupuestos

Inspirado en el diseño de referencia (spreadsheet limpio, jerarquía clara, mejor uso del espacio), se proponen ajustes puramente estéticos sin tocar ninguna funcionalidad.

### Cambios propuestos

**1. Cabeceras de categoría** (`BudgetDetailsDialog.tsx`, ~línea 4037)
- Fondo actual: negro sólido con texto blanco pesado → Fondo más sutil con borde inferior coloreado (como la barra verde "I. INGRESSOS" de la referencia)
- Usar un acento de color por categoría (heredado del icono) en el borde izquierdo o inferior
- Tipografía: reducir de `text-lg font-bold tracking-wider` a `text-sm font-semibold uppercase tracking-wide` para un look más elegante y menos agresivo
- Mover el total de la categoría al extremo derecho con color destacado (como el "103.585 €" verde de la referencia)

**2. Tabla de ítems** (~línea 4150)
- Header de columnas: cambiar de `bg-gray-100` con texto negro bold a un gris más suave (`bg-gray-50`) con texto `text-gray-500 font-medium text-xs uppercase`
- Filas: reducir padding vertical (`py-1.5` en vez de `p-2`), hacer las filas más compactas
- Alternar colores: blanco / `bg-gray-50/50` más sutil
- Bordes: usar `border-gray-100` en vez de `border-gray-200` para líneas más sutiles
- Precio y Total: usar tipografía monoespaciada (`font-mono`) para mejor alineación de cifras

**3. KPI Cards del header** (~línea 3344)
- Reducir altura de `h-[80px]` a `h-[72px]`
- Reducir tamaño del valor de `text-xl` a `text-lg`
- Añadir un borde izquierdo grueso coloreado (`border-l-3`) en vez del borde completo, para un look más limpio (estilo dashboard moderno)

**4. Toolbar "Gestión de Elementos"** (~línea 3608)
- Reducir padding y hacer más compacto
- Separar visualmente los botones de acción del toggle Neto/IVA/Líquido con un divider

**5. Badge de estado de facturación** (en las filas)
- Badges más compactos: `text-[10px] px-2 py-0.5` con colores más suaves (pastel en vez de saturados)

### Archivo a modificar
- `src/components/BudgetDetailsDialog.tsx` (solo clases CSS, sin cambios de lógica)

### Resultado esperado
Un presupuesto visualmente más limpio, con mejor jerarquía de información, donde los datos importantes (totales, estados) destacan sin que el diseño compita por atención.

