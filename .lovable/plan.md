

## Mejoras en creditos para Label Copy profesional

El objetivo es enriquecer el sistema de creditos para soportar toda la informacion que necesita un label copy profesional: estudio de grabacion por credito, detalle de instrumento, metadatos de grabacion por cancion, y lineas P/C a nivel de release.

---

### 1. Migracion de base de datos

**Tabla `track_credits` - nuevas columnas:**
- `instrument_detail` (text, nullable): Detalle libre del instrumento/rol, ej. "Voz, Trombon y Arreglo de Cuerdas"
- `studio` (text, nullable): Estudio donde grabo, ej. "Estudis Ground" o "Santa Rita Records (Mataro)"

**Tabla `tracks` - nuevas columnas:**
- `rec_period` (text, nullable): Periodo de grabacion, ej. "Abril 2024"
- `recorded_at` (text, nullable): Estudio(s) de grabacion, ej. "Estudis Ground (Cornella de Terri), Santa Rita Records (Mataro), Spain"
- `p_line` (text, nullable): Linea (P), ej. "(P) De Esta Edicion 2024 Sony Music..."
- `repertoire_owner` (text, nullable): Propietario del repertorio, ej. "Rita Payes Roma (License)"

**Tabla `releases` - nuevas columnas:**
- `c_line` (text, nullable): Linea (C) a nivel de release
- `p_line` (text, nullable): Linea (P) a nivel de release

Se crea una migracion SQL para agregar estas columnas.

---

### 2. Actualizar tipos TypeScript

**`src/hooks/useReleases.ts`:**
- Agregar `instrument_detail`, `studio` a la interfaz `TrackCredit`
- Agregar `rec_period`, `recorded_at`, `p_line`, `repertoire_owner` a la interfaz `Track`
- Agregar `c_line`, `p_line` a la interfaz `Release`

---

### 3. Formulario de creditos mejorado

**`src/components/credits/AddCreditWithProfileForm.tsx`:**
- Agregar campo opcional "Detalle de instrumento" (Input, placeholder: "Ej. Voz, Trombon y Arreglo de Cuerdas")
- Agregar campo opcional "Estudio" (Input, placeholder: "Ej. Estudis Ground")
- Ambos campos se muestran debajo del selector de rol
- Pasar `instrument_detail` y `studio` en el `onSubmit`

**`src/pages/release-sections/ReleaseCreditos.tsx` - SortableCreditRow:**
- Mostrar `instrument_detail` debajo del nombre cuando existe (texto gris mas pequeno)
- Mostrar `studio` con prefijo "At" cuando existe
- En modo edicion: agregar campos para editar `instrument_detail` y `studio`

---

### 4. Formularios de cancion mejorados

**CreateTrackForm y EditTrackForm** (dentro de `ReleaseCreditos.tsx`):
- Agregar seccion colapsable "Datos de grabacion" con:
  - Periodo de grabacion (Input, placeholder: "Ej. Abril 2024")
  - Lugar de grabacion (Input, placeholder: "Ej. Estudis Ground, Santa Rita Records, Spain")
  - Linea (P) (Input, placeholder: "(P) De Esta Edicion 2024...")
  - Propietario del repertorio (Input, placeholder: "Ej. Rita Payes Roma (License)")

---

### 5. Campos P-line y C-line a nivel de release

**`src/pages/ReleaseDetail.tsx`:**
- Agregar campos editables para C-line y P-line en la seccion de informacion del release (junto a UPC, sello, etc.)

---

### 6. Actualizar exportacion Label Copy PDF

**`src/utils/exportLabelCopyPDF.ts`:**
- Agregar C-line y P-line del release en la cabecera
- Por cada cancion: renderizar los creditos con `instrument_detail` en lugar del rol generico cuando exista (ej. "Voz, Trombon y Arreglo de Cuerdas: Rita Payes" en vez de "Violin: Rita Payes")
- Agregar "At [studio]" despues del nombre cuando el credito tiene estudio
- Agregar al final de cada cancion: Rec Period, Recorded at, P-line, Repertoire Owner
- Actualizar las interfaces para incluir los nuevos campos

---

### 7. Actualizar la llamada al export desde ReleaseCreditos

**`src/pages/release-sections/ReleaseCreditos.tsx` - handleExportLabelCopy:**
- Pasar `instrument_detail` y `studio` en los creditos al PDF
- Pasar `rec_period`, `recorded_at`, `p_line`, `repertoire_owner` en los tracks al PDF

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Agregar columnas a track_credits, tracks, releases |
| `src/hooks/useReleases.ts` | Actualizar interfaces Track, TrackCredit, Release |
| `src/components/credits/AddCreditWithProfileForm.tsx` | Campos instrument_detail y studio |
| `src/pages/release-sections/ReleaseCreditos.tsx` | Mostrar/editar nuevos campos, formularios de track mejorados, export actualizado |
| `src/utils/exportLabelCopyPDF.ts` | Renderizar instrument_detail, studio, metadatos de grabacion, P/C lines |
| `src/pages/ReleaseDetail.tsx` | Campos C-line y P-line editables |

