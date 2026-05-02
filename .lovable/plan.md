## Fix: Error al guardar booking en fase "Negociación"

### Problema
El trigger `handle_booking_negotiation()` intenta insertar `'borrador'` en la columna `budget_status`, que es un enum que solo acepta `'nacional'` o `'internacional'`. Esto provoca rollback de la transacción al guardar el booking.

### Cambios

**1. Migración SQL** (`supabase/migrations/20260502130000_fix_handle_booking_negotiation.sql`)

- Redefine `public.handle_booking_negotiation()`:
  - `budget_status` se asigna correctamente vía CASE: `'internacional'` si `es_internacional = true`, sino `'nacional'`.
  - `'borrador'` se guarda en `status_negociacion` (columna text).
  - Vincula budget vía `booking_offer_id` (más fiable que match por nombre).
  - Bloque `EXCEPTION WHEN OTHERS` para que un fallo creando el budget nunca bloquee el UPDATE del booking (solo loggea warning).
- Añade índices para acelerar lookups del trigger:
  - `CREATE INDEX IF NOT EXISTS idx_budgets_booking_offer_id ON public.budgets(booking_offer_id);`
  - `CREATE INDEX IF NOT EXISTS idx_budgets_artist_id ON public.budgets(artist_id);`

### Consideraciones de seguridad / integración

- **Auth**: el trigger mantiene `SECURITY DEFINER` con `search_path = 'public'`. No cambia el modelo de permisos ni RLS. El UPDATE sigue gobernado por las políticas RLS existentes en `booking_offers`.
- **Validación**: la lógica del enum se valida vía CASE explícito (no se confía en input del cliente). Como es SQL parametrizado dentro de un trigger, no hay superficie de inyección.
- **Edge cases cubiertos**:
  - Booking sin `es_internacional` definido → default a `'nacional'`.
  - Fallo al crear budget → no bloquea el guardado del booking.
  - Re-entrada en fase "negociacion" → el trigger no duplica si ya existe budget vinculado por `booking_offer_id`.
- **Panel de usuario**: no afecta UI; el `EditBookingDialog` y `PaymentStatusCard` actuales seguirán funcionando. Los budgets creados quedan accesibles desde Finanzas y desde el detalle del booking igual que antes.
- **Separación de capas**: toda la lógica vive en el trigger DB; el frontend no necesita cambios.

### Verificación post-migración

1. Abrir el booking actual y cambiarlo a fase "Negociación" → debe guardar sin error.
2. Confirmar en `budgets` que se crea una fila con `booking_offer_id` correcto y `status_negociacion = 'borrador'`.
3. Re-guardar el booking → no debe duplicar budgets.

### Archivos
- **Crear**: `supabase/migrations/20260502130000_fix_handle_booking_negotiation.sql`

No se modifica código frontend.