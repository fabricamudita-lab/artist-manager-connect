## Contexto y diagnóstico

**Bug confirmado.** La fuga no es un fallo del front: la base de datos está abierta. Casi todas las tablas (`projects`, `artists`, `budgets`, `booking_offers`, `releases`, `contracts`, etc.) tienen políticas RLS del tipo `auth.role() = 'authenticated'` o `qual = true`. Cualquier usuario logado ve todo. Además:

- Tabla `artists` tiene 11 políticas SELECT, una de ellas correcta (filtra por workspace) y otra abierta (`true`). Como las políticas son OR, gana la abierta.
- `projects` filtra por `created_by` pero le añade `OR auth.role()='authenticated'`, lo que anula el filtro.
- `workspaces` tiene un bug literal (`wm.workspace_id = wm.id`).
- El usuario demo (`davidsolanscontact@gmail.com`) **no tiene `workspace_id` ni membership** y aun así ve todo por estas RLS rotas.

Buena noticia: el sistema ya tiene la base correcta (`workspace_memberships`, `artist_role_bindings`, `project_role_bindings`, `authz/index.ts` con matriz de permisos en YAML). Solo hay que **enforzarlo en RLS** y exponerlo bien en UI.

Decisiones aprobadas: fix por capas (Fase 1 = Projects/Artists y tablas hijas críticas), roles ampliados a nivel ARTIST, política estricta donde solo OWNER del workspace ve todo sin binding.

---

## Fase 1 — Lo que entrego en esta iteración

### 1. Catálogo de roles ARTIST ampliado

Amplío el enum `artist_role` de `{ARTIST_MANAGER, ARTIST_OBSERVER}` a:

| Rol | Descripción | Permisos clave |
|---|---|---|
| `ARTIST_MANAGER` | Manager principal del artista | TODO sobre el artista y sus proyectos |
| `LABEL` | Sello discográfico | Ver todo, editar releases y contratos, ver finanzas |
| `BOOKING_AGENT` | Agencia de booking | Ver/editar booking_offers, ver calendario, ver contratos de booking |
| `PRODUCER` | Productor musical | Ver/editar releases (créditos, audio), ver agenda |
| `PUBLISHER` | Editorial | Ver/editar split sheets, royalties, contratos IP |
| `AR` | A&R | Ver releases y agenda, comentar |
| `ARTIST_OBSERVER` | Solo lectura | Ver dashboard, calendario, ventas (sin finanzas detalladas) |
| `ROADIE_TECH` | Equipo técnico de gira | Ver hojas de ruta, riders, calendario |

La matriz de permisos vive en `src/lib/authz/index.ts` (YAML ya existente, lo amplío).

### 2. Migración de base de datos

**Schema:**
- `ALTER TYPE artist_role ADD VALUE` para los 6 roles nuevos.
- Índices: `project_role_bindings(user_id)`, `project_role_bindings(project_id)`, `artist_role_bindings(user_id)`, `artist_role_bindings(artist_id)`, `workspace_memberships(user_id, workspace_id)`, `projects(artist_id)`, `artists(workspace_id)`.
- Funciones SECURITY DEFINER (evitan recursión RLS):
  - `user_can_see_artist(_user uuid, _artist uuid)` → `true` si tiene binding sobre el artista, OR es OWNER/TEAM_MANAGER del workspace del artista.
  - `user_can_see_project(_user uuid, _project uuid)` → `true` si tiene binding sobre el proyecto, OR puede ver el artista padre.
  - `user_can_edit_artist(_user uuid, _artist uuid)` → binding ARTIST_MANAGER/LABEL OR workspace OWNER/TEAM_MANAGER.
  - `user_can_edit_project(_user uuid, _project uuid)` → binding EDITOR OR ARTIST_MANAGER OR workspace OWNER/TEAM_MANAGER.

**Bootstrap (datos existentes):** Sembrado mínimo seguro:
- Para cada artista existente con `created_by` → INSERT en `artist_role_bindings(user_id=created_by, role='ARTIST_MANAGER')`.
- Para cada proyecto con `created_by` → INSERT en `project_role_bindings(user_id=created_by, role='EDITOR')`.

Esto garantiza que los creadores actuales (David Solans en este caso) no pierden nada. Cualquier otro usuario sin binding queda fuera salvo OWNER/TEAM_MANAGER del workspace.

**RLS reescrita en Fase 1 (DROP + CREATE):**

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `artists` | `user_can_see_artist(auth.uid(), id)` | OWNER/TEAM_MANAGER del workspace | `user_can_edit_artist` | OWNER del workspace |
| `projects` | `user_can_see_project(auth.uid(), id)` | `user_can_edit_artist(auth.uid(), artist_id)` | `user_can_edit_project` | `user_can_edit_artist` |
| `project_role_bindings` | propio binding OR `user_can_edit_project(...)` | `user_can_edit_project` | `user_can_edit_project` | `user_can_edit_project` |
| `artist_role_bindings` | propio binding OR `user_can_edit_artist(...)` | `user_can_edit_artist` | `user_can_edit_artist` | `user_can_edit_artist` |
| `budgets`, `booking_offers`, `releases` | `user_can_see_artist(auth.uid(), artist_id)` | `user_can_edit_artist` | `user_can_edit_artist` | OWNER workspace |
| `project_team`, `project_files`, `project_checklists`, `project_resources`, `project_incidents`, `project_questions`, `project_linked_entities`, `project_file_links` | derivado de `user_can_see_project(project_id)` | `user_can_edit_project` | `user_can_edit_project` | `user_can_edit_project` |
| `workspaces` | corregir el bug `wm.workspace_id = wm.id` → `wm.workspace_id = workspaces.id` | (sin cambio) | (sin cambio) | (sin cambio) |

