
# Permisos por Rol Funcional — Matriz + Enforcement (UI + RLS)

Convertimos el `functional_role` (Mánager Personal, Booker, A&R…) de etiqueta visual a **capa real de permisos** que controla qué módulos puede ver/editar cada miembro, con una pestaña que lo documenta y un editor de overrides por workspace.

---

## 1. Lo que el usuario verá

### Pestaña nueva en `/teams`: "Permisos por rol"
Junto a las pestañas actuales (Equipos / Agenda / Vista libre) añadimos **"Permisos por rol"**.

Layout:
- **Selector de rol funcional** (28 roles del catálogo `FUNCTIONAL_ROLES` + personalizados detectados en el workspace) en columna izquierda con conteo de miembros que lo tienen.
- **Matriz a la derecha** con filas = módulos del sistema y columnas = nivel de acceso. Cada celda es un radio: `Sin acceso · Ver · Editar · Gestionar` con icono y color (rojo / amarillo / azul / verde).
- Banner superior: "Estos permisos se aplican automáticamente en toda la app. Cambia un rol y todos los miembros con ese rol verán el cambio al recargar."
- Botón **"Restaurar valores estándar de la industria"** por rol y global.
- Vista de solo lectura para no-OWNER; editable por OWNER/TEAM_MANAGER del workspace.

### En "Editar rol funcional" (modal existente)
Debajo del combobox añadimos una **tarjeta resumen** de qué desbloquea/restringe ese rol (top 4-5 módulos con badge), con link "Ver matriz completa" que abre la pestaña.

### En toda la app
Botones de Editar / Crear / Eliminar / "Marcar como pagado" / Subir archivo / Cambiar fase quedan **deshabilitados con tooltip** ("Tu rol *Booker* no permite editar presupuestos de release") cuando el rol funcional no concede el permiso. Si el módulo entero está en `none`, las entradas del sidebar correspondientes se ocultan.

---

## 2. Modelo de módulos y acciones

12 módulos cubren el sistema actual:

| Módulo            | Acciones (`view`, `edit`, `manage`)                                               |
|-------------------|-----------------------------------------------------------------------------------|
| `bookings`        | Ofertas, calendario, fases, riders, liquidaciones                                 |
| `budgets`         | Presupuestos (caché + capital), partidas, IRPF                                    |
| `cashflow`        | Pagos, cobros, fiscal                                                             |
| `contracts`       | Borradores, negociación, firma                                                    |
| `releases`        | Singles, álbumes, tracks, créditos, cronograma                                    |
| `projects`        | Proyectos 360, checklists, riesgos                                                |
| `drive`           | Documentos, carpetas, subidas                                                     |
| `roadmaps`        | Hojas de ruta, logística                                                          |
| `solicitudes`     | Solicitudes y aprobaciones                                                        |
| `analytics`       | BI, KPIs, ingresos                                                                |
| `contacts`        | Equipo, agenda, perfiles                                                          |
| `automations`     | Automatizaciones, emails programados                                              |

Niveles: `none < view < edit < manage`. `manage` incluye eliminar y configurar.

### Defaults estándar de la industria (resumen)

```text
Mánager Personal      → manage en TODO menos automations(edit)
Business Manager      → manage cashflow/budgets/analytics; view bookings/contracts; none releases
Director Artístico    → manage releases/projects; edit drive; view bookings; none cashflow/contracts
Booker / Booking Agent→ manage bookings/roadmaps; edit budgets(solo caché)/contracts; view contacts; none cashflow/releases
Tour Manager          → manage roadmaps; edit bookings; view drive; none budgets/cashflow
Road Manager          → edit roadmaps; view bookings; none resto
A&R                   → manage releases; edit projects/drive; view contacts/analytics; none financiero
Productor (Ejec.)     → edit releases/drive; view projects; none financiero
Compositor / Letrista → view releases/projects; edit propios créditos; none resto
Intérprete / Músico   → view releases/bookings/roadmaps; edit propio perfil; none resto
Técnico Sonido/Luces  → view bookings/roadmaps/drive; none resto
Backliner             → view roadmaps; none resto
Comunicación/Prensa   → manage drive(prensa); edit releases(notas); view analytics; none financiero
Marketing Digital     → edit releases/automations; view analytics; none financiero/contracts
Community Manager     → edit releases(redes); view analytics; none resto
Diseñador / Fotógrafo / Videógrafo → edit drive(propias subidas); view releases; none resto
Asesor Legal          → manage contracts; view bookings/budgets; none operativo
Asesor Fiscal         → manage cashflow; view budgets; none resto
Sello / Editorial / Distribuidor → view releases/analytics; edit contracts(propios); none operativo
Promotor              → view bookings(propios); none resto
```

El owner puede sobrescribir cada celda. Lo que no esté en overrides usa el default.

---

## 3. Cambios en base de datos

### Migración `20260428xxxxxx_functional_role_permissions.sql`

