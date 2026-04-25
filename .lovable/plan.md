## Qué aparece hoy en el calendario

Actualmente el calendario (`/agenda`) muestra dos fuentes de datos:

1. **Eventos genéricos** (tabla `events`): creados manualmente desde el botón "+ Nuevo evento" o importados desde CSV / Google Calendar / Solicitudes. Pueden tener tipo libre (reunión, viaje, ensayo, personal…).
2. **Booking offers** (tabla `booking_offers`): conciertos del módulo de Booking en cualquier fase relevante (Interés → Cerrado, incluyendo Realizado y Facturado). Se pintan con icono 🎤.

Filtros disponibles: por artista, por proyecto, por equipo/departamento, "Mi calendario", "Ver todo".

Está previsto pero **no implementado todavía**:
- Lanzamientos (releases) y sus hitos del cronograma (milestones).
- Deadlines de pitch a distribuidoras.
- Eventos de marketing del lanzamiento.
- Pagos / vencimientos financieros.

---

## Propuesta: integrar Releases en el calendario

Añadir los lanzamientos como una **nueva capa visual** del calendario, siguiendo el mismo patrón que ya usamos para `booking_offers`.

### Qué se mostrará

Tres tipos de marcadores nuevos, visualmente diferenciados:

1. **💿 Fecha de lanzamiento** (`releases.release_date`)
   Color/badge propio (p. ej. violeta). Click → abre el detalle del release.
2. **🎯 Hitos del cronograma** (`release_milestones.due_date`)
   Master, artwork, entrega a distribuidora, pre-save, etc. Color según `status` (pendiente / en progreso / completado / retrasado).
3. **📨 Deadline de pitch** (`releases.pitch_deadline`) — opcional, si está definido.

Filtrables mediante un nuevo toggle en la barra de filtros: **"Mostrar lanzamientos"** (activo por defecto) con sub-opciones para hitos y pitch.

### Cómo se integran con los filtros existentes

- Se respetan los **artistas seleccionados** (los releases tienen `artist_id` y soportan multi-artista vía `release_artists`).
- Se respeta el filtro **"Mi calendario"**: solo se muestran si el usuario tiene acceso al artista (mismas reglas RBAC que ya usamos).
- Aparecen en las vistas **Semana, Mes y Año**.

### UX / Interacciones

- Click en un release → popover con título, tipo (Album/EP/Single), artista, estado y enlace "Abrir lanzamiento".
- Click en un hito → popover con título del hito, release al que pertenece, responsable y estado, con enlace al cronograma.
- Los releases en estado `archived` se ocultan por defecto.

### Tareas técnicas

1. **Hook nuevo** `useCalendarReleases.ts`:
   - Carga `releases` (campos: id, title, type, release_date, status, artist_id, cover_image_url) filtrados por `accessibleArtistIds`.
   - Carga `release_milestones` con `due_date` no nulo, filtrados por `release_id` de los releases accesibles.
   - Devuelve dos arrays normalizados.
2. **`Calendar.tsx`**: añadir estado `releases`, `milestones` y toggles `showReleases` / `showMilestones`. Llamar al hook tras conocer `accessibleArtistIds`.
3. **Helpers de render**: `getReleasesForDate`, `getMilestonesForDate`, análogos a `getBookingOffersForDate`.
4. **Pintado en celdas** de Semana/Mes/Año: añadir badges con icono y color propios, debajo de los booking offers.
5. **Popovers**: dos componentes pequeños `ReleaseDayPopover` y `MilestoneDayPopover` con enlace a `/releases/:id` y `/releases/:id?tab=cronograma`.
6. **Filtro en `CalendarToolbar`**: añadir checkboxes "Lanzamientos" y "Hitos de cronograma".

### Archivos a tocar

- `src/hooks/useCalendarReleases.ts` (nuevo)
- `src/pages/Calendar.tsx`
- `src/components/calendar/CalendarToolbar.tsx`
- `src/components/calendar/ReleaseDayPopover.tsx` (nuevo)
- `src/components/calendar/MilestoneDayPopover.tsx` (nuevo)

Sin cambios de base de datos — solo lectura de tablas existentes (`releases`, `release_milestones`).