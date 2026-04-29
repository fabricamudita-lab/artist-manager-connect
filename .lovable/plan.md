## Por qué solo aparece "PURO PAYÉS"

En `AssociateProjectDialog.tsx` se usa `SingleProjectSelector` pasándole el `artistId` de la solicitud. Dentro de `SingleProjectSelector` (línea 58), si llega un `artistId` la query a `projects` añade `eq('artist_id', artistId)`. Resultado: solo se ven los proyectos cuyo `artist_id` coincide con el artista de la solicitud (en tu caso, "PURO PAYÉS"). Los proyectos de otros artistas o sin artista quedan ocultos.

## Cambios

1. `src/components/SingleProjectSelector.tsx`
   - Añadir prop opcional `filterByArtist?: boolean` (por defecto `true`, así no se rompe el resto de la app: Drive, Finanzas, etc.).
   - Solo aplicar `eq('artist_id', ...)` si `filterByArtist && artistId`.
   - Subir el `limit(50)` a `limit(100)` para que entren más proyectos en la lista inicial cuando no se filtra por artista.

2. `src/components/AssociateProjectDialog.tsx`
   - Mostrar TODOS los proyectos por defecto (no filtrar por artista), ya que es lo que pide el caso de uso de "asociar una solicitud a cualquier proyecto".
   - Añadir un pequeño toggle "Solo proyectos de este artista" justo encima del selector. Por defecto desactivado. Si se activa, el selector vuelve a filtrar por `artistId`.
   - Pasar `filterByArtist={onlyArtistProjects}` al `SingleProjectSelector`.

3. No tocar otros usos
   - Drive, Finanzas, Releases y demás siguen pasando `artistId` con el `filterByArtist` por defecto a `true`, así que su comportamiento no cambia.

## Resultado

Al abrir "Asociar a proyecto" desde una solicitud verás el listado completo de proyectos del workspace (con buscador), independientemente del artista de la solicitud. Si quieres acotar al artista, activas el toggle.