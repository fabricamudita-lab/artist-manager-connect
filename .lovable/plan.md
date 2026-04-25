## Diagnóstico

Los dos conciertos `facturado` de PLAYGRXVND existen en BD (verificado vía SQL):
- `2026-02-19` Barcelona, CurtCircuit — `estado=facturado`, `phase=facturado`
- `2026-03-27` Barcelona, CurtCircuit — `estado=facturado`, `phase=facturado`

El filtro `.or(estado.in..., phase.in...)` ya incluye `facturado`, así que **ese no es el problema**. El bug real está en el filtro por artista.

### Causa raíz (`src/pages/Calendar.tsx`)

**Línea 101** inicializa el filtro de artistas con el ID del perfil del usuario, no con artist_ids:
```ts
setSelectedArtists([profile.id]);  // profile.id NO es un artist_id
```

**Línea 332/342** en `fetchBookingOffers`:
```ts
const artistFilter = selectedArtists.length > 0 ? selectedArtists : (profile ? [profile.id] : []);
...
.in('artist_id', artistFilter)
```

Resultado: por defecto se filtra `artist_id IN (profile.id)` que nunca matchea → **0 bookings se muestran hasta que el usuario seleccione manualmente un artista en el toolbar**. Aunque PLAYGRXVND esté seleccionado, si el usuario no abrió el filtro y eligió explícitamente, la lista está vacía. Esto también afecta al fetch de `events` (línea 153, 182) con el mismo error conceptual.

## Solución

Resolver los `artist_ids` reales a los que el usuario tiene acceso (vía `artist_role_bindings`) y usarlos como default en lugar de `profile.id`.

### Cambios en `src/pages/Calendar.tsx`

1. **Cargar artistas accesibles al montar**: nuevo `useEffect` que consulta `artist_role_bindings` por `user_id = auth.uid()` y guarda `accessibleArtistIds: string[]`.
   - Para `active_role === 'management'`: además incluir todos los artistas del workspace (consulta a `artists` filtrado por `workspace_id` del perfil) para mantener visión global.
2. **Inicialización de `selectedArtists`** (línea 100-103): usar `accessibleArtistIds` en lugar de `[profile.id]`.
3. **Defaults en `fetchBookingOffers`** (línea 332) y **`fetchEvents`** (líneas 153, 182): cuando `selectedArtists` esté vacío, hacer fallback a `accessibleArtistIds`, no a `[profile.id]`.
4. **Guard** de la query `.or` actual de `events` cuando `selectedArtists` está vacío (genera SQL inválido `artist_id.in.()`).

### Validación / seguridad

- Las consultas usan parámetros de Supabase (sin concatenación de texto SQL crudo en zona sensible — el `.or(...)` de events ya concatenaba `selectedArtists.join(',')` con UUIDs validados por el backend, mantenemos ese patrón pero garantizamos array no vacío).
- RLS de `booking_offers` y `events` sigue aplicándose: solo se devuelven filas a las que el usuario tiene acceso, así que ampliar el default no expone datos extra.
- Edge case: usuario sin artistas asignados → `accessibleArtistIds=[]` → no se ejecuta query (igual que hoy con `length === 0`).

## Resultado esperado

Al entrar a `/calendar` sin tocar filtros, aparecerán todos los bookings (incluidos los `facturado` de PLAYGRXVND del 19/2 y 27/3) de los artistas a los que el usuario tiene acceso.

## Archivos a tocar

- `src/pages/Calendar.tsx` — añadir hook de carga de `accessibleArtistIds`, cambiar inicialización y fallbacks (≈4 puntos de edición).

Sin cambios de BD, RLS ni UI.