Las políticas `ALTER POLICY` o las versiones públicas (form tokens, share tokens) se conservan — el cambio no las toca.

### 3. Validación backend con Zod

Esquemas Zod centralizados en `src/lib/validation/team.ts`:
- `inviteMemberSchema`: email RFC válido + max 255, role ∈ enum, scope ∈ {WORKSPACE, ARTIST, PROJECT}, scopeId UUID.
- `updateRoleSchema`, `removeMemberSchema`.
- Aplicado a las llamadas RPC y a la edge function de invitaciones.

### 4. Edge function `invite-team-member` endurecida

- Valida con Zod, devuelve códigos HTTP 400/403/404/409/500 explícitos.
- Comprueba que el invocante tenga permiso de invitar al scope solicitado (vía `user_can_edit_artist` / `user_can_edit_project`).
- Usa `service_role_key` solo internamente; nunca expuesto al cliente.
- Rate limit básico: máx. 30 invitaciones por usuario/hora (tabla `team_invite_throttle`).

### 5. Módulo de Equipos (UI)

En `/teams`:
- **Diálogo "Invitar Miembro al Equipo"** (el de la captura) ampliado:
  - Selector de **alcance** (Workspace / Artista / Proyecto).
  - Selector de **rol** depende del alcance (workspace → OWNER/TEAM_MANAGER; artista → los 8 roles nuevos; proyecto → EDITOR/COMMENTER/VIEWER).
  - Selector dinámico de artista o proyecto según alcance.
  - Email validado en cliente con Zod.
- Pestaña **"Miembros y permisos"** que lista los bindings agrupados por persona, mostrando: alcance, rol, artistas/proyectos accesibles, acciones (cambiar rol, revocar).
- Botones disabled con tooltip cuando el usuario actual no tiene `assignProjectRoles` / `inviteUsers`.

### 6. Listas con paginación

`useProjects`, `useArtists`, `useTeamMembers` con `range(from, to)` de Supabase + `count: 'exact'`. Página por defecto 50, infinite scroll en las vistas existentes. La separación lógica/UI ya estaba (hooks → páginas), se mantiene y refuerza.

### 7. Auditoría y observabilidad

Inserto en `audit_logs` cada vez que:
- Se concede/revoca un binding.
- Se rechaza una operación por authz (`logAuthzDecision` ya existente).

---

## Fase 1 — Detalles técnicos

**Archivos que tocaré:**
- Migración SQL nueva (enum + funciones SECURITY DEFINER + RLS reescrita + índices + bootstrap inserts).
- `src/lib/authz/index.ts` (ampliar YAML con 6 roles nuevos).
- `src/lib/validation/team.ts` (nuevo).
- `supabase/functions/invite-team-member/index.ts` (refactor).
- `src/components/teams/InviteMemberDialog.tsx` (rediseño).
- `src/components/teams/MembersList.tsx` (nuevo, lista de bindings).
- `src/pages/Teams.tsx` (integrar nueva pestaña).
- `src/hooks/useProjects.ts`, `src/hooks/useArtists.ts`, `src/hooks/useTeamMembers.ts` (paginación).
- `mem://core/rbac-hierarchy` y `mem://contacts/unified-system` (actualizar memoria).

**Lo que NO toco en Fase 1 (queda para fases 2/3):**
- RLS de: `cobros`, `royalty_*`, `payment_*`, `chat_*`, `channel_*`, `contracts`/`contract_*`, `solicitudes`, `epk_*`, `release_assets`/`release_documents`/`release_milestones`, `storage_nodes`, `event_*`, `liquidaciones`, `quick_expenses`, `documents`, `legal_documents`, `production_companies`, `directors`, `songs`, `song_splits`, `automations`, etc.
- Estas seguirán visibles a cualquier autenticado **hasta** que ataquemos Fase 2. Lo dejaré escrito en el aviso final para que esté claro.

---

## Notas de seguridad e implementación

- **No CHECK constraints con tiempo**: las validaciones de expiración van en triggers.
- **Sin recursión RLS**: todo paso por funciones SECURITY DEFINER.
- **Sin secretos en BD ni en frontend**: la edge function usa `SUPABASE_SERVICE_ROLE_KEY` interno.
- **XSS**: los inputs de invitación se renderizan ya con React (escape automático). Añado sanitización de `name` con `DOMPurify` solo si en algún momento se vuelca a HTML (no es el caso hoy).
- **SQL injection**: imposible con el cliente Supabase (queries parametrizadas) y con `psql` paramétrico en la edge function.
- **Edge cases controlados**: invitar a alguien ya miembro → 409; rol inválido para el scope → 400; scope inexistente → 404; sin permiso → 403; throttle excedido → 429.

---

## Lo que verás después de aplicar el plan

1. El usuario demo (`davidsolanscontact@gmail.com`) deja de ver proyectos/artistas que no son suyos. Solo verá los que él creó (porque le sembramos los bindings).
2. David Solans (workspace OWNER) sigue viendo todo dentro de su workspace.
3. En `/teams`, la UI de invitación permite asignar cualquiera de los 8 roles ARTIST + 3 PROJECT + 2 WORKSPACE, con scope explícito.
4. Las listas de proyectos y artistas paginan (50 por página).
5. Errores de invitación claros y trazados en `audit_logs`.

Tras tu aprobación, implemento la migración, los hooks y la UI, y te dejo un resumen con los puntos pendientes para Fase 2.
