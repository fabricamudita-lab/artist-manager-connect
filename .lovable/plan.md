

## Fix: Colores del gráfico donut + líneas en PDF

### Problema 1: Colores poco variados
La paleta actual en `getCategoryChartData()` (línea 1000) tiene 16 colores, pero incluye tonos demasiado similares (blue `#2563eb` + indigo `#6366f1` + sky `#0ea5e9`). Cuando hay pocas categorías, pueden caer juntos dos azules casi idénticos.

**Solución**: Reordenar la paleta para maximizar contraste entre colores consecutivos, alternando cálidos y fríos, y reemplazando duplicados cercanos por colores más distintos:

```
'#2563eb',  // azul
'#f59e0b',  // ámbar
'#10b981',  // esmeralda
'#ef4444',  // rojo
'#8b5cf6',  // violeta
'#06b6d4',  // cyan
'#ec4899',  // rosa
'#84cc16',  // lima
'#f97316',  // naranja
'#7c3aed',  // púrpura oscuro
'#14b8a6',  // teal
'#e11d48',  // rosa fuerte
'#eab308',  // amarillo
'#0891b2',  // cyan oscuro
'#d946ef',  // fucsia
'#64748b',  // slate
```

Clave: nunca dos azules seguidos; cada color adyacente es de familia cromática diferente.

### Problema 2: Líneas visibles en el donut del PDF
El donut del PDF (línea 2579) se dibuja con triángulos con `doc.setDrawColor(255)` y `doc.setLineWidth(0.5)`, lo que genera líneas blancas visibles entre los triángulos de cada segmento.

**Solución**: Usar `'F'` (solo relleno, sin borde) que ya se usa, pero además establecer `doc.setDrawColor` al mismo color del relleno antes de dibujar, y reducir `lineWidth` a 0. O mejor: no usar `setDrawColor`/`setLineWidth` y solo rellenar. El problema es que `triangle('F')` en jsPDF aún puede dejar artefactos si hay un drawColor activo. La solución limpia es:
- `doc.setLineWidth(0)` antes del bloque de triángulos
- No llamar a `setDrawColor(255, 255, 255)` — en su lugar, igualar drawColor al fillColor

### Archivo afectado
**`src/components/BudgetDetailsDialog.tsx`**:
- Líneas 1000-1017: nueva paleta de colores con mejor contraste
- Líneas 2575-2588: eliminar las líneas del donut en PDF

