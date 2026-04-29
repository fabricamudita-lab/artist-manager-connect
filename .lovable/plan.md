## Problema

En el formulario de creación de solicitud de booking, el campo **"Estado del Booking"** muestra el valor `offer` (y otros como `interest`, `hold`, `confirmed`) en inglés. Esto ocurre porque ahí se está usando el componente genérico `BookingStatusCombobox`, que carga los valores crudos desde la tabla `booking_status_options` y los pinta tal cual.

Los valores internos del pipeline de booking (`interest`, `offer`, `hold`, `confirmed`) son correctos como identificadores en BD, pero al usuario hay que mostrarle etiquetas en español: **Interés, Oferta, Hold, Confirmado**.

## Solución

Reemplazar el `BookingStatusCombobox` dentro de `CreateSolicitudFromTemplateDialog.tsx` (sección "Estado y Aprobación") por un `Select` simple con las 4 opciones fijas del pipeline de booking, mostrando etiquetas en español pero guardando el valor interno en inglés (sin tocar la BD ni romper la lógica de auto-promoción `interest` → `offer` cuando hay fee).

### Cambios

**`src/components/CreateSolicitudFromTemplateDialog.tsx`** (líneas ~1132-1148):
- Sustituir `<BookingStatusCombobox …>` por un `<Select>` shadcn con items:
  - `interest` → "Interés"
  - `offer` → "Oferta"
  - `hold` → "Hold (reservado)"
  - `confirmed` → "Confirmado"
- Mantener `value={formData.booking_status || 'interest'}` y el mismo `onValueChange` (que marca `booking_status_touched: true`).
- Quitar el import de `BookingStatusCombobox` si deja de usarse en este archivo.

### Fuera de alcance

- No se modifica `BookingStatusCombobox` ni la tabla `booking_status_options` (se siguen usando en otras pantallas donde sí tiene sentido permitir estados libres).
- No se cambia la lógica de mapeo `statusToPhase` ni la auto-promoción por fee.
