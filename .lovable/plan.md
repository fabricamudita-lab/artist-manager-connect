# Fix: el equipo del artista no aparece al crear formato

## Problema

Desde **Perfil Test** (Mánager Personal) entras a crear un formato para **Klaus Stroink**. El selector "Equipo del artista" muestra solo al artista principal y "Este artista aún no tiene equipo asignado", aunque en `Equipos` filtrando por Klaus Stroink se ven 9 miembros (DS, GB, JP, J, JV, KD, CA, etc.).

## Causa

`ArtistFormatsDialog.tsx` usa el hook `useArtistTeamMembers(artistId)` para poblar la pestaña "Equipo del artista". Ese hook **solo lee la tabla `contact_artist_assignments`**, es decir, únicamente devuelve **contactos sin cuenta** asignados explícitamente al artista.

Pero el equipo de Klaus está formado por **miembros del workspace** (`workspace_memberships` → `profiles`), no por `contacts`. En la página `Teams` esos profiles aparecen para cualquier artista porque la lógica los considera siempre visibles (lo mismo hace el hook hermano `useTeamMembersByArtist`, que ya combina workspace members + contacts asignados).

Resultado: `useArtistTeamMembers` devuelve `[]` para Klaus aunque sí tiene equipo, y la UI muestra el mensaje de "sin equipo".

## Solución

Reutilizar el hook completo `useTeamMembersByArtist`, que ya está importado en `ArtistFormatsDialog.tsx` (de hecho su `groupedByCategory` se está descartando como `_legacyGrouped`). Cambios mínimos:

1. En `src/components/ArtistFormatsDialog.tsx`:
   - Eliminar el uso de `useArtistTeamMembers` (línea ~330).
   - Renombrar `_legacyGrouped` → `groupedByCategory` y `loadingTeam` → `loadingArtistTeam` (o usar directamente esos nombres) para alimentar la pestaña "Equipo del artista".
   - Pasar `[artistId]` (cuando exista) como `selectedArtistIds` a `useTeamMembersByArtist` para que filtre contactos al artista actual y deje los workspace members siempre visibles, igual que en Teams.
   - Quitar el import de `useArtistTeamMembers` si deja de usarse.

2. Mantener `useArtistTeamMembers` para otros consumos si los hubiera (verificar con `rg`; si no, borrar el archivo).

3. No tocar el componente UI ni la lógica de selección/checkbox: la forma de los datos (`{ value, label, members: [{ id, name, category, role, type }] }`) es idéntica entre los dos hooks.

## Detalle técnico

```ts
// Antes
const { groupedByCategory: _legacyGrouped, loading: loadingTeam } =
  useTeamMembersByArtist(selectedArtistIds);
const { groupedByCategory, loading: loadingArtistTeam } =
  useArtistTeamMembers(artistId);

// Después
const artistFilter = artistId ? [artistId] : [];
const { allTeamMembers, filteredMembers, groupedByCategory, loading: loadingArtistTeam } =
  useTeamMembersByArtist(artistFilter);
```

Esto hace que la pestaña "Equipo del artista" muestre exactamente lo mismo que la página `Teams` cuando el usuario filtra por ese artista: workspace members (siempre) + contactos asignados al artista + contactos marcados como management team.

## Archivos a modificar

- `src/components/ArtistFormatsDialog.tsx` — hooks de equipo (líneas ~5, ~328-330) y posibles referencias residuales.
- (Opcional) `src/hooks/useArtistTeamMembers.ts` — eliminar si ya no tiene consumidores.

## Verificación

- Como Perfil Test (Mánager Personal), abrir crear formato para Klaus Stroink → la pestaña "Equipo del artista" debe listar a David Solans (Management), Guillem Boltó (Trombón), Joan Palà (Percusionista), Jose (Batería), Josep Valldeperas (Saxo), Kevin Diaz (Pianista), Carlos Avatar (Ingeniero de Sonido) y al artista principal Klaus Stroink Izard.
- Confirmar que para artistas sin equipo asignado aún aparece el mensaje vacío (porque solo habría artista principal y ningún workspace/contact asociado al workspace).
- Confirmar que la selección de un miembro sigue añadiéndose al `crewMembers` del formato sin regresiones.
