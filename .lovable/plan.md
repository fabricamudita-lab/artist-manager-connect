

## Eliminar perfil de artista

### Resumen
Añadir un botón "Eliminar artista" en el diálogo de información del artista (`ArtistInfoDialog`) con confirmación, que elimine el artista y todas sus dependencias, y redirija al dashboard.

### Cambios

**1. `src/components/ArtistInfoDialog.tsx`**
- Añadir botón rojo "Eliminar artista" al final del diálogo (visible solo para usuarios con rol management)
- Mostrar un `ConfirmationDialog` antes de ejecutar la eliminación
- Al confirmar: ejecutar `DELETE FROM artists WHERE id = artistId`
- Tras eliminar: cerrar diálogo, invalidar queries, navegar a `/mi-management`

**2. Dependencias en cascada (base de datos)**
- Verificar que las foreign keys que referencian `artists.id` tienen `ON DELETE CASCADE` o manejar la eliminación manual de tablas dependientes (booking_offers, tracks, releases, storage_nodes, artist_role_bindings, etc.)
- Crear migración si es necesario para añadir cascadas faltantes

**3. Flujo**
```text
ArtistInfoDialog → [Eliminar artista] → ConfirmationDialog
  "¿Estás seguro? Se eliminarán todos los datos asociados"
  → Confirmar → DELETE → toast éxito → navegar a /mi-management
```

