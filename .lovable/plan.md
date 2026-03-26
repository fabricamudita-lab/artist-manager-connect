

## Hacer "Artistas para Distribución" independiente por track

### Problema
Actualmente el componente `CreditedArtistRoles` opera a nivel de release (usa la tabla `release_artists`). El usuario necesita que cada canción pueda tener distintos Main Artist y Featuring, lo cual es el estándar de la industria musical.

### Solución

Crear una nueva tabla `track_artists` para almacenar los roles de distribución por canción, y adaptar el componente para trabajar a nivel de track.

### Cambios

**1. Nueva migración SQL — tabla `track_artists`**
```sql
create table public.track_artists (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade not null,
  artist_id uuid references public.artists(id) on delete cascade not null,
  role text not null default 'main',
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (track_id, artist_id)
);
alter table public.track_artists enable row level security;
-- RLS: same policy pattern as track_credits
create policy "Users can manage track_artists" on public.track_artists
  for all using (true) with check (true);
```

**2. `src/components/releases/CreditedArtistRoles.tsx`**
- Cambiar props: recibir `trackId` en lugar de `releaseId` + filtrar créditos solo de ese track
- Leer/escribir en `track_artists` en vez de `release_artists`
- El `allCredits` se filtra por `track_id === trackId` para mostrar solo personas creditadas en esa canción
- La lógica de crear artista collaborator se mantiene igual

**3. `src/pages/release-sections/ReleaseCreditos.tsx`**
- Pasar `trackId={selectedTrack.id}` al componente en vez de `releaseId`
- Pasar solo los créditos del track seleccionado (filtrar `allReleaseCredits` por `track_id`)

**4. Actualizar `src/utils/exportLabelCopyPDF.ts`** y cualquier lugar que lea `release_artists` para la vista de distribución:
- Leer `track_artists` por track para mostrar el artista correcto por canción en el Label Copy

### Resultado
Cada canción tendrá su propia configuración de Main Artist y Featuring, independiente de las demás canciones del release.

