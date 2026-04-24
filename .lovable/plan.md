## Problema

El selector "Equipo" en `/teams` muestra **todos los artistas** de la tabla `artists`, mezclando perfiles del roster (artistas principales gestionados) con colaboradores ocasionales (Jay Jules, Ana Ayala, Kris Tena, etc. — todos con `artist_type = 'collaborator'`).

Estos colaboradores no tienen su propio "equipo" — orbitan al artista principal con el que colaboran, o aparecen dentro de proyectos puntuales. Por eso no tiene sentido que aparezcan como "equipos" seleccionables.

## Solución

Filtrar el `fetchArtists()` de `src/pages/Teams.tsx` para traer únicamente artistas del roster.

### Cambio único

**Archivo:** `src/pages/Teams.tsx` (función `fetchArtists`, líneas 147-152)

Añadir el filtro `.eq('artist_type', 'roster')` a la query de Supabase:

```ts
const { data, error } = await supabase
  .from('artists')
  .select('id, name, stage_name, description, avatar_url')
  .eq('artist_type', 'roster')
  .order('name');
```

### Resultado esperado

El selector "Equipo" pasará de listar 11 artistas a listar solo los 4 del roster:
- VIC (Vic Mirallas)
- Eudald Payés
- PLAYGRXVND (Klaus Stroink)
- Leyre Estruch (roster)

Los colaboradores como Jay Jules seguirán siendo accesibles desde:
- El perfil del artista principal con el que colaboran (vía créditos/equipo del release)
- La sección de proyectos donde participen
- El listado global de contactos/colaboradores

### Notas

- No se borra ningún dato — los perfiles `collaborator` siguen existiendo y siendo consultables desde otras vistas.
- No afecta a la asignación de créditos en releases, que ya distingue por `artist_type` y categoría.
- Si en el futuro se quiere ofrecer una vista combinada, se puede añadir un toggle "Incluir colaboradores" en el selector — pero por defecto solo roster.
