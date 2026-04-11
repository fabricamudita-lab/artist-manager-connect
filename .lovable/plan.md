

## Fix: Las tarjetas KPI no deben recalcularse al filtrar por clic

### Problema
Al pulsar "Disponible Agregado", se filtra la lista de presupuestos y las tarjetas KPI se recalculan con los presupuestos filtrados, mostrando valores incorrectos (el disponible pasa de negativo a positivo porque excluye los presupuestos en rojo).

### Causa raíz
En `Budgets.tsx`, las `BudgetSummaryCards` reciben `filteredBudgets` que incluyen el `cardFilter`. Las tarjetas deberían recibir los presupuestos filtrados solo por artista/tipo/búsqueda, pero **no** por el filtro de tarjeta activa.

### Solución
Separar dos listas en `Budgets.tsx`:

1. **`budgetsForCards`**: filtrada por artista, tipo y búsqueda (sin `cardFilter`) — se pasa a `BudgetSummaryCards`
2. **`filteredBudgets`**: filtrada por todo incluyendo `cardFilter` — se usa para la tabla

### Cambio técnico (1 archivo)

**`src/pages/Budgets.tsx`**:
- Extraer la lógica de filtrado sin `cardFilter` como `budgetsForCards`
- Pasar `budgetsForCards` a `<BudgetSummaryCards budgets={...}>`
- Mantener `filteredBudgets` (con `cardFilter`) para la tabla

Esto asegura que los KPIs siempre muestren el dato real, independientemente de qué tarjeta esté activa como filtro.

