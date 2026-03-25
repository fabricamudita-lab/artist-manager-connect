

## Dar acceso a Leyre: Portal del Artista con edición completa

### Concepto
Crear una cuenta de usuario para Leyre y vincularla a su perfil de artista. Cuando inicie sesión, verá un dashboard personalizado con acceso completo a su información: datos de artista, lanzamientos, calendario de shows y datos fiscales/financieros.

### Pasos

**1. Crear cuenta de usuario para Leyre**
- Crear un usuario en Supabase Auth con el email de Leyre
- Crear su perfil en la tabla `profiles` con `active_role: 'artist'`
- Crear un `artist_role_binding` vinculando su `user_id` con su `artist_id` y rol `ARTIST_MANAGER` (para edición completa)

**2. Vincular artista a perfil de usuario**
- La tabla `artists` ya tiene un campo `profile_id`. Asignarle el `profile.id` de Leyre para que el sistema sepa que ella ES ese artista (no solo que tiene acceso)

**3. Adaptar el CollaboratorDashboard para artistas vinculados**
- Cuando un usuario tiene `artist_role_bindings`, el `CollaboratorDashboard` ya muestra sus artistas asignados
- Añadir accesos directos específicos al dashboard del artista:
  - **"Mi Perfil de Artista"** → enlace a `/artistas/:id` (su ficha 360)
  - **"Mis Lanzamientos"** → enlace a `/releases` filtrado por su artista
  - **"Mis Shows"** → enlace a booking/calendario filtrado
  - **"Mis Finanzas"** → enlace a finanzas filtrado

**4. Adaptar la navegación lateral (AppSidebar)**
- Para usuarios con `active_role !== 'management'`, mostrar menú simplificado:
  - Dashboard
  - Mi Perfil (→ su ficha de artista directamente)
  - Mis Lanzamientos (→ discografía filtrada)
  - Calendario (→ sus shows)
  - Finanzas (→ sus datos fiscales/royalties)
  - Solicitudes
  - Chat

**5. Adaptar permisos de edición en páginas existentes**
- **ArtistProfile** (`/artistas/:id`): Si el usuario es el propio artista (su `profile_id` coincide) o tiene rol `ARTIST_MANAGER`, permitir edición completa de bio, redes, género, datos fiscales
- **Releases/Discografía**: Filtrar automáticamente por `artist_id` del usuario vinculado; permitir ver y editar créditos, assets
- **Booking/Calendario**: Filtrar por su `artist_id`; mostrar shows en modo lectura o edición según preferencia
- **Finanzas**: Mostrar solo sus datos fiscales, IRPF, liquidaciones

**6. RLS: Asegurar acceso a nivel de base de datos**
- Las políticas RLS existentes ya usan `artist_role_bindings` para controlar acceso
- Verificar que las tablas clave (`artists`, `releases`, `tracks`, `booking_offers`, etc.) tienen políticas que permiten SELECT/UPDATE a usuarios con binding al artista
- Añadir políticas faltantes si es necesario

### Detalle técnico
- **Archivos principales a modificar**:
  - `src/components/AppSidebar.tsx` — navegación condicional para artistas
  - `src/components/dashboard/CollaboratorDashboard.tsx` — dashboard enriquecido para artistas vinculados
  - `src/pages/ArtistProfile.tsx` — permisos de edición basados en binding
  - Páginas de releases, booking, finanzas — filtrado por artista vinculado
- **Migración SQL**: Verificar/añadir RLS policies para que artistas con binding puedan acceder y editar sus datos
- **No se crean tablas nuevas**: Se reutiliza la infraestructura existente de `artist_role_bindings` + `profiles`

### Flujo para el usuario (tú como manager)
1. Desde "Mi Management" o la ficha del artista, habrá un botón "Invitar artista" que genera una invitación por email
2. Leyre recibe el email, crea su contraseña, y accede a su portal personalizado
3. Tú sigues viendo todo desde tu vista de management; ella ve solo su información

