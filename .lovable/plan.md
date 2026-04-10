

## Unificar cobros de Booking en Finanzas con PagoDialog

### Problema
Existen dos flujos separados para registrar cobros de booking:
1. **PagoDialog** (Booking detail/Kanban): Formulario completo con IRPF, anticipo+liquidación, método de cobro, referencia. Escribe en `booking_offers` + `cobros`.
2. **CobrosTab "Marcar como Cobrado"** (Finanzas > Cobros): Diálogo simple con solo fecha, importe y notas. Solo actualiza `estado_facturacion` en `booking_offers`, sin IRPF ni split.

El usuario quiere que al marcar un cobro de booking en Finanzas se use el mismo formulario PagoDialog.

### Cambios

**Archivo: `src/components/finanzas/CobrosTab.tsx`**

1. Importar `PagoDialog` en lugar del diálogo simple actual.
2. Cambiar el estado `markCobroId` por un estado que almacene el objeto booking completo necesario para PagoDialog (fetched desde `booking_offers` con todos los campos de pago: `anticipo_*`, `liquidacion_*`, `cobro_*`, etc.).
3. Cuando el usuario pulsa "Cobrado" en un cobro de tipo booking:
   - Buscar el booking original en `bookingCobros` (ya tenemos `booking_id`).
   - Hacer un fetch rápido de los campos de pago del booking (`anticipo_porcentaje`, `anticipo_estado`, etc.) ya que la query actual no los incluye.
   - Abrir `PagoDialog` con esos datos.
4. Para cobros **no-booking** (royalties, subvenciones, etc.), mantener el diálogo simple actual de "Marcar como Cobrado".
5. Eliminar el diálogo simple de "Marcar como Cobrado" para bookings (se reemplaza por PagoDialog).
6. En `onSuccess` del PagoDialog, invalidar las queries de `cobros` y `cobros-bookings`.

### Detalle técnico

- Ampliar la query de `cobros-bookings` para incluir los campos de pago: `anticipo_porcentaje, anticipo_importe, anticipo_estado, anticipo_fecha_esperada, anticipo_fecha_cobro, anticipo_referencia, liquidacion_importe, liquidacion_estado, liquidacion_fecha_esperada, liquidacion_fecha_cobro, liquidacion_referencia, cobro_estado, cobro_fecha, cobro_importe, comision_porcentaje`.
- Nuevo estado: `pagoBooking` (el booking completo para PagoDialog) en lugar de `markCobroId` para bookings.
- El diálogo simple se conserva solo para cobros manuales (no-booking).

### Resultado
- Al pulsar "Cobrado" en un cobro de booking en Finanzas, se abre el mismo PagoDialog con las mismas opciones (pago único / anticipo+liquidación, IRPF, método, etc.).
- Los cobros no vinculados a booking mantienen su flujo simple.
- Un solo formulario, una sola fuente de verdad.

