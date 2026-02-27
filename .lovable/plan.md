

## Ampliar el campo de Precio/Comision en presupuestos

### Problema
El campo "Precio / Comision" en la tabla de items del presupuesto usa un ancho de columna de 140px y los inputs internos son demasiado estrechos (`w-16`, `w-12`). Esto impide ver correctamente cantidades grandes (hasta 500.000 euros).

### Solucion

**Archivo**: `src/components/BudgetDetailsDialog.tsx`

1. **Ampliar la columna de la tabla**: Cambiar el ancho del `TableHead` de `w-[140px]` a `w-[200px]` para dar mas espacio al campo de precio.

2. **Ampliar los inputs en modo edicion**:
   - Input de precio fijo (linea ~3767): cambiar de `flex-1` a `w-28` minimo, asegurando que quepa "500000.00".
   - Input de porcentaje (linea ~3754): cambiar de `w-16` a `w-20` para porcentajes con decimales.
   - Input de cantidad (linea ~3777): mantener `w-12` ya que las cantidades son numeros pequenos.

3. **Mejorar la visualizacion en modo lectura**:
   - En el modo vista de precio fijo (linea ~3809): formatear con `toLocaleString('es-ES')` para mejor legibilidad de numeros grandes (ej: "500.000,00" en vez de "500000.00").
   - En el modo vista de comision (linea ~3801): aplicar el mismo formateo.

### Cambios puntuales

| Linea aprox. | Cambio |
|---|---|
| 3551 | `w-[140px]` a `w-[200px]` en TableHead |
| 3754 | `w-16` a `w-20` en input de porcentaje |
| 3767 | Asegurar `min-w-[7rem]` en input de precio fijo |
| 3801, 3809 | Usar `toLocaleString('es-ES', {minimumFractionDigits: 2})` en vista |

