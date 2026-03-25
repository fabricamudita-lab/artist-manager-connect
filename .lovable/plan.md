

## Eliminar la card "Artistas del Lanzamiento" de la página principal de Créditos

La card `ReleaseArtistRoles` que aparece en la página principal (fuera del diálogo) no aporta valor ya que la funcionalidad de asignar Main Artist / Featuring ahora vive dentro del diálogo "Editar Canción" con el componente `CreditedArtistRoles`.

### Cambio

**`src/pages/release-sections/ReleaseCreditos.tsx`**
- Eliminar las líneas 379-380 (el comentario y `<ReleaseArtistRoles .../>`)
- Eliminar la importación de `ReleaseArtistRoles` en la línea 2 (si ya no se usa en ningún otro lugar del archivo)

Un solo archivo, dos líneas eliminadas.

