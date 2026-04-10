

## Sincronizar fecha y datos del evento del booking con los presupuestos vinculados

### Problema
Cuando se edita un booking (fecha, ciudad, venue, etc.) en `EditBookingDialog`, solo se sincroniza el **fee** con los presupuestos vinculados (líneas 331-342). La fecha (`event_date`), ciudad, venue, hora y otros campos del evento no se actualizan en los presupuestos, causando que las fechas no coincidan.

### Causa raíz
En `src/components/booking-detail/EditBookingDialog.tsx`, líneas 331-342:
```typescript
// Solo sincroniza el fee
if (formData.fee !== booking.fee) {
  await supabase.from('budgets').update({ fee: formData.fee })
    .eq('booking_offer_id', booking.id);
}
```
Faltan los demás campos: `event_date`, `event_time`, `city`, `country`, `venue`, `festival_ciclo`, `formato`.

### Solución
**Archivo: `src/components/booking-detail/EditBookingDialog.tsx`** (líneas ~331-342)

Ampliar la sincronización para incluir todos los campos relevantes del evento cuando cambien:

```typescript
// After saving booking, sync relevant fields to linked budgets
const budgetSync: Record<string, any> = {};
if (formData.fee !== booking.fee) budgetSync.fee = formData.fee;
if (formData.fecha !== booking.fecha) budgetSync.event_date = formData.fecha;
if (formData.hora !== booking.hora) budgetSync.event_time = formData.hora;
if (formData.ciudad !== booking.ciudad) budgetSync.city = formData.ciudad;
if (formData.pais !== booking.pais) budgetSync.country = formData.pais;
if ((formData.venue || formData.lugar) !== (booking.venue || booking.lugar)) 
  budgetSync.venue = formData.venue || formData.lugar;
if (formData.festival_ciclo !== booking.festival_ciclo) budgetSync.festival_ciclo = formData.festival_ciclo;
if (formData.formato !== booking.formato) budgetSync.formato = formData.formato;

if (Object.keys(budgetSync).length > 0) {
  const { error: budgetError } = await supabase
    .from('budgets')
    .update(budgetSync)
    .eq('booking_offer_id', booking.id);
  
  if (budgetError) {
    console.error('Error syncing to budgets:', budgetError);
    toast.error('Booking guardado, pero error al sincronizar presupuesto');
  }
}
```

### Resultado
Cuando se edite la fecha (u otro campo del evento) en un booking, los presupuestos vinculados se actualizarán automáticamente para mantener la coherencia.

