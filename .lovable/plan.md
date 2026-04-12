

## Plan: Auto-nombrar pitch según tipo y canción seleccionada

### Qué cambia
Cuando el usuario selecciona un tipo de pitch o una canción, el nombre del pitch se actualiza automáticamente para reflejar la selección. Ejemplos:
- Single con canción "Ver el mundo pasar" → nombre: **"Ver el mundo pasar"**
- Focus Track con canción "Ver el mundo pasar" → nombre: **"Ver el mundo pasar"**
- Album Completo → nombre: **título del release** (ej. "Con una mano delante y otra detrás")
- Al crear un pitch con 1 sola canción → nombre = título de esa canción

El usuario sigue pudiendo editar el nombre manualmente después.

### Cambios en un solo archivo

**`src/pages/release-sections/ReleasePitch.tsx`**

1. **Al crear pitch** (`handleCreatePitch`): si hay 1 track, usar `tracks[0].title` como nombre en vez de "Nuevo Pitch". Si hay varias, usar `release.title`.

2. **Al cambiar tipo** (onValueChange del select de Tipo):
   - Si `full_album` → `setPitchName(release.title)` y guardar nombre junto con tipo
   - Si `single`/`focus_track` y ya hay un `trackId` seleccionado → buscar título del track y poner como nombre

3. **Al cambiar canción** (onValueChange del select de Canción):
   - Buscar el título del track seleccionado y `setPitchName(track.title)`, guardar nombre junto con track_id

4. **En `useCreatePitch`** (`usePitches.ts`): aceptar `name` ya existente (ya lo hace), solo asegurar que se pasa desde el componente.

### Archivos afectados
- `src/pages/release-sections/ReleasePitch.tsx` — lógica de auto-nombre en 3 puntos
- `src/hooks/usePitches.ts` — sin cambios (ya soporta `name`)

