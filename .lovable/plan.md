
# Fix: Deduplicar warnings del mismo tipo en múltiples presupuestos

## Causa raíz

El código genera correctamente **un warning por presupuesto** con key único (`track_count-{budgetId}`). El problema es que hay **3 presupuestos vinculados** con el mismo nombre "Presupuesto - La Flor de Déu" y todos tienen `n_tracks = 1`, mientras el release tiene 2 tracks.

Resultado: 3 warnings con mensajes idénticos, con keys distintos → se muestran los 3.

## Solución: Agrupar warnings del mismo tipo y título

En lugar de mostrar un card por cada presupuesto afectado, **agrupar los warnings por tipo y mensaje**, y mostrar uno solo que afecta a N presupuestos a la vez.

### Lógica de agrupación

Tras generar el array `w` en el `useMemo`, añadir un paso de agrupación:

```ts
// Agrupar warnings del mismo tipo + mismo título en uno solo
const grouped = new Map<string, InconsistencyWarning & { budgetIds?: string[] }>();

for (const warning of w) {
  const groupKey = `${warning.type}::${warning.title}`;
  if (grouped.has(groupKey)) {
    const existing = grouped.get(groupKey)!;
    // Añadir el budgetId al grupo
    existing.budgetIds = [...(existing.budgetIds || [existing.budgetId].filter(Boolean)), warning.budgetId].filter(Boolean) as string[];
  } else {
    grouped.set(groupKey, { ...warning, budgetIds: warning.budgetId ? [warning.budgetId] : [] });
  }
}

return [...grouped.values()];
```

### Cambios en la interfaz `InconsistencyWarning`

Añadir `budgetIds?: string[]` (plural) junto al `budgetId?: string` existente.

### Actualizar la descripción del warning agrupado

Cuando hay múltiples presupuestos afectados, el `detail` se actualiza para reflejarlo:

```ts
// Si hay más de un presupuesto con el mismo problema:
// ANTES: '"Presupuesto - La Flor de Déu" · Actualiza el número...'
// DESPUÉS: '3 presupuestos afectados · Actualiza el número...'
```

### Actualizar el botón "Actualizar presupuesto"

La acción `onResolveTrackCount` pasa a aceptar un array de IDs:

```ts
// Resolver todos los presupuestos afectados de una sola vez
const resolveTrackCount = async (budgetIds: string[]) => {
  for (const budgetId of budgetIds) {
    // mismo código actual pero en loop
  }
  toast.success(`${budgetIds.length} presupuesto(s) actualizados`);
  fetchLinkedBudgets();
};
```

### Actualizar la key del panel

La key del warning agrupado se convierte en la del primero del grupo (para que el dismiss funcione), pero al ignorar se añaden al `dismissedKeys` todas las keys del grupo.

## Cambios en `InconsistencyPanel`

El componente recibe `warnings` con la nueva propiedad `budgetIds`. Cuando `budgetIds.length > 1`:
- El botón "Actualizar presupuesto" pasa el array completo a `onResolveTrackCount`
- El texto del detalle dice "3 presupuestos afectados" en lugar del nombre

## Archivos a modificar

Solo **`src/pages/release-sections/ReleasePresupuestos.tsx`**:

1. Añadir `budgetIds?: string[]` a la interfaz `InconsistencyWarning`
2. Al final del `useMemo` de `warnings`: añadir paso de agrupación por `type + title`
3. Actualizar `resolveTrackCount` para aceptar `budgetIds: string[]` en lugar de `budgetId: string`
4. Actualizar `InconsistencyPanelProps` y la lógica del componente para pasar `budgetIds` a la acción
5. Al hacer dismiss de un warning agrupado, descartar todas las keys del grupo

Sin cambios en base de datos ni nuevos archivos.
