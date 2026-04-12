

## Plan: Multi-Pitch por Release + Fix Build Error

### Contexto
Actualmente los datos del pitch viven directamente en la tabla `releases` (synopsis, mood, pitch_token, pitch_config, pitch_status, etc.), lo que limita a un solo pitch por release. El usuario necesita crear varios pitches por release (ej. propuestas distintas para un mismo single, o pitches para tracks individuales).

Además, hay un error de build persistente en `ArtistInfoDialog.tsx` por caché obsoleta que se resolverá con un re-save del archivo.

---

### 1. Nueva tabla `pitches`

Migración SQL que:
- Crea tabla `pitches` con todos los campos que hoy están en `releases`: `synopsis`, `mood`, `country`, `spotify_strategy`, `spotify_monthly_listeners`, `spotify_followers`, `spotify_milestones`, `general_strategy`, `social_links`, `pitch_status`, `pitch_deadline`, `pitch_token`, `pitch_config`, `name` (nombre del pitch, ej. "Propuesta Ditto", "Propuesta Altafonte")
- FK a `releases(id)` con `ON DELETE CASCADE`
- FK a `user_id` para RLS
- Índice único en `pitch_token`
- RLS: owner puede CRUD, anon puede leer/actualizar por token
- Migra datos existentes de `releases` a `pitches` (un pitch por release que tenga datos)

### 2. Hook `usePitches`

Nuevo hook en `src/hooks/usePitches.ts`:
- `usePitchesByRelease(releaseId)` — lista de pitches
- `usePitch(pitchId)` — pitch individual
- `useCreatePitch()` — crear pitch (con nombre y release_id)
- `useUpdatePitch()` — actualizar (con opción `silent`)
- `useDeletePitch()` — eliminar

### 3. Refactor `ReleasePitch.tsx`

Cambia de editor de un solo pitch a **listado + editor**:
- Vista inicial: lista de pitches del release con nombre, estado y fecha
- Botón "Nuevo Pitch" para crear uno
- Al hacer clic en un pitch, se abre el editor (mismo formulario actual)
- Cada pitch tiene su propio token y enlace público
- Posibilidad de duplicar un pitch existente

### 4. Refactor `PublicReleaseForm.tsx`

- Cambia la query de buscar en `releases` por `pitch_token` a buscar en `pitches`
- Carga datos del release asociado (título, cover, artista) vía join o query secundaria
- Guarda cambios en la tabla `pitches` en vez de `releases`

### 5. Fix build error `ArtistInfoDialog.tsx`

Re-save del archivo para forzar recompilación y limpiar el error de caché.

### 6. Actualizar rutas

- `/releases/:id/pitch` → lista de pitches
- `/releases/:id/pitch/:pitchId` → editor de pitch individual (o mantener como modal/inline)

### Archivos afectados
- **Nueva migración SQL**: tabla `pitches`, RLS, migración de datos
- **`src/hooks/usePitches.ts`** (nuevo)
- **`src/pages/release-sections/ReleasePitch.tsx`** — refactor a listado + editor
- **`src/pages/PublicReleaseForm.tsx`** — query desde `pitches`
- **`src/App.tsx`** — nueva ruta opcional para pitch individual
- **`src/components/ArtistInfoDialog.tsx`** — re-save para fix build
- **`src/integrations/supabase/types.ts`** — tipos de la nueva tabla

### Resultado
- Múltiples pitches por release, cada uno con su estado, config y enlace público
- El manager puede crear propuestas distintas para diferentes distribuidoras
- Se mantiene la misma UX del formulario actual, ahora dentro de un sistema multi-pitch

