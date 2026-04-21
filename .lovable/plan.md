

## Plan: Pre-rellenar todos los campos al crear solicitud desde Booking

### Diagnóstico
Hoy `LinkedSolicitudesCard` ya pasa `bookingId`, `artistId`, `projectId` y `defaultTipo="booking"` a `CreateSolicitudDialog`, pero el diálogo solo usa `artistId` para el campo "Artista relacionado". El resto de campos (festival, venue, ciudad, país, fecha, hora, capacidad, fee, condiciones, formato, promotor) quedan vacíos. Además, en el screenshot aparece el toast "No se pudieron cargar los contactos" porque el `select` actual de contactos puede fallar por RLS o por cargar todos los contactos sin filtro.

### Cambios

**1. Aceptar el booking completo como prop opcional**
En `CreateSolicitudDialog`:
- Añadir prop opcional `bookingData?: Partial<BookingOffer>` (más rico que solo IDs).
- Mantener compatibilidad con las props actuales (`artistId`, `bookingId`, `projectId`, `defaultTipo`).

**2. Pre-rellenar `formData` cuando se abre con `bookingData`**
En el `useEffect` que reacciona a `open === true`, mapear desde el booking al `formData`:

| Campo del formulario | Origen en booking |
|---|---|
| `tipo` | `'booking'` (forzado) |
| `artist_id` | `booking.artist_id` |
| `nombre_festival` | `booking.festival_ciclo` |
| `lugar_concierto` | `booking.venue` ?? `booking.lugar` |
| `ciudad` | `booking.ciudad` |
| `pais` | `booking.pais` |
| `hora_show` | `booking.hora` |
| `capacidad` | `booking.capacidad?.toString()` |
| `formato` | `booking.formato` |
| `fee` | `booking.fee?.toString()` |
| `deal_type` | `'flat_fee'` (por defecto si hay fee) |
| `condiciones` | `booking.condiciones` |
| `observaciones` | `booking.info_comentarios` ?? `booking.notas` |
| `fechas_opcionales` | `[booking.fecha]` si existe |
| `promotor_contact_id` | resolver desde `booking.promotor` (texto) → buscar contacto coincidente, si no hay → modo `new` con `new_promotor.name = booking.promotor` |

**3. Pasar el booking completo desde `LinkedSolicitudesCard`**
- Añadir prop `booking?: BookingOffer` en `LinkedSolicitudesCard` y pasarlo como `bookingData` al diálogo.
- Desde `BookingDetail.tsx`, pasar `booking={booking}` además de los IDs ya existentes.

**4. Arreglar el error "No se pudieron cargar los contactos"**
- En el `useEffect` de `fetchContacts`, capturar errores y no mostrar toast destructivo si simplemente no hay contactos. Si el error real viene de RLS, hacer `select` más estricto: solo `id, name, company, email, phone` y filtrar por `category in ('promotor', 'venue')` para reducir volumen.
- Mostrar el toast solo cuando `error` existe y loggear con detalle.

**5. UX de confirmación visual**
- Cuando el diálogo se abre desde un booking, mostrar un pequeño banner informativo arriba: "📋 Datos pre-rellenados desde el booking [Festival – Venue]. Puedes editarlos antes de crear la solicitud."
- El selector de tipo y de artista quedan deshabilitados (locked) cuando viene `bookingData`, ya que no tiene sentido cambiarlos desde este contexto.

### Edge cases
- Si `booking.promotor` es texto libre y no coincide con ningún contacto → cambiar `promotor_tab` a `'new'` y rellenar `new_promotor.name`.
- Si `booking.fee` es `null` → dejar `fee` vacío y `deal_type='flat_fee'` por defecto.
- Si el usuario abre el diálogo, edita y cierra sin guardar, al reabrir debe volver a pre-rellenar (no conservar edición previa).

### Archivos
| Archivo | Cambio |
|---|---|
| `src/components/CreateSolicitudDialog.tsx` | Nueva prop `bookingData`, pre-relleno completo al abrir, locks en tipo/artista, banner informativo, fix de toast de contactos |
| `src/components/booking-detail/LinkedSolicitudesCard.tsx` | Nueva prop `booking`, pasarla al diálogo como `bookingData` |
| `src/pages/BookingDetail.tsx` | Pasar `booking={booking}` a `LinkedSolicitudesCard` |

