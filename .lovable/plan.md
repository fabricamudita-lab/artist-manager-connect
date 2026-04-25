## Problema

En el filtro de Artistas del Calendario aparecen **todos los artistas** de la tabla `artists`, incluyendo:
- **Colaboradores** (perfiles con `artist_type = 'collaborator'` que se crean al añadir featurings, productores, etc.). No deberían listarse aquí — solo el roster.
- **Duplicados con el mismo nombre artístico** (en la captura, "Leyre Estruch" aparece dos veces). Probablemente hay dos filas en `artists` con el mismo `stage_name`/`name` (una de roster + una colaboradora, o dos creadas por error).

El componente afectado es `src/components/ArtistSelector.tsx`, que se usa también en otros módulos pero siempre debe respetar la misma regla: mostrar únicamente roster.

## Solución

Modificar `fetchArtists()` en `src/components/ArtistSelector.tsx`:

1. **Filtrar por roster** añadiendo `.neq('artist_type', 'collaborator')` a la query — sigue el patrón ya usado en `MyManagement.tsx` (`a.artist_type !== 'collaborator'`), que es más permisivo que `eq 'roster'` y soporta filas legacy con `artist_type` nulo.
2. **Deduplicar en cliente** por nombre visible (`stage_name || name`, normalizado a lowercase), conservando la primera ocurrencia. Esto evita ver dos veces el mismo artista aunque existan dos registros en BD.
3. Eliminar los `console.log` de debug.

### Por qué solo en cliente

Filtrar duplicados a nivel de query SQL requeriría un `DISTINCT ON` que pierde el `id`. La deduplicación en cliente es trivial y suficiente porque la lista nunca es grande.

### Nota sobre el "Leyre Estruch" duplicado

Tras este cambio el selector mostrará una sola "Leyre Estruch", pero **los dos registros seguirán existiendo en BD**. Si quieres, después puedo:
- Identificar cuál de los dos es el "real" (con más datos vinculados: bookings, releases, etc.).
- Fusionar referencias y eliminar el duplicado.

Eso lo haríamos como tarea aparte para no mezclar UX y limpieza de datos.

### Archivos modificados

- `src/components/ArtistSelector.tsx`