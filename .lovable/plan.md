

## Importar Discografia desde Spotify

### Resumen
Crear un sistema para importar la discografia de un artista desde Spotify pegando la URL de su perfil. Incluye una Edge Function segura para las credenciales de Spotify, un drawer multi-paso para seleccionar que importar, y logica de insercion masiva en las tablas existentes de releases y tracks.

### Prerequisito: Credenciales Spotify
Se necesitan dos secretos nuevos en Supabase:
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Se pediran al usuario antes de implementar. Se obtienen desde https://developer.spotify.com/dashboard.

### Cambios en Base de Datos

**Migracion**: Agregar campo `spotify_id` a las tablas `releases` y `tracks` para prevenir duplicados:

```sql
ALTER TABLE releases ADD COLUMN spotify_id TEXT UNIQUE;
ALTER TABLE tracks ADD COLUMN spotify_id TEXT UNIQUE;
ALTER TABLE tracks ADD COLUMN explicit BOOLEAN DEFAULT false;
ALTER TABLE tracks ADD COLUMN spotify_url TEXT;
ALTER TABLE tracks ADD COLUMN preview_url TEXT;
ALTER TABLE tracks ADD COLUMN popularity INTEGER;
ALTER TABLE releases ADD COLUMN spotify_url TEXT;
ALTER TABLE releases ADD COLUMN copyright TEXT;
```

### Edge Function: `spotify-import`

Endpoint seguro que maneja dos operaciones:

**1. `GET /spotify-import?action=fetch&artistId={spotifyArtistId}`**
- Obtiene token via Client Credentials Flow (`POST https://accounts.spotify.com/api/token`)
- Llama a `GET /v1/artists/{id}/albums?include_groups=album,single,appears_on,compilation&limit=50`
- Para cada album: obtiene detalle con `GET /v1/albums/{id}` (para tracks, UPC, label, copyrights)
- Devuelve toda la discografia parseada y organizada por tipo

**2. No se necesita segundo endpoint** - la importacion (insercion en DB) se hace desde el frontend con el cliente Supabase directamente.

Configuracion en `config.toml`:
```toml
[functions.spotify-import]
verify_jwt = false
```

### Componentes Nuevos

**`src/components/releases/ImportSpotifyDialog.tsx`**
Drawer lateral con 3 pasos:

- **Paso 1 - URL + Artista**: Input para URL de Spotify + selector de artista MOODITA. Boton "Buscar discografia". Extrae el artist ID de la URL con regex que cubre los formatos `open.spotify.com/artist/...`, `open.spotify.com/intl-xx/artist/...` y `spotify:artist:...`.

- **Paso 2 - Seleccion**: Muestra resultados agrupados por tipo (Albums, EPs, Singles, Apariciones). Cada item muestra portada, titulo, ano, numero de tracks. Items ya importados (match por `spotify_id`) aparecen deshabilitados con badge "Ya importado". Albums y EPs seleccionados por defecto, singles y apariciones deseleccionados. Singles colapsados si hay mas de 5. Contador de seleccionados en el footer.

- **Paso 3 - Importacion**: Barra de progreso con estado detallado. Inserta cada release en `releases` con los datos de Spotify (titulo, tipo, fecha, portada, label, UPC, genre, spotify_id, spotify_url, copyright). Vincula al artista via `release_artists`. Inserta cada track en `tracks` (titulo, track_number, duracion en segundos, ISRC, spotify_id, explicit, spotify_url, preview_url, popularity). Al terminar muestra resumen con contadores.

### Logica de Prevencion de Duplicados

Antes de mostrar la seleccion, consulta la DB por `spotify_id` en `releases`. Los que ya existan se marcan como "Ya importado" y no son seleccionables.

### Modificaciones a Archivos Existentes

**`src/pages/Releases.tsx`**: Agregar boton "Importar desde Spotify" junto a "Nuevo Lanzamiento" y renderizar el componente `ImportSpotifyDialog`.

**`src/hooks/useReleases.ts`**: Agregar interfaz `Release` actualizada con los nuevos campos (`spotify_id`, `spotify_url`, `copyright`). No se necesitan hooks nuevos - la importacion usa directamente `supabase.from('releases').insert(...)`.

### Archivos Nuevos

| Archivo | Descripcion |
|---------|-------------|
| `supabase/functions/spotify-import/index.ts` | Edge Function para comunicarse con Spotify API |
| `src/components/releases/ImportSpotifyDialog.tsx` | Drawer completo con los 3 pasos |

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/pages/Releases.tsx` | Boton de importacion + estado del dialog |
| `src/hooks/useReleases.ts` | Campos nuevos en interfaces Release y Track |
| `supabase/config.toml` | Registrar la nueva edge function |

### Notas Tecnicas

- El mapeo de tipo de Spotify a MOODITA: `album` -> `album`, `single` -> `single`, `compilation` -> `album`
- Duracion: Spotify usa milisegundos, tracks almacenan en segundos
- La portada se guarda como URL externa de Spotify (i.scdn.co), no se descarga al storage
- El status de releases importados sera `released` (ya estan publicados en Spotify)
- Se anade banner visual "Importado desde Spotify - completa creditos y datos internos" detectando releases con `spotify_id` no nulo

