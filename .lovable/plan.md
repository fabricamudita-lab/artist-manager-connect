

## Paleta de colores ampliada y sin repeticiones para el donut

### Problema
La paleta actual tiene 10 colores pero varios son visualmente similares (rojo #dc2626 y rosa #e11d48). Al haber pocas categorías con valor > 0, el `filter` elimina categorías vacías y los índices se reordenan, pero los colores asignados pueden seguir siendo perceptualmente iguales.

### Solución
Reemplazar la paleta de 10 colores por una de 16 colores perceptualmente distintos, ordenados para maximizar contraste entre colores adyacentes. Esto garantiza que nunca se repitan colores en el mismo gráfico (hasta 16 categorías) y que categorías consecutivas siempre tengan colores claramente distinguibles.

### Cambio en `src/components/BudgetDetailsDialog.tsx`

**Líneas 1000-1011**: Reemplazar la paleta actual por:

```typescript
const colors = [
  '#2563eb', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple
  '#eab308', // yellow
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#64748b', // slate
];
```

Los colores están intercalados (cálido-frío-cálido-frío) para que categorías consecutivas siempre contrasten visualmente. Con 16 opciones, es prácticamente imposible que se repitan en un presupuesto real.

### Archivo modificado
- `src/components/BudgetDetailsDialog.tsx` (solo la paleta de colores, ~12 líneas)

