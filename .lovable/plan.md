
## Problema

En el proyecto **PLAYGRXVND** (y en cualquier proyecto cuyos presupuestos vengan de bolos del módulo Booking), la pestaña **Finanzas** muestra todo en `0 €` aunque haya datos reales.

### Causa raíz (verificada en BD)

PLAYGRXVND tiene 4 presupuestos vinculados (`budgets.project_id = ...`):

| Presupuesto | Fee | `budget_status` | `show_status` | `booking_offer_id` → `phase` |
|---|---|---|---|---|
| Presupuesto - CurtCircuit | 3.818 € | `null` | `null` | → **facturado** |
| Presupuesto - CurtCircuit | 3.045 € | `null` | `null` | → **facturado** |
| Pressupost Ultramar | 2.500 € | `nacional` | `pendiente` | → **confirmado** |
| Presupuesto - ChromatisM + Nox + Hobba | 0 € (items: 3.974,88 €) | `null` | `null` | – |

Suma real esperada: **9.363 € confirmados** y **~14.034 € de gastos ejecutados**. Lo que se muestra: `0 €` en todo.

Dos bugs encadenados en `src/pages/ProjectDetail.tsx`:

1. **Estado leído del lugar equivocado** (líneas 2303-2308). El cálculo filtra por `budget_status`/`show_status`, pero cuando un budget nace de una booking offer esos campos quedan `null` y el estado real vive en `booking_offers.phase` (`confirmado`/`facturado`/…). El selector de budgets tampoco trae `booking_offer_id`, así que no hay forma de cruzarlo.
2. **`gastosEjecutados` siempre = 0** (línea 2341). El reduce hace `b.budget_items || []`, pero la query de budgets (líneas 813 y 1138) no incluye `budget_items`. Aunque haya 45 items por casi 14.000 €, el array nunca llega.
3. **Carga independiente de booking offers** filtra por `bookingOffers.project_id = id` (línea 943). Las offers asociadas a budgets de proyecto suelen tener `project_id = null` (la conexión la hace el budget, no la offer), así que ese set viene vacío y `bookingExtraConfirmado` también queda en 0.

## Solución

### 1. Enriquecer la query de budgets

En las dos queries (`load()` ~línea 813 y la del refresh ~línea 1138) añadir:
- `booking_offer_id`
- `budget_items(quantity, unit_price)`
- `booking_offer:booking_offer_id(id, phase, fee)`

### 2. Derivar el estado efectivo de cada budget

Crear un helper local `getBudgetEffectiveStatus(b)` que devuelva `confirmado` / `negociacion` / `otros` aplicando esta cascada:

```text
1. Si b.booking_offer.phase ∈ {confirmado, facturado} → confirmado
2. Si b.booking_offer.phase ∈ {interes, oferta, negociacion} → negociacion
3. Si b.budget_status === 'confirmado' o b.show_status === 'confirmado' → confirmado
4. Si b.budget_status ∈ {negociacion, pendiente} o b.show_status ∈ {negociacion, pendiente} → negociacion
5. Resto → otros (no suma)
```

Aplicarlo en `presupuestosConfirmadosList` / `presupuestosNegociacionList` (líneas 2303-2310).

### 3. Usar el fee correcto

Para budgets con booking offer, preferir `b.booking_offer.fee` si `b.fee` es 0/null (es el caso del budget de Ultramar y similares).

### 4. Evitar doble conteo de booking offers extras

La sección de `bookingExtraConfList` (línea 2314) ya excluye offers que estén en algún budget. Mantener esa lógica intacta — sigue siendo correcta.

### 5. Calcular gastos ejecutados de verdad

Con `budget_items` ya en la query, el `reduce` actual (línea 2341) empezará a funcionar sin más cambios.

## Archivos a modificar

- `src/pages/ProjectDetail.tsx`
  - Query budgets en `load()` (~813): añadir `booking_offer_id`, `budget_items(quantity, unit_price)`, relación `booking_offer:booking_offer_id(phase, fee)`.
  - Misma actualización en la query de refresh (~1138).
  - Sustituir el bloque de cálculos de la pestaña Finanzas (líneas 2302-2310) por el helper `getBudgetEffectiveStatus` + fee con fallback al de la offer.

## Validación post-cambio

Para PLAYGRXVND deberíamos ver:
- INGRESOS CONFIRMADOS ≈ **9.363 €** (3 fuentes)
- EN NEGOCIACIÓN: 0 €
- GASTOS EJECUTADOS ≈ **14.034 €** (suma de los 45 items de los 4 budgets)
- BALANCE REAL = `cobrosCobrado − gastosEjecutados` (negativo, porque no hay cobros registrados aún)

Sin cambios visibles para proyectos cuyos budgets sí tienen `budget_status` rellenado (siguen entrando por la rama 3-4 del helper).
