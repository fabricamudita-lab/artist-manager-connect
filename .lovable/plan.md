

## Arreglar grafico de "Desglose por Categoria"

### Problema
El grafico circular (pie chart) muestra las etiquetas directamente sobre los segmentos con `label={({ name, percent }) => ...}`, lo que causa que se superpongan cuando hay muchas categorias pequenas (Transporte, Dietas, Hospedaje, Promocion, Grabacion). El resultado es ilegible.

### Solucion
Cambiar el layout del grafico para usar un estilo similar al de `SourceDistributionChart` (que ya funciona bien en el proyecto): un **donut chart** sin etiquetas sobre los segmentos, con la leyenda como lista lateral con nombre, importe y porcentaje.

**Cambios en `src/components/BudgetDetailsDialog.tsx` (lineas ~4119-4157):**

1. **Eliminar las etiquetas del Pie**: quitar la prop `label` y `labelLine` para que no se rendericen textos sobre el grafico
2. **Convertir a donut**: anadir `innerRadius={50}` y `paddingAngle={2}` para separar visualmente los segmentos
3. **Reemplazar `<Legend />`** por una lista custom al lado del grafico (flex horizontal), mostrando cada categoria con: punto de color, nombre, importe formateado y porcentaje
4. **Ajustar layout**: cambiar el contenedor de `h-80` a un flex con el grafico a la izquierda y la leyenda a la derecha, similar al patron ya usado en `SourceDistributionChart`

### Resultado
Grafico limpio tipo donut sin etiquetas superpuestas. La informacion detallada (nombre, importe, %) se muestra en una leyenda lateral ordenada, completamente legible independientemente del numero de categorias.
