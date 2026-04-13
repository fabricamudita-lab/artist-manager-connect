

## Plan: Extraer duración del audio al subir una versión

### Problema
El campo `duration` en la tabla `tracks` nunca se rellena al subir audio. El generador de licencia IP ya usa `track.duration` para auto-completar la duración, pero como es `null`, el campo queda vacío.

### Solución

**Archivo: `src/pages/release-sections/ReleaseAudio.tsx`** — función `uploadVersion.mutationFn`

Después de insertar la versión en `track_versions` (línea 305), añadir lógica para:

1. Crear un elemento `Audio` temporal con la `publicUrl` del archivo subido.
2. Escuchar el evento `loadedmetadata` para obtener `audio.duration` (en segundos).
3. Actualizar `supabase.from('tracks').update({ duration: Math.round(audio.duration) }).eq('id', track.id)`.
4. Invalidar la query de tracks para refrescar los datos.

Esto se ejecuta solo si es la primera versión o la versión actual (`is_current_version`), para que la duración siempre refleje la versión activa.

```text
Upload audio → Insert track_version → Extract duration via Audio element
                                     → Update tracks.duration
                                     → Invalidate queries
```

### Cambios concretos

- ~15 líneas nuevas después de la línea 305 en `ReleaseAudio.tsx`
- Sin cambios en base de datos (el campo `duration` ya existe en `tracks`)
- Sin cambios en el generador de licencia (ya consume `track.duration`)

### Archivos afectados
- `src/pages/release-sections/ReleaseAudio.tsx`

