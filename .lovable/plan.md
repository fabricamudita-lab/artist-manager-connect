

## Replace CityZen logo with MOODITA logo in contract PDFs

### Problem
The `BookingDocumentsTab` component imports and uses `cityzen-logo.png` when generating contract PDFs. This should use the MOODITA logo instead, matching the brand identity.

### Changes

**File: `src/components/booking-detail/BookingDocumentsTab.tsx`**
- Replace `import cityzenLogo from "@/assets/cityzen-logo.png"` with `import mooditaLogo from "@/assets/moodita-logo.png"`
- Update the `pdf.addImage(cityzenLogo, ...)` call to use `mooditaLogo` instead
- Update the comment referencing "Cityzen logo"

**File: `src/assets/cityzen-logo.png`**
- Delete this file since it will no longer be referenced anywhere

### Scope
This is the only place `cityzen-logo.png` is used. The `ContractGenerator` and `PublicArtistForm` already use `moodita-logo.png` correctly.
