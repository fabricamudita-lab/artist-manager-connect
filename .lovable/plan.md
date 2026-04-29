En `src/components/CreateSolicitudFromTemplateDialog.tsx` (formulario de solicitud de booking) ahora mismo:
- `booking_status` arranca implícitamente como `'interest'`.
- El usuario puede cambiarlo manualmente, pero nunca se promociona solo aunque introduzca un fee.

Cambios a aplicar:

1. Estado por defecto explícito = `interest`
   - Inicializar `booking_status: 'interest'` en el `setFormData` de inicialización del template `oferta` (línea ~248), para que quede explícito desde el primer render.

2. Auto-promoción a `offer` al introducir un fee
   - Detectar cuando el usuario rellena `fee` (deal_type `flat_fee`) o `door_split_percentage` (deal_type `door_split`) con un valor numérico > 0.
   - Si `booking_status` sigue siendo `'interest'` y el usuario aún no lo ha cambiado a mano, pasarlo automáticamente a `'offer'`.
   - Si el usuario vuelve a borrar el fee y no había tocado el estado manualmente, volver a `'interest'`.
   - El campo sigue siendo plenamente editable: si el usuario elige otro estado en el `BookingStatusCombobox`, marcamos `booking_status_touched = true` y la auto-promoción deja de actuar para esa solicitud.

3. Implementación técnica
   - Añadir flag interno `booking_status_touched` en `formData` (no se envía a la BD, se filtra al construir `solicitudData`).
   - Modificar el `onValueChange` del `BookingStatusCombobox` para activar `booking_status_touched: true`.
   - Añadir un `useEffect` que observe `formData.fee`, `formData.door_split_percentage`, `formData.deal_type` y `formData.booking_status_touched`, y ajuste `booking_status` automáticamente.

4. No tocar nada más
   - La lógica de mapeo `interest → interes`, `offer → oferta` (líneas ~452–458) ya soporta ambos valores.
   - El resto del flujo de aprobación / creación queda igual.

Resultado: al rellenar el formulario, por defecto verás `interest`. En cuanto pongas un fee, salta a `offer` automáticamente, pero podrás volver a cambiarlo manualmente y tu elección se respetará.