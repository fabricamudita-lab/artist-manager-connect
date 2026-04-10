

## Sincronizar fecha del presupuesto con el booking vinculado

### Problema
El presupuesto "CurtCircuit" muestra fecha 19 de febrero, pero el booking vinculado tiene fecha 27 de marzo. El presupuesto se creó con una fecha anterior y, aunque existe lógica de sincronización al editar el booking, esa sincronización no se ejecutó retroactivamente para presupuestos creados antes de implementarla.

### Causa raíz
- La sincronización booking → budget solo ocurre al **editar** el booking (en `EditBookingDialog`).
- Si el presupuesto se creó antes de que existiera la sincronización, o si la fecha del booking se modificó por otra vía, el `event_date` del presupuesto queda desactualizado.

### Solución (3 partes)

**1. Sincronización al abrir el presupuesto desde booking** (`BookingPresupuestoTab.tsx`)
- Tras cargar los presupuestos vinculados (`booking_offer_id = bookingId`), comparar `budget.event_date` con la fecha real del booking (prop `eventDate`).
- Si difieren, actualizar automáticamente el `event_date` (y otros campos clave: `fee`, `city`, `venue`) en los presupuestos vinculados. Esto es silencioso porque el booking es la fuente de verdad.

**2. Sincronización al abrir `BudgetDetailsDialog` desde cualquier sitio**
- Si el presupuesto tiene `booking_offer_id`, hacer un fetch rápido del booking para verificar que `event_date`, `fee`, etc. están sincronizados. Si no, actualizar el presupuesto automáticamente.

**3. Fix de datos existentes** (inmediato)
- Actualizar en la query de `BookingPresupuestoTab` los presupuestos cuyo `event_date` difiere del booking.

### Detalle técnico

En `BookingPresupuestoTab.tsx`, después de obtener los presupuestos vinculados:
```typescript
// Auto-sync date/fields from booking to linked budgets
if (eventDate) {
  const outOfSync = combined.filter(
    b => b.booking_offer_id === bookingId && b.event_date !== eventDate
  );
  if (outOfSync.length > 0) {
    await supabase
      .from('budgets')
      .update({ event_date: eventDate, city: eventCity, venue: eventVenue, fee: fee })
      .in('id', outOfSync.map(b => b.id));
  }
}
```

### Resultado
- Los presupuestos vinculados a un booking siempre reflejan la fecha real del evento.
- La sincronización es automática y silenciosa (el booking es la fuente de verdad).
- No se requiere intervención manual del usuario.