```sql
-- Catálogo de módulos (semilla, gestionable por código)
create type public.permission_level as enum ('none','view','edit','manage');

-- Defaults del sistema (no editables por usuario; se actualizan vía migraciones)
create table public.functional_role_default_permissions (
  id uuid primary key default gen_random_uuid(),
  role_name text not null,
  module text not null,
  level public.permission_level not null default 'none',
  unique (role_name, module)
);
create index idx_frdp_role on public.functional_role_default_permissions(role_name);
create index idx_frdp_module on public.functional_role_default_permissions(module);

-- Overrides por workspace (sobrescriben defaults para roles concretos)
create table public.functional_role_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role_name text not null,
  module text not null,
  level public.permission_level not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (workspace_id, role_name, module)
);
create index idx_frpo_ws on public.functional_role_permission_overrides(workspace_id);
create index idx_frpo_lookup on public.functional_role_permission_overrides(workspace_id, role_name, module);

alter table public.functional_role_default_permissions enable row level security;
alter table public.functional_role_permission_overrides enable row level security;

-- Defaults son lectura pública (catálogo)
create policy "defaults readable by authenticated"
  on public.functional_role_default_permissions for select
  to authenticated using (true);

-- Overrides: lectura para miembros del workspace, escritura solo OWNER/TEAM_MANAGER
create policy "overrides_select_workspace_members"
  on public.functional_role_permission_overrides for select to authenticated
  using (exists (select 1 from public.workspace_memberships wm
                 where wm.workspace_id = functional_role_permission_overrides.workspace_id
                   and wm.user_id = auth.uid()));

create policy "overrides_write_workspace_admins"
  on public.functional_role_permission_overrides for all to authenticated
  using (public.user_has_workspace_permission(auth.uid(), workspace_id, 'OWNER'::workspace_role)
      or public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'::workspace_role))
  with check (public.user_has_workspace_permission(auth.uid(), workspace_id, 'OWNER'::workspace_role)
      or public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'::workspace_role));

-- Función SECURITY DEFINER que devuelve el nivel efectivo (override > default)
create or replace function public.get_functional_permission(
  _user_id uuid, _workspace_id uuid, _module text
) returns public.permission_level
language sql stable security definer set search_path = public as $$
  with role as (
    select c.role as role_name
    from public.contacts c
    where c.field_config->>'workspace_user_id' = _user_id::text
      and c.field_config->>'mirror_type' = 'workspace_member'
    limit 1
  )
  select coalesce(
    (select level from public.functional_role_permission_overrides o, role
       where o.workspace_id = _workspace_id and o.role_name = role.role_name and o.module = _module),
    (select level from public.functional_role_default_permissions d, role
       where d.role_name = role.role_name and d.module = _module),
    'none'::public.permission_level
  );
$$;

-- Bonus: OWNER y TEAM_MANAGER siempre 'manage' (bypass del rol funcional)
-- se resuelve en la capa TS, no en SQL (más simple).

-- Índices nuevos pedidos por el usuario
create index if not exists idx_contacts_workspace_user_id
  on public.contacts ((field_config->>'workspace_user_id'))
  where field_config->>'mirror_type' = 'workspace_member';
```

Seed con `INSERT` (vía herramienta de inserción) de los ~336 registros (28 roles × 12 módulos) según la matriz de defaults.

---

## 4. Capa TS (lógica de negocio aislada)

### `src/lib/permissions/types.ts`
Enums de `Module` y `PermissionLevel`, jerarquía `none < view < edit < manage`.

### `src/lib/permissions/catalog.ts`
- `MODULES`: array de 12 módulos con `key`, `label`, `description`, `icon`.
- `INDUSTRY_DEFAULTS`: matriz literal de la sección 2 (single source of truth para seed y "restaurar valores").

### `src/lib/permissions/service.ts` (sin React)
- `getEffectivePermissions(userId, workspaceId)` → `Record<Module, PermissionLevel>`. Una sola query con paginación interna (`range(0,200)` defensivo) que junta defaults + overrides en memoria. Cacheado 60s con `Map`.
- `hasPermission(perms, module, requiredLevel)` puro.
- `validatePermissionWrite(input)` con **Zod**: `role_name` (1-100 chars trimmed), `module` (enum), `level` (enum), `workspace_id` uuid. Rechaza payloads malformados antes de tocar Supabase. Esto previene XSS (texto sanitizado) e inyecciones (parámetros tipados, nunca string-concat en queries).

### `src/hooks/useFunctionalPermissions.ts`
Hook React que envuelve el service y suscribe a cambios via `supabase.channel('functional_role_permission_overrides')` para invalidar cache.

### `src/hooks/useCan.ts`
`const can = useCan(); can('budgets','edit')` → boolean. Usado en toda la UI.

---

## 5. Aplicación en la app (frontend enforcement)

Pasada incremental, módulo a módulo:

1. **Sidebar (`AppSidebar.tsx`)** — ocultar entradas con `level === 'none'`.
2. **Botones de acción primarios** en cada hub (Bookings, Budgets, Cashflow, Contracts, Releases, Projects, Drive, Roadmaps, Solicitudes, Automations) → wrapper `<PermissionGuard module="x" required="edit" tooltip="…">`.
3. **Forms de detalle** → si `view`, `readOnly` props en inputs y ocultar botones Save/Delete.
4. **Rutas protegidas** en `App.tsx` → `<RequirePermission module="…" level="view">` redirige a `/permission-denied` con mensaje del rol.

