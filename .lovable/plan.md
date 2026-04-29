
## Problema

En el diálogo **Formatos de un artista** (`ArtistFormatsDialog`), al pulsar "Añadir miembro" se abre el selector "Seleccionar miembros". Hoy aparecen:

- El artista principal.
- Cualquier **workspace member** (cuentas del workspace, salgan o no en el equipo del artista).
- Cualquier contacto marcado `is_management_team`.
- Los contactos asignados al artista vía `contact_artist_assignments`.

El usuario pide que aparezcan **solo los miembros del equipo del artista** (como en el selector de Créditos / Autoría), y que para casos puntuales exista una segunda vía para **importar un contacto del workspace** o **crear uno nuevo**.

## Diseño de referencia (Créditos)

`AddCreditWithProfileForm` muestra:

1. **Artistas del Roster** (estrella).
2. **Equipo del Artista** (contactos con `contact_artist_assignments` → artista actual).
3. **Equipo Artístico general** + **Agenda** como secundarios al buscar.
4. Pestaña **"Nuevo"** para crear un colaborador a mano.

Todo dentro de un `Command` con buscador unificado.

## Solución

### 1. Nueva fuente de datos restringida al artista

En lugar de `useTeamMembersByArtist` (que mezcla workspace + management + asignados), añadir junto a él una query específica al estilo Credits — usar `contact_artist_assignments` para sacar **solo** los contactos del artista actual y agruparlos por categoría (`field_config.team_categories[0]` o `category`).

El artista principal sigue mostrándose en cabecera (igual que ahora).

### 2. Rediseñar el panel "Seleccionar miembros"

Estructura de dos modos, idéntica a Credits:

```text
┌─ [Tab: Equipo del artista] [Tab: Importar contacto] [Tab: Nuevo]
│  ── Artista Principal ──
│    ☑ Klaus Stroink
│  ── Banda ──
│    ☐ Jose · Batería
│    ☐ Kevin Diaz · Pianista
│    ☐ Guillem Boltó · Trombón
│  ── Técnicos ──
│    …
└─
```

- **Tab "Equipo del artista"** (por defecto): solo perfiles asignados al artista, agrupados por categoría. Es la vista limpia que pide el usuario. Sin workspace members globales ni management general.
- **Tab "Importar contacto"**: `Command` con buscador sobre **todos los contactos del workspace** (`contacts.created_by = user`), separados en grupos `Equipo Artístico` / `Agenda`. Al seleccionar uno, se añade como crew member del format (`type: 'contact'`). Opcionalmente permite marcar "Asignar al equipo de este artista" → crea la fila en `contact_artist_assignments` para que la próxima vez aparezca ya en la pestaña principal.
- **Tab "Nuevo"**: formulario mínimo (nombre + rol + categoría) que crea un `contacts` con `field_config.is_team_member = true` y, si "Asignar al artista" está marcado, también `contact_artist_assignments`. Tras crear, lo añade al format inmediatamente.

### 3. Comportamiento del checkbox de selección

Igual que ahora: clic alterna añadir/eliminar al `format.crewMembers` con `handleAddCrewMember` / `handleRemoveCrewMember`. Solo cambia la fuente de datos y la organización en pestañas.

### 4. Mantener el orden persistente y badges

- El badge actual `Usuario / Contacto` (línea 949) se sustituye por el nombre del rol (Batería, Pianista…). Los miembros del equipo del artista no necesitan distinguir si son cuenta o contacto a nivel visual; lo importante es el rol.
- Los workspace members con cuenta dejan de aparecer aquí salvo que estén explícitamente asignados al artista. Si el usuario quiere añadirlos, lo hace desde la pestaña "Importar contacto" (que sí los lista) o convirtiéndolos en miembros del equipo.

## Archivos a modificar

- `src/components/ArtistFormatsDialog.tsx` (líneas 308-309 — sustituir hook; 858-960 — rediseñar UI con `Tabs`).
- (opcional) crear hook `src/hooks/useArtistTeamMembers.ts` que devuelva sólo los contactos `assigned_to = artistId` agrupados por categoría, reutilizando la lógica de `useTeamMembersByArtist` pero con filtrado estricto.

Sin migraciones de DB — `contact_artist_assignments` y `field_config.team_categories` ya existen.

## Resultado

- Por defecto: lista limpia con solo el equipo del artista (Banda, Técnicos, etc.), igual que el bloque "Equipo del Artista" de Credits.
- Si necesitas añadir a alguien externo: pestaña **Importar** con todos los contactos del workspace y opción de fijarlo al equipo del artista.
- Si la persona no existe aún: pestaña **Nuevo** crea el contacto y lo añade en un solo paso.
