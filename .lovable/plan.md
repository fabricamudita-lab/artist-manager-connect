

## Pre-fill Contract Generator from Booking Data

### Problem
When opening the "Generador de Contratos" from a booking event, the "Artista" field and other available fields (formato, contacto/promotor) are left empty, even though the booking already has all this information.

### Solution

**1. Expand `BookingDocumentsTab` props to include artist info**

Update the `BookingDocumentsTabProps` interface to accept the artist name and additional booking fields:
- Add `artist_name?: string` (the stage_name or name from the joined artist)
- Add `artist_id?: string`  
- Add `formato?: string`
- Add `contacto?: string` (for promoter pre-fill)

**2. Update `getBookingDataForContract()` in `BookingDocumentsTab.tsx`**

Change `artista: ''` to use the artist name passed via props. Map all available fields:
- `artista` -> artist stage_name or name
- `formato` -> booking.formato
- `promotor` -> booking.promotor or booking.contacto

**3. Update `BookingFilesDocsTab` to pass the new props through**

Add the new fields to the `BookingFilesDocsTabProps` interface and forward them to `BookingDocumentsTab`.

**4. Update `BookingDetail.tsx` to pass artist info**

When rendering `BookingFilesDocsTab`, pass the artist name from `booking.artist?.stage_name || booking.artist?.name`.

### Files to modify

| File | Change |
|------|--------|
| `src/components/booking-detail/BookingDocumentsTab.tsx` | Add artist_name/formato/contacto to props, fill `artista` field |
| `src/components/booking-detail/BookingFilesDocsTab.tsx` | Pass new fields through to BookingDocumentsTab |
| `src/pages/BookingDetail.tsx` | Pass artist name and extra fields to BookingFilesDocsTab |

### What this fixes
- "Artista" field auto-fills with the booking's artist name
- "Ciudad", "Venue", "Evento/Festival", "Fee", "Hora", "Duracion" already work (confirmed in code)
- "Formato" will now also pre-fill if available
- Promotor/Contacto data will pre-fill from booking

