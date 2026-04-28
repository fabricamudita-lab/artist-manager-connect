# Mostrar "Disponible" del presupuesto principal en la tarjeta de Gastos

## Objetivo
En la barra de Quick Stats del detalle de booking, la tarjeta naranja de "Gastos Est." actualmente solo muestra el campo manual `gastos_estimados` o un botón "Estimar gastos". Cuando exista un **presupuesto principal** vinculado al booking, esa tarjeta debe pasar a mostrar la información real y útil del presupuesto: **Disponible** (Capital − Comprometido), con Capital como referencia secundaria.

## Comportamiento propuesto

Prioridad de contenido en la tarjeta naranja (en orden):

1. **Si hay presupuesto principal** (`is_primary_for_booking = true`):
   - Etiqueta: `Disponible` (en lugar de "Gastos Est.")
   - Valor grande: `kpi.disponible` formateado en EU (`€XX.XXX,XX`), en verde si ≥ 0, rojo si < 0
   - Sub-línea pequeña: `Capital €X · Comprometido €Y`
   - La tarjeta es clicable y navega a la pestaña Presupuesto
2. **Si no hay presupuesto principal pero sí `gastos_estimados`**: comportamiento actual (label "Gastos Est." + valor)
3. **Si no hay nada**: botón actual "Estimar gastos" que abre EditBookingDialog

## Detalles técnicos

**Archivo**: `src/pages/BookingDetail.tsx` (líneas ~562-584).

**Carga de datos del presupuesto principal**:
- Añadir un `useQuery` (ya se usa `@tanstack/react-query`) con clave `['booking-primary-budget', bookingId]`:
  - `SELECT id, name, fee FROM budgets WHERE booking_offer_id = :id AND is_primary_for_booking = true LIMIT 1`
  - Si existe, segundo fetch: `SELECT quantity, unit_price, iva_percentage FROM budget_items WHERE budget_id = :primaryId`
- Cálculo (idéntico al usado en `BookingPresupuestoTab.calcKPIs`):
  - `capital = budget.fee || 0`
  - `comprometido = Σ (quantity * unit_price * (1 + iva/100))` sobre todos los items
  - `disponible = capital - comprometido`
- Reutilizar el formateador EU existente o `Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' })`.

**Render condicional (pseudocódigo del JSX en la card naranja)**:
```text
if (primaryBudget) {
  → Label "Disponible" + valor grande coloreado
  → onClick: setActiveTab('presupuesto') o cambiar a la pestaña Presupuesto
  → Sub-línea: "Capital €X · Comprometido €Y"
} else if (booking.gastos_estimados) {
  → Render actual
} else {
  → Botón "Estimar gastos" actual
}
```

**Invalidación**: tras cambios en la pestaña Presupuesto (crear/editar items, cambiar principal), invalidar la query `['booking-primary-budget', bookingId]` para mantener sincronizado el header.

## Lo que NO cambia
- La pestaña "Presupuesto" sigue siendo la fuente de verdad detallada.
- El campo `gastos_estimados` sigue existiendo y editable desde EditBookingDialog (para bookings sin presupuesto formal).
- No se modifica el esquema de base de datos.
