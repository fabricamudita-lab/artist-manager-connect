## Diagnóstico

El filtro "Con presupuesto" en Discografía siempre devuelve vacío porque consulta una tabla equivocada.

En `src/hooks/useReleasesSearch.ts` (línea 158) se consulta `release_budgets`, que está **vacía** (0 filas). Los presupuestos reales se vinculan a los releases mediante:

- `budget_release_links` (4 filas) — bridge many-to-many actual ([Shared Release Budgets](mem://finanzas/shared-budgets-releases))
- `budgets.release_id` (3 filas) — vínculo directo legacy

## Solución

Reemplazar la consulta única a `release_budgets` por dos consultas en paralelo a las tablas correctas, uniendo los `release_id` resultantes en un único `Set`.

```ts
const [{ data: linkRows }, { data: directRows }] = await Promise.all([
  supabase
    .from('budget_release_links')
    .select('release_id')
    .in('release_id', releaseIds),
  supabase
    .from('budgets')
    .select('release_id')
    .in('release_id', releaseIds)
    .not('release_id', 'is', null),
]);

const releasesWithBudgets = new Set<string>([
  ...(linkRows?.map(b => b.release_id) || []),
  ...(directRows?.map(b => b.release_id) || []),
]);
```

El resto del filtrado (`with` / `without`) se mantiene igual.

## Fuera de alcance

- No tocar `release_budgets` (puede usarse en otros contextos).
- No modificar UI del filtro.
