
# Fix: Boton Editar en Perfil de Artista

## Problema

El `ArtistInfoDialog` busca en la tabla `profiles` usando el ID del artista (tabla `artists`), pero estos son IDs diferentes. El artista tiene su propio ID en la tabla `artists`, no en `profiles`. Por eso la consulta falla y muestra "No se pudo cargar la informacion del artista."

## Solucion

Cambiar el `ArtistInfoDialog` para que consulte la tabla `artists` en lugar de `profiles`, ya que el ID que recibe es de un artista, no de un perfil de usuario.

### Cambios en `src/components/ArtistInfoDialog.tsx`:

1. Cambiar la interfaz `Profile` por una interfaz `ArtistData` que refleje los campos de la tabla `artists` (id, name, bio, genre, image_url, etc.)
2. Modificar `fetchArtistProfile` para consultar `from('artists')` en lugar de `from('profiles')`
3. Adaptar el formulario de edicion para los campos disponibles en la tabla `artists` (nombre, bio, genero, imagen, etc.)
4. Actualizar la vista para mostrar informacion relevante del artista en lugar de campos de perfil de usuario (phone, emergency_contact, etc. que no existen en la tabla artists)

### Detalle tecnico

La tabla `artists` contiene campos como: `id`, `name`, `bio`, `genre`, `image_url`, `created_by`, `created_at`. El dialogo se adaptara para editar estos campos. Los campos de contacto personal (telefono, direccion, contacto de emergencia) se eliminaran de este dialogo ya que pertenecen a la ficha del contacto/perfil, no al artista como entidad.