Owner y TEAM_MANAGER **bypass** total (no son rol funcional, son admin de workspace).

---

## 6. RLS (enforcement en BD)

Para cada tabla ya con RLS, añadimos un guard adicional usando `get_functional_permission`. Ejemplo en `budgets`:

```sql
create policy "budgets_view_via_functional_role"
  on public.budgets for select to authenticated
  using (
    -- mantener los paths existentes (OWNER, ARTIST_MANAGER…)
    public.user_has_workspace_permission(auth.uid(),
      (select workspace_id from public.artists where id = budgets.artist_id), 'OWNER')
    or public.get_functional_permission(auth.uid(),
      (select workspace_id from public.artists where id = budgets.artist_id), 'budgets')
      <> 'none'
  );
```

Análogo para INSERT/UPDATE/DELETE exigiendo `edit` o `manage`. Aplicado en orden:
- `budgets`, `budget_items`
- `booking_offers`, `booking_documents`, `booking_expenses`
- `cashflow_entries`
- `contract_drafts`, `contracts_unified`
- `releases`, `tracks`, `release_credits`
- `projects`, `project_resources`
- `storage_nodes`
- `tour_roadmaps`, `tour_roadmap_blocks`
- `solicitudes`
- `automations`

Cada policy es **additive** (OR con las existentes) → no rompe accesos previos. Migraciones en archivos separados, una por dominio, para poder revertir.

---

## 7. Paginación, performance, índices

- Lectura de overrides: `range(0, 999)` (siempre <12·N roles, cabe sobrado).
- Query de matriz UI usa `select role_name, module, level` con índice `idx_frpo_lookup`.
- `get_functional_permission` evaluada en RLS: índice compuesto `(workspace_id, role_name, module)` la hace O(log n).
- Hook cachea por sesión; invalidación realtime.

---

## 8. Edge cases gestionados

- **Rol custom** (no en catálogo): se trata como `none` en todos los módulos hasta que el owner cree overrides.
- **Usuario sin contacto espejo** (`mirror_type` ausente): cae en defaults de su rol de workspace; si tampoco hay, `none` excepto OWNER/TEAM_MANAGER.
- **Owner editándose a sí mismo**: bloqueado en UI ("OWNER siempre tiene manage").
- **Cambio de rol funcional en vivo**: realtime channel refresca permisos sin recargar.
- **Múltiples workspaces**: permiso resuelto siempre con `workspace_id` del recurso.

---

## 9. Interacción con auth y panel actual

- No tocamos `auth.users`, `profiles.roles`, `workspace_memberships` ni `useAuth`.
- El sistema RBAC actual (`src/lib/authz/`) sigue gobernando WORKSPACE/ARTIST/PROJECT scopes. Lo nuevo es una **capa adicional** que solo restringe (nunca amplía) lo que ya permite RBAC.
- Modo impersonación de artista: el panel sigue funcionando porque el rol funcional se mira sobre el `auth.uid()` real, no sobre el impersonado.
- Sidebar dinámico: ya hay precedente con `useUserActiveRole`, reutilizamos el patrón.

---

## 10. Archivos a crear / modificar

**Nuevos**
- `supabase/migrations/2026…_functional_role_permissions.sql` (schema + función)
- `supabase/migrations/2026…_rls_functional_budgets.sql`
- `supabase/migrations/2026…_rls_functional_bookings.sql`
- `supabase/migrations/2026…_rls_functional_other.sql` (drive/releases/projects/etc agrupado)
- `src/lib/permissions/{types,catalog,service}.ts`
- `src/hooks/{useFunctionalPermissions,useCan}.ts`
- `src/components/permissions/{PermissionGuard,RequirePermission,PermissionMatrixEditor,RoleSummaryCard}.tsx`
- `src/pages/teams/PermissionsByRoleTab.tsx`
- `src/lib/permissions/__tests__/service.test.ts`

**Modificados**
- `src/pages/Teams.tsx` (nueva tab + tarjeta resumen en modal de rol)
- `src/components/AppSidebar.tsx` (filtrado por permisos)
- ~10-15 hubs (Bookings, Budgets, Cashflow, Contracts, Releases, Projects, Drive, Roadmaps, Solicitudes, Automations) para envolver botones críticos

---

## 11. Orden de ejecución cuando aprobes

1. Migración schema + función + índices.
2. Seed defaults (336 filas) vía herramienta de inserción.
3. Capa TS (`lib/permissions/*` + hooks).
4. Pestaña UI "Permisos por rol" funcional (lectura/escritura overrides).
5. Tarjeta resumen en modal de rol funcional.
6. Sidebar dinámico.
7. PermissionGuard en hubs (módulo a módulo, en orden: bookings → budgets → cashflow → contracts → releases → projects → drive → roadmaps → solicitudes → automations).
8. RLS additive por dominio (mismo orden que paso 7).
9. Tests unitarios del service + smoke test manual con un rol restringido (Booker).

Cada paso en commit independiente para poder revertir si algo se rompe.
