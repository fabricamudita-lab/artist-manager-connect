## Problema

En el formulario de **Solicitud de Licencia** (y resto de solicitudes que usan `ArtistProfileSelector`), al elegir Artista aparecen mezclados los artistas del Roster y los Colaboradores en el mismo grupo "Artistas del Roster", todos con el badge **"Roster"**. Debe aparecer:

1. Primero los artistas del **Roster** (badge ámbar "Roster").
2. Después los artistas **Colaboradores** (badge distinto "Colaborador"), en su propio grupo.

La tabla `artists` ya distingue ambos mediante la columna `artist_type` (`'roster'` | `'collaborator'`), pero el selector no la lee.

## Solución

Modificar **`src/components/ArtistProfileSelector.tsx`**:

1. Añadir `artist_type` al `select` de la query a `artists`.
2. Añadirlo a la interfaz `Artist`.
3. Separar los artistas en dos listas: `rosterArtists` (`artist_type === 'roster'` o sin tipo, por compatibilidad) y `collaboratorArtists` (`artist_type === 'collaborator'`), ambas ordenadas por nombre.
4. Renderizar **dos `CommandGroup` separados**:
   - "Artistas del Roster" — badge ámbar "Roster" (como ahora).
   - "Artistas Colaboradores" — nuevo grupo con icono `Users`/`Star` outline y badge azul/morado "Colaborador".
5. Mantener el grupo "Otros Perfiles" (contactos) tal cual al final.

### Fuera de alcance

- No se toca `SingleArtistSelector` (no se usa en este formulario).
- No se modifica el esquema de BD ni RLS.
