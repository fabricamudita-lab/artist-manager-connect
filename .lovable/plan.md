

## Soporte multi-artista en Lanzamientos

### Problema
Actualmente cada lanzamiento solo permite un artista (`artist_id` en la tabla `releases`). Para discos colaborativos (ej: Rita Payes + Lucia Fumero) necesitas poder asignar varios artistas.

### Solucion

Crear una tabla intermedia `release_artists` para la relacion muchos-a-muchos, mantener `artist_id` como "artista principal" por compatibilidad, y cambiar los selectores en los dialogos de crear/editar lanzamiento.

### Cambios

#### 1. Migracion SQL
- Crear tabla `release_artists` con columnas: `id`, `release_id` (FK), `artist_id` (FK), `role` (text, default 'primary'), `created_at`
- Indice unico en `(release_id, artist_id)` para evitar duplicados
- Migrar datos existentes: insertar un registro en `release_artists` por cada release que tenga `artist_id` poblado
- RLS habilitado con politicas similares a las de `releases`

#### 2. Hook useReleases
- Añadir nuevo hook `useReleaseArtists(releaseId)` para obtener los artistas de un lanzamiento
- Modificar `useCreateRelease` para aceptar `artist_ids: string[]` en vez de `artist_id` y hacer el insert en `release_artists` tras crear el release
- Modificar `useUpdateRelease` para gestionar la tabla `release_artists` (delete + insert)
- Modificar `useRelease` para hacer join con `release_artists` y traer los artistas vinculados

#### 3. CreateReleaseDialog
- Reemplazar `SingleArtistSelector` por el componente `ArtistSelector` (multi-seleccion) que ya existe en el proyecto
- Cambiar el estado de `selectedArtistId: string | null` a `selectedArtistIds: string[]`
- Pasar `artist_id` como el primer artista seleccionado (para compatibilidad) y guardar todos en `release_artists`

#### 4. EditReleaseDialog
- Mismo cambio: reemplazar `SingleArtistSelector` por `ArtistSelector`
- Cargar los artistas actuales desde `release_artists` al abrir el dialogo
- Al guardar, sincronizar la tabla `release_artists`

#### 5. ReleaseDetail (cabecera)
- En vez de mostrar un solo artista, mostrar la lista de artistas con sus avatares como chips/badges clickeables que llevan al perfil

#### 6. Compatibilidad
- El campo `artist_id` en `releases` se mantiene como "artista principal" (primer artista seleccionado) para no romper queries existentes en royalties, cronograma, ResponsibleSelector, etc.
- Los filtros por artista en la lista de releases consultaran tambien `release_artists`

### Detalle tecnico

```sql
CREATE TABLE public.release_artists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'primary',
  created_at timestamptz DEFAULT now(),
  UNIQUE(release_id, artist_id)
);

-- Migrar datos existentes
INSERT INTO release_artists (release_id, artist_id)
SELECT id, artist_id FROM releases WHERE artist_id IS NOT NULL;

ALTER TABLE release_artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "release_artists_all" ON release_artists FOR ALL USING (true);
```

En los dialogos, el cambio principal es:
```typescript
// Antes
<SingleArtistSelector value={artistId} onValueChange={setArtistId} />

// Despues
<ArtistSelector selectedArtists={artistIds} onSelectionChange={setArtistIds} />
```

