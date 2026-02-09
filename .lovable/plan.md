

# Fix: Dashboard de Perfiles vacio para artistas

## Problema encontrado

Hay dos bugs que causan que el dashboard aparezca vacio:

1. **ID con prefijo "artist-"**: Cuando un miembro aparece como artista (no como contacto), su `id` interno es `"artist-bf35084f..."` en vez del UUID limpio. Este ID se pasa tanto como `id` (para queries por contact_id) como `artistId` (para queries de bookings), haciendo que todas las consultas fallen porque no coincide con ningun registro en la base de datos.

2. **Campo incorrecto en la UI**: El dialog usa `item.description` para budget_items pero la columna real es `name`.

## Solucion

### 1. Corregir `src/pages/Teams.tsx` - Resolucion de artistId

En el `useMemo` de `selectedProfiles` (linea ~857):
- Para miembros tipo `artist`: usar `m.rawData?.artistId` (que contiene el UUID limpio del artista) en vez de `m.rawData?.id`
- Tambien buscar en la tabla `artists` si existe un contacto con el mismo nombre para obtener su contact_id real
- Limpiar el prefijo `artist-` del `id` para que sea un UUID valido

```typescript
// Antes (buggy):
artistId: isArtist ? (m.rawData?.id || m.id) : contactArtistId,

// Despues (fix):
artistId: isArtist ? m.rawData?.artistId : contactArtistId,
```

Y para el `id` del perfil, cuando es un artista debemos usar el artistId directamente o buscar el contact_id correspondiente.

### 2. Corregir `src/components/ContactDashboardDialog.tsx`

- Cuando el perfil es un artista sin contact_id asociado, buscar el contacto correspondiente en la tabla `contacts` por `artist_id` para poder hacer queries por `contact_id`
- Corregir `item.description` a `item.name` para budget_items
- Anadir busqueda de contacto vinculado al artista para que las queries por `contact_id` tambien funcionen

### Detalle tecnico

En `ContactDashboardDialog.tsx`, antes de ejecutar las queries, el componente debera:

1. Recoger todos los `artistId` de los perfiles seleccionados
2. Si hay artistIds, buscar contactos en la tabla `contacts` donde `artist_id` coincida, y anadir esos contact_ids a la lista
3. Tambien buscar contactos por nombre si no hay `artist_id` directo (fallback)
4. Ejecutar todas las queries con la lista completa de contact_ids + artist_ids

### Archivos a modificar

- **`src/pages/Teams.tsx`**: Corregir la logica de `selectedProfiles` para pasar el `artistId` correcto (sin prefijo `artist-`)
- **`src/components/ContactDashboardDialog.tsx`**: Resolver contact_ids desde artist_ids antes de hacer queries, y corregir el campo `description` a `name` en budget_items

