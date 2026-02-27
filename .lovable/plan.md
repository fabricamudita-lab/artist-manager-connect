

## Ampliar el campo de cantidad en presupuestos

### Problema
El input de cantidad (multiplicador) en la tabla de items del presupuesto usa `w-12` (3rem / 48px), lo que no permite ver numeros de 3+ digitos (ej: 100, 150, etc.). Igualmente, en modo vista, el texto "x {quantity}" no tiene espacio suficiente para numeros grandes.

### Solucion

**Archivo**: `src/components/BudgetDetailsDialog.tsx`

1. **Input de cantidad en modo edicion** (linea 3777): Cambiar `w-12` a `w-16` para que quepan numeros de hasta 3-4 digitos comodamente.

2. **Texto de cantidad en modo vista** (linea 3811): Ya muestra el valor correctamente pero se puede asegurar que no se corte anadiendo `whitespace-nowrap` al span.

Cambio minimo, una sola linea editada.
