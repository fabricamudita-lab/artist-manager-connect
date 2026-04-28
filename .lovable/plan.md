# Eliminar duplicado de artistas en Equipos

## Problema

En `/contacts` (vista Equipos), Eudald Payés aparece dos veces cuando el filtro de Categoría está en "Todas":

- Una vez como **"Artista principal"** (inyectado automáticamente en la categoría `artistico`/`banda` desde la tabla `artists`).
- Otra vez como **"Compositor, Productor"** (porque existe un contacto del roster vinculado al mismo artista vía `linked_artist_id` o por coincidencia de nombre, y está categorizado en `compositor`/`productor`).

La causa está en `src/pages/Teams.tsx`:

- Líneas 974-999: se inyecta `artist-<uuid>` como "Artista principal" en la categoría artístico/banda **solo si no está promocionado en esa misma categoría**. Pero si el contacto promocionado está en otra categoría distinta (compositor/productor), no entra en `promotedArtists` de artístico, por lo que se vuelve a inyectar.
- Líneas 1001-1011: el promocionado de la otra categoría se añade con id `artist-<uuid>-<cat>`.
- Líneas 1132-1146 (`allMembersFlattened`): la deduplicación es por `member.id`. Como los ids son distintos, ambos sobreviven.

## Solución propuesta

Unificar al artista en una sola tarjeta cuando coexisten ambas representaciones, conservando el rol específico (p. ej. "Artista principal · Compositor, Productor") en lugar de mostrar dos burbujas.

### Cambios en `src/pages/Teams.tsx`

1. **Pre-cálculo global de artistas promocionados (antes del `map` de categorías).**
   Recorrer `teamContacts` una sola vez y construir un `Map<artistId, { roles: Set<string>, categories: Set<string> }>` con todos los contactos del roster vinculados a un artista (vía `linked_artist_id` o nombre normalizado), agregando sus roles y categorías. Esto da una visión global, independiente de la categoría actual.

2. **Ajustar la inyección de "Artista principal" (líneas 974-999).**
   En lugar de comprobar `promotedArtists.has(a.id)` (local a la categoría), comprobar contra el mapa global. Si el artista ya está promocionado en cualquier categoría, **no inyectar** la entrada genérica "Artista principal"; en su lugar, anteponer "Artista principal" al rol existente al construir el promocionado.

3. **Ajustar el id del artista promocionado (línea 1004).**
   Usar `id: \`artist-${artist.id}\`` (sin sufijo de categoría). Así, en `allMembersFlattened` la deduplicación por `id` ya colapsa ambas apariciones automáticamente. La categoría visible se elige como la primera donde aparece (o se concatenan en `currentCategory` si fuera necesario para el grid).

4. **Componer el rol final.**
   Si el artista está en el roster y además promocionado, mostrar `role = "Artista principal · <roles del contacto>"` (p. ej. "Artista principal · Compositor, Productor"). Si solo está promocionado (sin estar en categoría artístico/banda directa), mantener su rol del contacto. Si solo es del roster, mantener "Artista principal".

5. **Verificar el contador de la categoría "Todas".**
   El contador `allMembersFlattened.length` ya respetará el dedupe al usar el mismo id. Confirmar que el badge "Equipos (6)" pasa a "(5)" tras el arreglo.

## Casos a cubrir

- Artista en roster con contacto vinculado en otra categoría → una sola tarjeta con rol combinado.
- Artista en roster sin contacto vinculado → solo "Artista principal" (comportamiento actual, sin cambios).
- Contacto vinculado a un artista que no está en el roster → no aplica (no debería ocurrir, pero se ignora con seguridad).
- Filtro de artista (`selectedArtistId !== 'all'`) → respetar el filtrado existente.
- Filtro de categoría individual (no "Todas") → si la categoría seleccionada es artístico/banda y el artista solo está promocionado en compositor/productor, mostrar la tarjeta "Artista principal" sin el rol de la otra categoría (mantener semántica por categoría).

## Riesgos / no cambia

- No se tocan datos en BD ni RLS.
- No se modifica `allTeamByCategory` para vistas filtradas por una categoría concreta más allá del punto 5: cada categoría sigue mostrando solo a los miembros que le pertenecen.
- No afecta a `00-management` (selectedArtistId especial) ni al flujo de invitaciones.

## Archivos a modificar

- `src/pages/Teams.tsx` (única fuente del bug).

Tras la aprobación, paso a modo build, aplico los cambios y verifico visualmente que la captura adjunta pasa de 6 a 5 burbujas con Eudald Payés mostrando rol combinado.
