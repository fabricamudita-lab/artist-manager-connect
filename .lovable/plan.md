

## Fix: Deteccion de contratos en Dashboard y Validaciones

### Problema
El dashboard dice "Booking sin contrato" para MOODITA, pero el contrato existe y esta firmado (2/2). La causa es un bug de inconsistencia en como se detectan los contratos:

1. **Dashboard** (`OwnerDashboard.tsx` linea 281): Busca documentos con `document_type = 'contrato'` (espanol)
2. **Documentos reales** (`BookingDocumentsTab.tsx` linea 540): Se guardan con `document_type = 'contract'` (ingles)

Nunca coinciden, asi que el dashboard siempre cree que no hay contrato.

Ademas, el sistema de validaciones (`bookingValidations.ts` linea 135) comprueba el campo legacy `offer.contratos` (un campo de texto en la tabla `booking_offers`) en vez de consultar la tabla `booking_documents`.

### Solucion

**1. Corregir el filtro del Dashboard**
Archivo: `src/components/dashboard/OwnerDashboard.tsx`

- Cambiar `.eq('document_type', 'contrato')` por `.eq('document_type', 'contract')` para que coincida con el valor real almacenado.

**2. Corregir la validacion de bookings**
Archivo: `src/lib/bookingValidations.ts`

- Eliminar la validacion basada en `offer.contratos` (campo legacy de texto).
- En su lugar, aceptar un parametro opcional `hasContract?: boolean` que indique si existe un documento de tipo `contract` en `booking_documents`.
- Si no se pasa el parametro, no emitir el error de contrato (fail-open para no romper otros usos).

**3. Pasar la info de contrato a la validacion**
Archivo: `src/pages/Booking.tsx` (o donde se llame a `validateBookingOffer`)

- Antes de validar, consultar `booking_documents` para saber que bookings tienen contrato, y pasar esa info a la funcion de validacion.

### Resultado
- El dashboard ya no mostrara falsas alertas de "sin contrato" cuando el contrato existe.
- Las validaciones reflejaran correctamente el estado real de los documentos.

