

## Plan: Crear solicitudes desde el detalle de Booking

### Contexto
En `/booking/:id` la pestaña **Solicitudes** muestra "No hay solicitudes vinculadas" sin acción para crear. El módulo de Solicitudes ya existe (tabla `solicitudes`, kanban, dialog de creación). Falta el puente desde Booking.

### Exploración necesaria al implementar
- Localizar el componente que renderiza la pestaña "Solicitudes" del booking detail (probablemente `src/components/booking/BookingSolicitudesTab.tsx` o similar) y el diálogo de creación existente en el módulo de Solicitudes (p. ej. `CreateSolicitudDialog`).
- Confirmar el campo de vinculación booking↔solicitud en la tabla `solicitudes` (booking_id o similar). Si no existe, añadirlo vía migración.

### Cambios

**1. Botón "Nueva solicitud" en la pestaña**
- Añadir botón primario arriba a la derecha del card "Solicitudes" del booking detail.
- Texto: `+ Nueva solicitud`. Abre el diálogo de creación reutilizando el existente.

**2. Reutilizar el diálogo de creación**
- Pasar al diálogo props con contexto pre-rellenado:
  - `booking_id` del booking actual
  - `artist_id` heredado del booking
  - `project_id` si el booking está vinculado a uno
  - Tipo por defecto: `booking` (editable)
- Tras crear, refrescar la lista de solicitudes del booking.

**3. Vinculación a booking**
- Si `solicitudes.booking_id` no existe, migración para añadirlo (`uuid`, FK a `bookings`, nullable, index).
- Filtrar la lista mostrada en la pestaña por `booking_id = current`.

**4. UX vacío mejorado**
- Reemplazar el texto plano "No hay solicitudes vinculadas" por estado vacío con icono + CTA `Crear primera solicitud` que dispara el mismo diálogo.

**5. Listado activo**
- Mostrar tarjetas compactas de las solicitudes vinculadas (tipo, estado con badge de color, fecha límite, solicitante).
- Click en tarjeta → navega a `/solicitudes?open=<id>` o abre detalle inline.

### Archivos
| Archivo | Cambio |
|---|---|
| `supabase/migrations/*` (si falta `booking_id`) | Añadir columna `booking_id` a `solicitudes` + índice |
| Componente de la pestaña Solicitudes en booking detail | Botón "Nueva solicitud", estado vacío con CTA, listado filtrado por booking |
| Diálogo de creación de solicitudes existente | Aceptar props `bookingId`, `artistId`, `projectId`, `defaultTipo` para pre-rellenar |

