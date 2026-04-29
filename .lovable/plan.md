## Diagnóstico

El selector "Todos los artistas" en Discografía (`src/components/releases/ReleasesFiltersToolbar.tsx`) carga **todos** los registros de la tabla `artists`, sin filtrar por tipo. Por eso aparecen artistas que no son del roster ni colaboradores.

La tabla `artists` ya tiene la columna `artist_type` con valores `roster` y `collaborator` (verificado en BD).

## Solución

Modificar la query de carga de artistas en `src/components/releases/ReleasesFiltersToolbar.tsx` (líneas 82-89):

```ts
const fetchArtists = async () => {
  const { data } = await supabase
    .from('artists')
    .select('id, name, stage_name, artist_type')
    .in('artist_type', ['roster', 'collaborator'])
    .order('name');
  setArtists(data || []);
};
```

## Fuera de alcance

- No tocar otros selectores de artistas (Booking, Calendar, Dashboard) — el usuario solo se refirió a Discografía.
- No cambiar la UI del filtro.
