

## Plan: Mostrar eventos de Booking en todas las vistas del Calendario

### Problema
Los booking offers solo aparecen en la **vista de mes** y el **panel de detalle por fecha**. Faltan en:
- **Vista de semana**: solo muestra events vinculados por `event_id`, no bookings directos
- **Vista de año** (`YearlyCalendar`): solo recibe `events`, ignora `bookingOffers`

Además, `fetchBookingOffers` no filtra por los artistas seleccionados, mostrando bookings de todos los artistas.

### Cambios

**Archivo: `src/pages/Calendar.tsx`**

1. **`fetchBookingOffers`**: Añadir filtro `.in('artist_id', selectedArtists)` para respetar el filtro de artistas. También añadir filtro por `phase` además de `estado` para cubrir ambos campos.

2. **Vista de semana (`renderWeekView`)**: 
   - En la sección "Todo el día", añadir los booking offers del día (los bookings no tienen hora, así que van como eventos de todo el día)
   - Renderizar con estilo amber (consistente con la vista mes)

3. **Vista de año (`YearlyCalendar`)**:
   - Convertir los booking offers a formato `Event` compatible y combinarlos con `events` antes de pasarlos al componente
   - O extender `YearlyCalendar` para aceptar también bookings (más limpio)

**Archivo: `src/components/YearlyCalendar.tsx`**
   - Añadir prop opcional `bookings` con los booking offers
   - En `getEventsForDate`, combinar events + bookings para el conteo y los indicadores de puntos

### Resultado
Los bookings aparecerán en las 3 vistas (semana, mes, año) y se filtrarán correctamente por artista seleccionado.

### Archivos afectados
- `src/pages/Calendar.tsx`
- `src/components/YearlyCalendar.tsx`

