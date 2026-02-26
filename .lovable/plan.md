

## Motor de Ejecucion - Plan Unificado con Sistemas Existentes

### Inventario de lo que ya existe

El proyecto tiene **6 sistemas de alertas/avisos** que NO se deben romper:

1. **Tabla `notifications`** + hook `useNotifications` + `NotificationBell` (campana): Notificaciones persistentes en BD. El trigger `notify_solicitud_status_change` ya inserta aqui.
2. **Tabla `action_center`** + hook `useActionCenter`: Solicitudes/aprobaciones con workflow de estados (pending, approved, rejected...). Se usa en el sidebar para badges.
3. **`useBookingReminders`** + `ReminderBadge`: Avisos computados en cliente (contrato pendiente, link de venta, logistica) para bookings confirmados. Se muestra en Calendario y Booking.
4. **`useReleaseHealthCheck`**: Alertas computadas en cliente para lanzamientos (creditos, audio, cronograma, presupuestos).
5. **`AlertsBadge`** + `bookingValidations.ts`: Validaciones en tiempo real al editar una oferta de booking.
6. **Triggers de BD**: `on_booking_confirmed` (crea carpetas, presupuesto, transacciones), `check_pending_royalty_payments`.

### Estrategia de unificacion

El motor de ejecucion NO debe duplicar estos sistemas. Debe **reutilizar la tabla `notifications`** como destino de las alertas generadas, que es el canal "in_app" que ya existe y que el usuario ve en la campana.

```text
+----------------------------+
| automation_configs         |  <-- Ya existe (54 reglas configurables)
+----------------------------+
            |
            v
+----------------------------+
| Edge Function              |  <-- NUEVO: evaluate-automations
| (cron cada 6h)             |
+----------------------------+
            |
    +-------+-------+
    |               |
    v               v
+--------+   +-----------------+
| notifi-|   | automation_     |
| cations|   | executions (log)|
| (exist)|   | (NUEVO)         |
+--------+   +-----------------+
```

### Cambios concretos

#### 1. Nueva tabla `automation_executions` (log de deduplicacion)

Registra cada vez que el motor dispara una automatizacion para evitar duplicados.

```sql
CREATE TABLE automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  automation_key text NOT NULL,
  entity_id uuid NOT NULL,        -- ID del booking/release/artista afectado
  entity_type text NOT NULL,       -- 'booking_offer', 'release', 'artist', etc.
  notification_id uuid REFERENCES notifications(id),
  fired_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, automation_key, entity_id)
);
```

La constraint UNIQUE evita que la misma regla se dispare dos veces para la misma entidad.

#### 2. Edge Function `evaluate-automations`

Funcion que:
- Lee `automation_configs` activas del workspace
- Para cada una, ejecuta la query de evaluacion correspondiente
- Comprueba si ya se disparo (tabla `automation_executions`)
- Si no, inserta en `notifications` y registra en `automation_executions`

**Batch 1 - 5 automatizaciones de booking** (las mas directas con queries SQL):

| Clave | Query |
|-------|-------|
| `booking_offer_no_response` | Bookings en phase='interes', sin update en X dias |
| `booking_negotiation_stalled` | phase='negociacion', sin update en X dias |
| `booking_confirmed_no_contract` | estado='confirmado', sin documento tipo 'contrato' en booking_documents |
| `booking_invoice_missing` | estado='confirmado', fecha pasada, sin factura en booking_documents |
| `booking_signed_no_payment` | Contrato firmado, sin transaccion de tipo 'income' con status='completed' |

Cada query respeta el campo `artist_ids` de la config: si no esta vacio, filtra solo esos artistas.

#### 3. Cron job (pg_cron + pg_net)

Ejecutar la edge function cada 6 horas (suficiente para alertas medidas en dias).

```sql
SELECT cron.schedule(
  'evaluate-automations-6h',
  '0 */6 * * *',
  $$ SELECT net.http_post(...) $$
);
```

#### 4. Sin cambios en la UI existente

- Las notificaciones generadas apareceran automaticamente en la **campana** (`NotificationBell`) porque van a la tabla `notifications`.
- Los sistemas existentes (`useBookingReminders`, `useReleaseHealthCheck`, `AlertsBadge`, `action_center`) **no se tocan**.
- La pagina de Automatizaciones sigue funcionando igual (toggle on/off, config por artista, etc.).

#### 5. Relacion con sistemas existentes

- `useBookingReminders` es un sistema client-side que seguira funcionando en paralelo. Algunas automatizaciones se solapan (ej: contrato pendiente), pero el motor de BD actua aunque el usuario no tenga la app abierta, mientras que `useBookingReminders` solo funciona en el navegador.
- `useReleaseHealthCheck` tampoco se toca: es health-check visual de cada release, no genera notificaciones persistentes.
- `action_center` es para solicitudes con workflow de aprobacion, no para alertas automaticas.

### Archivos a crear/modificar

1. **Migracion SQL**: Crear tabla `automation_executions`
2. **`supabase/functions/evaluate-automations/index.ts`**: Edge function con las 5 queries de Batch 1
3. **SQL insert (pg_cron)**: Programar el cron cada 6 horas
4. **`supabase/config.toml`**: Registrar la nueva edge function con `verify_jwt = false`

### Lo que NO se toca

- `useBookingReminders`, `ReminderBadge` -- sin cambios
- `useReleaseHealthCheck` -- sin cambios
- `AlertsBadge`, `bookingValidations` -- sin cambios
- `useActionCenter`, `action_center` -- sin cambios
- `NotificationBell`, `useNotifications` -- sin cambios (solo recibe mas datos)
- `AutomationCard`, pagina `Automatizaciones` -- sin cambios

