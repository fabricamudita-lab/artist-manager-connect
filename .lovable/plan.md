

## Mostrar el formato correcto (concierto) en presupuestos de booking

### Problema

Cuando se abre un presupuesto desde la pestaña de Booking, se muestra con el formato de "proyecto" (CAPITAL / PAGADO / COMPROMETIDO / DISPONIBLE) en vez del formato de "concierto" (CACHÉ / PRESUPUESTO / GASTOS REALES / BENEFICIO / MARGEN).

**Causa raíz**: la query en `BookingPresupuestoTab.tsx` solo selecciona 7 campos (`id, name, fee, expense_budget, budget_status, booking_offer_id, project_id`), sin incluir `type`. Al pasar el budget a `BudgetDetailsDialog`, `budget.type` es `undefined`, por lo que `isConcert` es `false` y se renderiza la vista de producción.

### Solución

**Archivo: `src/components/booking-detail/BookingPresupuestoTab.tsx`**

Ampliar los `select()` de las 3 queries (directBudgets, projectBudgets, fuzzyBudgets) para incluir todos los campos que `BudgetDetailsDialog` necesita:

```
.select('id, name, type, fee, expense_budget, budget_status, booking_offer_id, project_id, city, country, venue, show_status, internal_notes, created_at, artist_id, event_date, event_time, formato')
```

Esto asegura que `budget.type === 'concierto'` se evalúe correctamente y se muestre el layout con CACHÉ, BENEFICIO y MARGEN propio de eventos de booking.

Un solo archivo afectado, 3 líneas cambiadas (una por cada query).

