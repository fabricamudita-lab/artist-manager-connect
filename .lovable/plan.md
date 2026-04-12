

## Plan: Tipo de Pitch (Single / Focus Track / Album Completo)

### Concepto
Cada pitch podrá tener un **tipo** (`single`, `focus_track`, `full_album`) y opcionalmente estar vinculado a una **canción específica** del release. Se permiten múltiples pitches para la misma canción o el mismo álbum.

### Reglas de negocio
- Si el release tiene **1 sola canción**: solo se ofrece "Single" (sin selector de canción, se vincula automáticamente)
- Si tiene **2+ canciones**: se ofrecen las 3 opciones
  - **Single**: requiere seleccionar una canción del release
  - **Focus Track**: requiere seleccionar una canción del release
  - **Album Completo**: no requiere seleccionar canción (`track_id = null`)

### Cambios

**1. Migración SQL — añadir columnas a `pitches`**
- `pitch_type TEXT DEFAULT 'full_album'` — valores: `single`, `focus_track`, `full_album`
- `track_id UUID REFERENCES release_tracks(id) ON DELETE SET NULL` — canción asociada (nullable)

**2. `src/hooks/usePitches.ts`**
- Añadir `pitch_type` y `track_id` al interface `Pitch`
- Incluir ambos campos en `useCreatePitch` y `useDuplicatePitch`

**3. `src/pages/release-sections/ReleasePitch.tsx`**
- Cargar las canciones del release (ya disponibles vía `useReleaseTracks`)
- En el **PitchEditor**: añadir selector de tipo + selector de canción (condicional)
- En la **lista de pitches**: mostrar el tipo y nombre de la canción junto al nombre del pitch (ej. "Pitch principal — Single: Mi Canción")
- Al crear un pitch nuevo: si solo hay 1 track, asignar `pitch_type: 'single'` y `track_id` automáticamente

**4. Formulario público (`PublicReleaseForm.tsx`)**
- Mostrar el tipo de pitch y la canción seleccionada en la info del formulario público
- Filtrar los datos mostrados según el tipo (ej. si es single, mostrar solo créditos de esa canción)

### Archivos afectados
- Nueva migración SQL
- `src/hooks/usePitches.ts` — tipo + track_id
- `src/pages/release-sections/ReleasePitch.tsx` — UI del selector
- `src/pages/PublicReleaseForm.tsx` — mostrar info del tipo

