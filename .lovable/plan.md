## Conectar todos los filtros del calendario entre sí

Hoy los filtros se aplican al render pero **no se condicionan entre ellos**: si seleccionas un artista, sigues viendo todos los proyectos / departamentos del workspace. Además el filtro de **Proyecto** es de selección única (oculto detrás de un `Select` simple).

### Cambios

1. **Proyecto → multi-selección real**
   - Reemplazar el `Select` por un popover con checkboxes (mismo patrón visual que `ArtistSelector`).
   - Mostrar contador (`N seleccionados`) y opción "Limpiar".
   - Sigue tipado como `string[]` (ya lo era a nivel de estado).

2. **Cascada Artistas → Proyecto / Equipo / Departamento / Lanzamientos / Hitos**
   - Si hay artistas seleccionados, todo lo demás se restringe a esos artistas; si no hay, se usa el conjunto de artistas accesibles (RBAC).
   - **Proyecto**: ya filtra `projects.artist_id IN (selectedArtists)` (hecho en el paso anterior). Si el usuario deselecciona un artista cuyo proyecto estaba elegido, ese projectId se limpia automáticamente del estado (`selectedProjects`).
   - **Equipo**: ampliar `CalendarTeamMember` con `artist_ids: string[]`. Para perfiles workspace se obtiene de `artist_role_bindings`; para contactos del campo `contacts.artist_id`. La lista mostrada en el dropdown se filtra a miembros con al menos un `artist_id` ∈ selección de artistas (los miembros sin vínculo a artista — p.ej. management general — siempre se muestran).
   - **Departamento**: solo se listan las categorías que tengan al menos un miembro visible tras aplicar el filtro de artistas. Si el departamento elegido deja de existir en el subconjunto, se resetea a `'all'`.
   - **Lanzamientos / Hitos**: ya respetan `selectedArtists` vía `releaseArtistIds`. Además se aplicará el filtro de proyecto multi-selección que ya hicimos.

3. **Sincronización inversa (limpieza automática)**
   - Si cambia `selectedArtists`, recalcular y "podar":
     - `selectedProjects` → quedarse solo con los projectIds cuyos `artist_id` siguen seleccionados.
     - `selectedTeam` → si el miembro elegido ya no es visible, volver a `'all'`.
     - `selectedDepartment` → si la categoría ya no aparece, volver a `'all'`.

4. **Toolbar**
   - Reescribir la sección "Proyecto" del `CalendarToolbar` con un sub-popover de checkboxes.
   - Pasar la lista de departamentos visibles (calculada en `Calendar.tsx`) en lugar de usar `TEAM_CATEGORIES` completo.
   - Pasar la lista filtrada de `teamMembers` (ya cruzada por artistas + departamento) al dropdown de Equipo.

### Validación / seguridad

- Nada nuevo en BD: las relaciones (`artist_role_bindings`, `contacts.artist_id`, `projects.artist_id`, `workspace_memberships.team_category`) ya existen y están indexadas.
- Las queries siguen usando el cliente Supabase parametrizado: sin SQL injection ni XSS.
- El `CalendarFiltersSchema` (Zod) ya valida los IDs antes de aplicar filtros.

### Archivos a tocar

- `src/lib/calendar/filters.ts` — añadir `artist_ids` a `CalendarTeamMember` y un helper `pruneFilters({ artists, projects, member, department, members, projectArtistMap })` que devuelve los filtros saneados.
- `src/pages/Calendar.tsx` — `fetchTeamMembers` enriquecido con bindings; `useEffect` de sincronización que llama a `pruneFilters` cuando cambia `selectedArtists`; cálculo de `visibleTeamMembers` y `visibleDepartments` y paso al toolbar.
- `src/components/calendar/CalendarToolbar.tsx` — nuevo `ProjectMultiSelect` (popover con checkboxes); recibir `departments` (lista filtrada) en vez de leer `TEAM_CATEGORIES` directo.