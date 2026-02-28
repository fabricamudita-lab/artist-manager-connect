

## Restaurar pie chart completo y arreglar etiquetas

### Problema
Quieres mantener el grafico circular completo (sin agujero en el centro), pero las etiquetas de texto se superponen cuando hay muchas categorias.

### Solucion
Revertir el donut a un pie chart lleno (quitando `innerRadius`), pero **sin etiquetas sobre el grafico**. Toda la informacion de categorias se muestra en la leyenda lateral que ya existe, evitando cualquier superposicion.

### Cambios en `src/components/BudgetDetailsDialog.tsx`

Un unico cambio en la configuracion del componente `<Pie>` (linea ~4127):

- Eliminar `innerRadius={50}` para que vuelva a ser un circulo completo
- Mantener `outerRadius={85}` y `paddingAngle={2}` para buena separacion visual
- Mantener la leyenda lateral con nombre, importe y porcentaje (sin etiquetas sobre el grafico)

### Resultado
Grafico circular completo como antes, pero sin texto superpuesto. La informacion de cada categoria se lee claramente en la leyenda lateral derecha.
