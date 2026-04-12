

## Hover highlight en filas de categorías ocultas

### Cambio
Añadir un efecto hover suave a cada fila de categoría oculta para que al pasar el ratón se ilumine, facilitando la identificación visual.

### Archivo: `src/components/BudgetDetailsDialog.tsx`

**Línea 3900** — Cambiar las clases del `<div>` de cada fila de categoría oculta:

De:
```
className="flex items-center justify-between px-3 py-2 bg-gray-800/80"
```

A:
```
className="flex items-center justify-between px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 transition-colors duration-200 cursor-pointer"
```

Esto añade:
- `hover:bg-gray-700/80` — iluminación sutil al pasar el ratón
- `transition-colors duration-200` — transición suave
- `cursor-pointer` — indica que es interactivo

Un cambio mínimo, solo CSS, sin riesgo funcional.

