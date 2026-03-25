

## Modo Preview del Portal del Artista

### Concepto
Añadir un botón "Previsualizar portal" en la ficha del artista que simula temporalmente la vista del artista sin crear cuentas ni modificar roles. Se renderiza el `CollaboratorDashboard` en un dialog/modal con los datos reales del artista.

### Cambios

**1. `src/pages/ArtistProfile.tsx` — Botón "Previsualizar portal"**
- Añadir un botón junto al de "Invitar Artista" en la cabecera
- Al hacer clic, abre un dialog a pantalla completa (o casi completa) que muestra el portal del artista

**2. Nuevo componente `src/components/ArtistPortalPreview.tsx`**
- Dialog de pantalla completa que renderiza:
  - La cabecera del artista (avatar, nombre, "Tu portal de artista")
  - Las stats cards (shows próximos, lanzamientos, finanzas) con datos reales del artista
  - Los accesos directos (Mi Perfil, Mis Lanzamientos, Calendario, Mi Drive) — en modo preview estos no navegan, solo se muestran
  - La sidebar simplificada como preview lateral o como mockup visual
- Los datos se obtienen directamente con el `artistId` (sin necesitar binding), ya que tú como manager ya tienes acceso a esos datos
- Se muestra un banner superior indicando "Vista previa — Así verá el artista su portal"

**3. Detalle visual**
- El dialog usa el mismo layout que `CollaboratorDashboard` en su rama `linkedArtist`
- Reutiliza los mismos componentes (Cards, Avatar, etc.)
- Banner superior con fondo amarillo/ámbar: "Estás previsualizando el portal de [nombre]. El artista verá esta vista al iniciar sesión."
- Las cards de navegación son clickeables para navegar a las secciones reales (ya tienes acceso como manager)

### Archivos
- `src/components/ArtistPortalPreview.tsx` (nuevo)
- `src/pages/ArtistProfile.tsx` (añadir botón)

