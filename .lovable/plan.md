## Problema

Eudald Payés aparece en la categoría **Compositor** como un **contacto** normal (círculo morado liso, sin borde verde, sin estrella), separado de su perfil de **Artista principal** (círculo verde con estrella).

Esto ocurre porque:

1. Cuando se añadió a Eudald como compositor en los créditos del release, el sistema creó (o reutilizó) un **contacto** llamado "Eudald Payés" con `team_categories: ['compositor']`. Este contacto es una entidad distinta del registro del **artista** del roster.
2. La página de Equipos sólo inyecta el "perfil de artista principal" (tarjeta verde con estrella) en las categorías `artistico` y `banda`. En cualquier otra categoría (compositor, letrista, técnico, producción…), el artista aparece como contacto.

Tu regla deseada: **si el artista principal tiene un cargo en una categoría, debe mostrarse SIEMPRE como tarjeta de artista principal** (mismo estilo verde con estrella que en "Equipo artístico"), sólo cambiando el rol mostrado debajo (ej. "Compositor", "Productor"…).

## Solución

### 1. Resolver "contactos = artista del roster" y promocionarlos

En `src/pages/Teams.tsx`, dentro del `useMemo` `allTeamByCategory`:

- Para cada categoría, antes de filtrar contactos, detectar cuáles coinciden con un artista del roster (match por `stage_name` / `name` normalizado, ignorando mayúsculas/acentos, dentro de la lista `artists`).
- Esos contactos NO se renderizan como tarjeta de contacto. En su lugar:
  - Se inyecta el artista correspondiente como `artistMember` de esa categoría.
  - El campo `role` del artistMember toma el rol del contacto en esa categoría (ej. "Compositor" en vez de "Artista principal").
- La inyección automática de "Artista principal" en `artistico`/`banda` se mantiene tal cual (cuando el artista no tiene un rol explícito ahí).

Pseudocódigo dentro del map de categorías:

```ts
// Construir lookup de artistas por nombre normalizado
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const artistByName = new Map(artists.map(a => [norm(a.stage_name || a.name), a]));

// Filtrar contactos: separar los que coinciden con un artista del roster
const matchedArtistContacts: Array<{ artist, role }> = [];
const realContacts = contacts.filter(c => {
  const match = artistByName.get(norm(c.stage_name || c.name));
  if (match && (selectedArtistId === 'all' || match.id === selectedArtistId)) {
    matchedArtistContacts.push({ artist: match, role: c.role });
    return false; // se excluye de la lista de contactos
  }
  return true;
});

// Añadir esos artistas como artistMembers (con rol específico)
matchedArtistContacts.forEach(({ artist, role }) => {
  artistMembers.push({
    id: `artist-${artist.id}-${cat.value}`,
    isArtist: true,
    name: artist.stage_name || artist.name,
    role: role || cat.label,   // p. ej. "Compositor, Productor"
    artistId: artist.id,
    avatarUrl: artist.avatar_url,
  });
});
```

Con esto, en la captura, la categoría "Compositor" mostrará a Eudald como tarjeta verde con estrella y "Compositor, Productor" debajo, en lugar del círculo morado actual.

### 2. Evitar duplicados cuando el artista ya está inyectado

En `artistico` / `banda`, si el artista también está en `matchedArtistContacts`, usar el rol del contacto (más informativo) y no duplicar la tarjeta "Artista principal" genérica.

### 3. Coherencia al hacer clic

La tarjeta tipo `artist` ya abre el perfil del artista (`ArtistInfoDialog`), igual que en "Equipo artístico". No se requieren cambios en handlers.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/Teams.tsx` | Lógica de matching artista↔contacto en `allTeamByCategory` y deduplicación con la inyección automática de `artistico`/`banda`. |

## Resultado esperado

- "Compositor" → Eudald aparece como tarjeta de Artista principal (verde, estrella) con rol "Compositor, Productor".
- "Equipo artístico" → Eudald sigue apareciendo como Artista principal.
- Otros contactos (no artistas) siguen apareciendo como tarjeta de contacto normal.
- El contador de la categoría no cambia (sigue siendo 1).

## Notas

- No se borran ni modifican los contactos existentes en BD: la unificación es puramente visual en la página de Equipos.
- A futuro, si el matching por nombre da falsos positivos, podemos añadir un campo explícito `linked_artist_id` en `contacts` para vincular un contacto a un artista del roster, pero por ahora el match por nombre cubre el caso.
