

## Completar: Multi-Pitch por Release

### Estado actual
- Los campos de pitch (`synopsis`, `mood`, `pitch_token`, `pitch_config`, `pitch_status`, `pitch_deadline`, etc.) siguen viviendo en la tabla `releases`
- `ReleasePitch.tsx` opera sobre un solo pitch por release
- `PublicReleaseForm.tsx` busca por `pitch_token` en `releases`
- No existe tabla `pitches`, ni hook `usePitches`, ni UI de listado

### Pasos a implementar

**1. Migración SQL — crear tabla `pitches`**
- Tabla con: `id`, `release_id` (FK), `created_by`, `name`, `synopsis`, `mood`, `country`, `spotify_strategy`, `spotify_monthly_listeners`, `spotify_followers`, `spotify_milestones`, `general_strategy`, `social_links`, `pitch_status`, `pitch_deadline`, `pitch_token` (unique), `pitch_config`
- RLS: owner CRUD, anon read/update por token
- Migrar datos existentes desde `releases` (un pitch por release que tenga datos de pitch)

**2. Crear `src/hooks/usePitches.ts`**
- `usePitchesByRelease(releaseId)` — lista
- `useCreatePitch()` — crear con nombre y release_id
- `useUpdatePitch()` — actualizar (con opción silent)
- `useDeletePitch()` — eliminar

**3. Refactorizar `ReleasePitch.tsx`**
- Vista inicial: listado de pitches del release (nombre, estado, fecha)
- Botón "Nuevo Pitch"
- Al hacer clic: editor inline (mismo formulario actual)
- Cada pitch tiene su propio token y enlace público
- Opción de duplicar pitch existente

**4. Refactorizar `PublicReleaseForm.tsx`**
- Buscar en `pitches` por token en vez de en `releases`
- Cargar datos del release asociado vía join
- Guardar cambios en `pitches`

### Archivos afectados
- Nueva migración SQL
- `src/hooks/usePitches.ts` (nuevo)
- `src/pages/release-sections/ReleasePitch.tsx` — refactor completo
- `src/pages/PublicReleaseForm.tsx` — cambiar queries
- `src/integrations/supabase/types.ts` — se regenera automáticamente

