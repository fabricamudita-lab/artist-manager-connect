

## Incluir los 3 gráficos en el PDF descargado del presupuesto

### Enfoque
Usar `html2canvas` (ya instalado) para capturar cada gráfico directamente del DOM y embeber las imágenes en el PDF. Esto garantiza que los gráficos del PDF sean idénticos a los de la UI.

### Cambios en `src/components/BudgetDetailsDialog.tsx`

1. **Hacer `downloadPDF` asíncrono** (`async`), ya que `html2canvas` es asíncrono.

2. **Añadir refs a los contenedores de los gráficos** en la sección "overview":
   - Un `ref` para el contenedor del gráfico de categorías (donut/barras/cascada).
   - Un `ref` para la tabla resumen por categorías.

3. **Antes de generar el PDF, renderizar temporalmente los 3 gráficos**:
   - Crear un contenedor oculto (`position: absolute, left: -9999px`) con los 3 gráficos renderizados simultáneamente (donut, barras, cascada).
   - Usar `html2canvas` para capturar cada uno como imagen PNG.
   - Alternativa más simple: capturar el gráfico actual visible en el DOM y solo incluir ese. Pero el usuario quiere los 3.

4. **Estrategia de renderizado para los 3 gráficos**:
   - Temporalmente cambiar `chartViewMode` para renderizar cada vista, capturar con `html2canvas`, y restaurar.
   - **Mejor alternativa**: Dibujar versiones simplificadas directamente con jsPDF:
     - **Donut**: Dibujar un donut con `doc.circle()` y segmentos coloreados (complejo).
     - **Barras**: Dibujar rectángulos horizontales con `doc.rect()` y `doc.setFillColor()`.
     - **Cascada**: Dibujar barras verticales apiladas.

   La opción más fiable y limpia: **dibujar los gráficos con primitivas de jsPDF**, usando los mismos datos que ya calcula `getCategoryBarData()`.

### Gráficos a incluir en el PDF (después del resumen financiero, antes de la tabla de categorías)

**1. Gráfico de barras horizontales** (más representativo en PDF):
- Para cada categoría con gastos > 0: rectángulo proporcional con segmentos de color (verde=pagado, gris=comprometido, ámbar=provisional).
- Nombre de categoría a la izquierda, importe y % a la derecha.
- Leyenda debajo.

**2. Gráfico de cascada simplificado**:
- Barra verde "Capital" a la izquierda.
- Barras rojas por categoría (de mayor a menor).
- Barra verde/roja "Disponible" al final.
- Etiquetas con importes encima de cada barra.

**3. Donut simplificado**:
- Dibujar arcos de círculo con `doc.setFillColor` + path commands, o usar un enfoque más simple: mostrar el donut como una tabla visual con colores (cuadrados de color + nombre + % + importe).

### Enfoque final recomendado
Dado que dibujar un donut real con jsPDF es complejo y propenso a errores, la propuesta es:

1. **Barras horizontales**: Dibujar con `doc.rect()` - sencillo y muy informativo.
2. **Cascada**: Dibujar con `doc.rect()` barras verticales - sencillo.
3. **Donut**: Representar como tabla visual con cuadrados de color (como leyenda extendida) ya que el resumen por categoría con % ya existe como tabla.

Los 3 gráficos se insertan en una nueva página entre el resumen financiero y la tabla de categorías.

### Archivo afectado
- `src/components/BudgetDetailsDialog.tsx` (función `downloadPDF`)

