## Diagnóstico actual de los filtros del calendario

| Filtro | Hoy hace | Problema |
|---|---|---|
| **Proyecto** | Carga TODOS los proyectos de la BD sin filtrar por artistas accesibles. El filtro está **comentado** y no aplica nada (porque `events` no tiene `project_id`). | 1) Lista contaminada con proyectos de otros artistas. 2) Seleccionar un proyecto no filtra nada. 3) No filtra `booking_offers` ni los nuevos `releases` / `milestones`, que **sí** tienen `project_id`. |
| **Equipo** | Carga miembros del workspace + contactos del usuario marcados con `field_config.is_team_member = true`. La selección **no se aplica** a ninguna query (no se lee en los `useEffect`). | El selector existe pero es decorativo: no filtra nada. |
| **Departamento** | Lista las categorías de `TEAM_CATEGORIES`. Al cambiar dispara `fetchEvents` pero **tampoco se aplica** porque ningún evento/booking tiene "departamento". | Idem: solo decorativo. |

Además: faltan los **nuevos artistas accesibles** (RBAC) en estos filtros, igual que ya hicimos con el selector de artistas.

---

## Solución coherente con el resto del sistema

### 1. Filtro de Proyecto

- **Cargar solo proyectos accesibles**: filtrar `projects` por `artist_id IN (accessibleArtistIds)` y excluir folders (`is_folder = false`).
- **Reaccionar al filtro de Artistas**: si el usuario selecciona artistas, la lista de proyectos se reduce a los proyectos de esos artistas.
- **Aplicar el filtro en datos**:
  - `booking_offers`: filtrar por `project_id IN (selectedProjects)`.
  - `releases` y `milestones`: filtrar por `release.project_id IN (selectedProjects)`.
  - `events`: la tabla no tiene `project_id` → en este caso, derivar el filtro vía `artist_id` del proyecto (mostrar eventos del artista del proyecto). Documentado en código.

### 2. Filtro de Equipo (miembro)

- **Cargar miembros relevantes**: workspace_memberships del workspace del usuario + contactos del workspace marcados como `is_team_member`. Hoy solo carga contactos `created_by = user.id` → lo abrimos a contactos del workspace para coherencia con el resto del sistema.
- **Aplicar el filtro**:
  - `events`: por `created_by = miembro` (workspace) o, si es contacto, no aplica → ocultar eventos cuando el miembro es contacto.
  - `booking_offers`: por `created_by = miembro` (workspace) o `tour_manager_new = miembro.id` (contacto).
  - `milestones`: por `responsible = miembro.full_name` (texto libre, match exacto).

### 3. Filtro de Departamento

- **Origen del dato**: `workspace_memberships.team_category` (workspace) y `contacts.category` (contactos).
- **Aplicar el filtro**: filtrar en cliente la lista de `teamMembers` ya cargados que pertenezcan al departamento elegido, y luego cruzar con eventos/bookings/milestones igual que el filtro de Equipo (efecto: "muestra solo elementos creados/asignados a alguien del departamento X").

### 4. RBAC y consistencia con Artistas

- Los tres filtros respetan `accessibleArtistIds` (mismo cálculo que ya implementamos para el filtro de Artistas).
- Si el usuario quita todos los artistas, los filtros de proyecto/equipo/departamento se vacían también.
- El valor `'all'` en Equipo/Departamento desactiva ese filtro (sin tocar los demás).

### 5. Separación de capas

- Crear un módulo `src/lib/calendar/filters.ts` con funciones puras:
  - `applyProjectFilter(items, selectedProjects, type)`
  - `applyMemberFilter(items, selectedMember, type)`
  - `applyDepartmentFilter(items, selectedDepartment, teamMembers, type)`
- `Calendar.tsx` solo orquesta: carga datos vía hooks, pasa por las funciones puras y pinta. Esto facilita test y futuros cambios de origen de datos.

### 6. Validación con Zod

- Esquema `CalendarFiltersSchema` (artistIds: uuid[], projectIds: uuid[], member: 'all' | uuid, department: 'all' | string) que valida los IDs antes de mandarlos a Supabase. Ubicación: `src/lib/calendar/filters.ts`.

---

## Sobre las otras peticiones técnicas

- **Cambios de esquema BD / migraciones / índices**: no hace falta. Todas las columnas necesarias (`projects.artist_id`, `booking_offers.project_id`, `workspace_memberships.team_category`, `contacts.category`, `release_milestones.responsible`) **ya existen** y tienen índices/uso suficiente. Crear índices nuevos sería prematuro.
- **Inyección SQL**: imposible aquí, usamos el cliente Supabase con parámetros tipados; ningún string del usuario se concatena en SQL crudo.
- **XSS**: los valores del filtro son IDs (uuid) o slugs cortos del enum de departamentos → renderizado seguro por React, no se usa `dangerouslySetInnerHTML`.
- **Paginación**: el calendario carga por rango de fechas implícito (artistas accesibles + estados activos), volúmenes manejables. Si en el futuro el workspace crece mucho, añadiremos paginación por rango de fechas visible. Hoy sería over-engineering.
- **Auth**: ningún cambio en el sistema de auth ni en el panel de usuario; reutilizamos `useAuth()` y los `accessibleArtistIds` ya calculados.

---

## Archivos a tocar

- `src/pages/Calendar.tsx` — `fetchProjects`, `fetchTeamMembers`, `fetchEvents`, `fetchBookingOffers`; reactividad a los tres filtros.
- `src/hooks/useCalendarReleases.ts` — aplicar filtro de proyecto a releases/milestones.
- `src/lib/calendar/filters.ts` (nuevo) — funciones puras de filtrado + schema Zod.
- `src/components/calendar/CalendarToolbar.tsx` — pequeño retoque: deshabilitar dropdown Proyecto si no hay artistas accesibles; ya soporta los demás props.