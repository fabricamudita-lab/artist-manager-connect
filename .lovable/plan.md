# Fix: "Perfil Test" no aparece en el equipo de Klaus Stroink

## Diagnóstico

**Datos en la base de datos** (verificados):
- "Perfil Test" es un **contacto espejo** (`mirror_type: workspace_member`) de un usuario del workspace, con rol funcional `"Mánager Personal"`.
- Está vinculado a Klaus Stroink mediante `artist_role_bindings` (rol técnico `BOOKING_AGENT`).
- Su `team_category` en `workspace_memberships` es `management` (categoría por defecto).
- El contacto espejo NO tiene `artist_id` ni `assigned_artist_ids`, porque la asociación con artistas concretos vive en `artist_role_bindings`.

**Bugs en `src/pages/Teams.tsx`** (función `allTeamByCategory`, líneas ~940–975):

1. **`wsMembers` no respeta el artista seleccionado** (líneas 944–949). El filtro solo mira `team_category`, así que un miembro del workspace aparece en cualquier equipo de artista o en ninguno, sin cruzarse con `artist_role_bindings`. Resultado: "Perfil Test" se cuenta en el badge `Todas (1)` cuando seleccionas Klaus, pero su `team_category=management` no encaja con la categoría "Mánager Personal" → no se renderiza.

2. **Los contactos espejo se descartan a ciegas** (líneas 954–956). Cualquier contacto con `mirror_type=workspace_member` se elimina del listado, sin comprobar si su usuario tiene un binding con el artista seleccionado.

3. **No se carga `artist_role_bindings`** en ningún momento. La página desconoce qué workspace members están asignados a qué artistas.

## Solución

### 1. Cargar bindings al inicio
En `src/pages/Teams.tsx`, dentro de `fetchTeamMembers` (junto al fetch de `workspace_memberships`):

```ts
const { data: bindings } = await supabase
  .from('artist_role_bindings')
  .select('user_id, artist_id, role')
  .in('user_id', userIds);

// Agrupar por user_id
const artistsByUser = new Map<string, string[]>();
(bindings || []).forEach(b => {
  const arr = artistsByUser.get(b.user_id) || [];
  arr.push(b.artist_id);
  artistsByUser.set(b.user_id, arr);
});
```

Añadir el array al `formattedMembers`:
```ts
artist_ids: artistsByUser.get(m.user_id) || [],
```

(y al tipo `TeamMember`)

### 2. Filtrar `wsMembers` por artista seleccionado
Reemplazar el filtro actual:

```ts
const wsMembers = teamMembers.filter(m => {
  // Categoría: usar el rol funcional (Mánager Personal, Booking Agent…)
  // si existe; si no, el team_category de la membership.
  const memberCategory = m.functional_role_category || m.team_category;
  if (memberCategory !== cat.value) return false;

  if (selectedArtistId === 'all') return true;
  if (selectedArtistId === '00-management') {
    return m.team_category === 'management';
  }
  // Artista concreto: incluir solo si tiene binding con ese artista
  return (m.artist_ids || []).includes(selectedArtistId);
});
```

Nota: como `cat.value` es la categoría visual ("Mánager Personal", "Booking", "management"…), hace falta mapear `functional_role` ("Mánager Personal" tal cual) o respetar `team_category`. La lógica concreta del mapeo se hereda de la que ya usa `MemberFormDialog` para sus categorías; usaremos `m.functional_role` cuando exista para que "Perfil Test" caiga en "Mánager Personal" en lugar de "management".

### 3. Permitir contactos espejo cuando hay binding
Reemplazar el descarte ciego:

```ts
if (config?.mirror_type === 'workspace_member' || config?.workspace_user_id) {
  return false;
}
```

por:

```ts
// Los espejos de miembros del workspace ya se renderizan vía `wsMembers`,
// así que se siguen excluyendo aquí para no duplicarlos. Mantener el return false.
return false;
```

(se mantiene el comportamiento — los mirrors se muestran a través de la rama `wsMembers`, no de `teamContacts` — pero ahora `wsMembers` sí los va a sacar con el artista correcto).

### 4. Recalcular el contador "Todas (X)"
El `(1)` actual es engañoso. Asegurarse de que el badge total por equipo cuente:
- contactos con `assigned_artist_ids.includes(artistId)` **+**
- workspace members con binding a ese artista.

Actualizar `teamMemberCounts` (líneas 881–892) para añadir los bindings:
```ts
teamMembers.forEach(m => {
  (m.artist_ids || []).forEach(aid => {
    counts.set(aid, (counts.get(aid) || 0) + 1);
  });
});
```

### 5. Realtime
Añadir `artist_role_bindings` como dependencia (suscripción) para que al asignar/quitar un artista a un miembro la vista se refresque sin recargar.

## Archivos a modificar

- `src/pages/Teams.tsx` (carga + filtrado + contador + tipo `TeamMember`)

## Resultado esperado

Al seleccionar el equipo "Klaus Stroink":
- "Perfil Test" aparece en la categoría **Mánager Personal**.
- El badge "Todas" refleja el total real (workspace members + contactos asignados).
- Sin duplicados: el mirror sigue sin renderizarse en `teamContacts`; aparece una sola vez vía `wsMembers`.
