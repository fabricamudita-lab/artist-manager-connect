

## Agrupar créditos del mismo intérprete en una sola fila

Cuando la misma persona aparece varias veces dentro de una categoría (ej: Vicente López como Guitarra y como Coros en "Intérprete"), se consolidarán visualmente en una sola fila mostrando todos los roles juntos.

### Resultado visual esperado

```text
Vicente López ✓
  Guitarra y Coros   [Intérprete]         ✓  🗑
```

En lugar de dos filas separadas para la misma persona.

### Enfoque técnico

**Archivo**: `src/pages/release-sections/ReleaseCreditos.tsx`

1. **Agrupar créditos por nombre dentro de cada categoría**: En el `useMemo` de `creditsByCategory`, tras agrupar por categoría, crear un segundo paso que agrupe los créditos con el mismo `name` (o `contact_id` si existe) dentro de cada categoría.

2. **Renderizar fila consolidada**: En la vista normal (no edición), cuando un nombre tiene múltiples roles en la misma categoría, mostrar los roles concatenados con "y" (ej: "Guitarra y Coros") en lugar de una fila por cada uno.

3. **Mantener funcionalidad individual**: Cada crédito subyacente sigue siendo independiente en la base de datos. La agrupación es puramente visual. Al hacer clic para editar o eliminar, se mostrará un desplegable o se expandirán las filas individuales para operar sobre cada crédito por separado.

4. **Drag & drop**: Se mantiene el drag & drop a nivel de grupo (mueve todos los créditos del mismo nombre juntos).

### Cambios concretos

- Crear un tipo `GroupedCredit` con `name`, `credits: TrackCredit[]`, `roles: string[]`
- Función `groupCreditsByName(credits)` que agrupa por `contact_id` (si existe) o `name`
- Modificar el renderizado en cada categoría para usar grupos en lugar de créditos individuales
- En la fila consolidada, mostrar roles con `roles.join(' y ')` y badges/acciones del primer crédito del grupo
- Al eliminar un grupo con múltiples créditos, preguntar si eliminar todos o mostrar las opciones individuales

