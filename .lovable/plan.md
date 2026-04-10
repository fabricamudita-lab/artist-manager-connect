

## Corregir gráfico de cascada (Waterfall) en PDF para presupuestos negativos

### Problema
Cuando los gastos superan el capital (presupuesto negativo), el gráfico de cascada en el PDF se rompe visualmente:
- Las barras de gasto se dibujan **por debajo de la línea base** porque `runningAfter` se vuelve negativo
- Las etiquetas de valor se solapan con las barras
- No hay zona visual para valores negativos — la línea base está fija en el fondo del gráfico
- El texto del siguiente bloque ("DESGLOSE POR CATEGORÍAS") se solapa con el gráfico

### Causa raíz
En `BudgetDetailsDialog.tsx` (líneas 2444-2476), el cálculo del PDF waterfall asume que `running` siempre es positivo:
```typescript
const topOfBar = wfBaseY - ((d.runningAfter + d.value) / wfMaxVal) * (wfChartH - 10);
```
Cuando `runningAfter` es negativo, `topOfBar` se sitúa **debajo** de `wfBaseY`, las barras se dibujan fuera del área del gráfico y colisionan con el texto.

### Solución

**Archivo: `src/components/BudgetDetailsDialog.tsx`** (líneas ~2413-2478)

1. **Calcular el rango completo** del eje Y incluyendo valores negativos: `minVal` (mínimo de 0 y el running más bajo) y `maxVal` (capital).
2. **Reubicar la línea base (y=0)** proporcionalmente dentro del área del gráfico, dejando espacio arriba para positivos y abajo para negativos.
3. **Dibujar barras correctamente**: las de gasto "cuelgan" desde su posición running, y si cruzan la línea base, se extienden hacia abajo naturalmente.
4. **Posicionar etiquetas** siempre por encima de cada barra con margen suficiente.
5. **Aumentar `wfChartH`** cuando hay valores negativos para dar más espacio visual.
6. **Ajustar `yPos`** después del gráfico para evitar solapamiento con el contenido siguiente.

Lógica clave:
```typescript
const minRunning = Math.min(0, ...wfData.map(d => d.runningAfter));
const maxVal = capital;
const range = maxVal - minRunning; // rango total del eje

// Posición Y del valor 0 (línea base) proporcional al rango
const zeroY = yPos + (maxVal / range) * wfChartH;

// Cada barra se posiciona según su valor real en el eje
const yForValue = (v) => yPos + ((maxVal - v) / range) * wfChartH;
```

### También afecta al gráfico in-app (Recharts)
El gráfico interactivo (líneas 4874-4930) tiene un problema similar con `base: Math.max(running, 0)` — trunca las bases negativas. Se corregirá para que las bases negativas se muestren correctamente, ya que Recharts ya soporta el dominio negativo en el YAxis (línea 4906).

### Resultado
- Capital €2500 con gastos €2790: la cascada mostrará barras descendiendo hasta €-290 por debajo de la línea base
- "Disponible" se mostrará en rojo extendiéndose bajo la línea base
- Etiquetas nunca solapan barras ni texto posterior
- El bloque "DESGLOSE" comienza con margen adecuado

