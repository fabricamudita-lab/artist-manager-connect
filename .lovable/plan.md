

## Sincronizar fee de booking con caché de presupuestos

### Problema
Cuando se edita el fee en el diálogo de edición del booking, el campo "Caché" del presupuesto vinculado no se actualiza. No hay ningún aviso al usuario de que el cambio podría afectar presupuestos existentes.

### Solución

**Archivo: `src/components/booking-detail/EditBookingDialog.tsx`**

1. En `saveBooking()`, después de guardar el booking exitosamente, detectar si el `fee` cambió (`formData.fee !== booking.fee`).
2. Si cambió, buscar presupuestos vinculados con `booking_offer_id = booking.id`.
3. Si existen presupuestos vinculados, **antes de guardar** mostrar un `AlertDialog` de confirmación con el mensaje:
   - "El fee ha cambiado de €X a €Y. Esto actualizará el Caché en N presupuesto(s) vinculado(s). ¿Deseas continuar?"
4. Si el usuario confirma, tras guardar el booking, ejecutar un UPDATE en `budgets` para sincronizar el campo `fee` en todos los presupuestos con `booking_offer_id = booking.id`.

### Flujo modificado

```text
Usuario cambia fee → Click "Guardar"
  ↓
¿Fee cambió Y hay presupuestos vinculados?
  → Sí: Mostrar AlertDialog de confirmación
       → Confirma: Guardar booking + UPDATE budgets.fee
       → Cancela: Volver al formulario
  → No: Guardar normalmente
```

### Cambios técnicos

- Añadir estado `showFeeWarning` para controlar el alert.
- En `handleSave`, antes de llamar a `saveBooking`, comprobar si fee cambió y hay budgets vinculados (query rápida de count).
- En `saveBooking`, tras el update del booking, si fee cambió, hacer `supabase.from('budgets').update({ fee: formData.fee }).eq('booking_offer_id', booking.id)`.
- Añadir un `AlertDialog` con icono `AlertTriangle` (ya importado) y texto descriptivo.

### Archivo afectado
- `src/components/booking-detail/EditBookingDialog.tsx`

