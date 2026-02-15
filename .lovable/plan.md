
# Mostrar actividad vinculada en el perfil de contacto (Equipos)

## Problema

Cuando haces clic en un miembro de tipo contacto en Equipos, se abre el `ContactProfileSheet` que solo muestra datos personales (nombre, email, telefono, etc.) y configuracion de equipo. No muestra la actividad vinculada: presupuestos, bookings, canciones, proyectos, etc.

Mientras tanto, el componente `TeamMemberActivityDialog` ya tiene toda la logica para buscar esa actividad (song splits, track credits, budget items, bookings, proyectos), pero solo se usa para miembros de tipo "user" (workspace members).

## Solucion

Integrar la seccion de actividad vinculada directamente dentro del `ContactProfileSheet`, reutilizando la misma logica de consultas que ya existe en `TeamMemberActivityDialog`.

## Cambios

### 1. `src/components/ContactProfileSheet.tsx`

Agregar una nueva seccion "Actividad vinculada" al final del sheet que muestre:
- Canciones / Splits (song_splits + track_credits donde contact_id = contactId)
- Presupuestos (budget_items donde contact_id = contactId)
- Bookings (booking_offers donde el nombre del contacto aparece en tour_manager o contacto)
- Proyectos (ya se cargan via project_team, pero mostrar con mas detalle)
- Solicitudes (solicitudes donde contact_id o promotor_contact_id = contactId)

La logica sera similar a `TeamMemberActivityDialog.fetchAllActivity()` pero integrada como una seccion del sheet con tarjetas compactas y conteos por tipo, usando un tab system ligero o secciones colapsables.

### 2. Datos a cargar

Se agregaran las siguientes queries al efecto de carga del sheet:
- `song_splits` filtrado por `collaborator_contact_id`
- `track_credits` filtrado por `contact_id`
- `budget_items` filtrado por `contact_id`
- `booking_offers` filtrado por nombre (ilike)
- `solicitudes` filtrado por `contact_id` o `promotor_contact_id`

### 3. UI

Cada seccion mostrara:
- Icono + titulo + conteo
- Lista de tarjetas compactas con nombre, tipo/estado, fecha
- Links navegables a la pagina correspondiente

No se modificara ninguna otra funcionalidad existente del sheet.

### Archivos afectados

- `src/components/ContactProfileSheet.tsx` - Agregar seccion de actividad con queries y UI
