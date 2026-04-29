
# Continuación: Pestaña informativa de roles + enforcement

Ya están listos: catálogo (29 roles × 12 módulos), tablas `functional_role_default_permissions` / `functional_role_permission_overrides`, RPCs `get_functional_permission` / `has_functional_permission`, servicio con cache+Zod, hooks `useFunctionalPermissions` / `useCan`, `<PermissionGuard>` / `<IfCan>`, y la pestaña editable `PermissionsByRoleTab`.

Falta lo que pediste explícitamente: **una pestaña de "ver información"** (solo lectura, didáctica) que explique qué hace cada rol, qué puede ver, qué puede editar y qué no puede ver — más rematar el enforcement en RLS y UI.

---

## 1. Nueva pestaña "Información de roles" (read-only, funcional)

Archivo nuevo: `src/pages/teams/RoleInfoTab.tsx`, montado en `src/pages/Teams.tsx` junto al modo "Permisos por rol" (icono `Info`).

Layout responsive (865px viewport):

```text
┌─────────────────────────────────────────────────────────┐
│ [Buscar rol…]  [Filtro módulo ▾]  [Solo roles asignados]│
├──────────────┬──────────────────────────────────────────┤
│ Roles (29)   │  Detalle del rol seleccionado            │
│ • Booker  3  │  ──────────────────────────────────────  │
│ • A&R     1  │  Descripción industria + responsabilidad │
│ • Manager 2  │                                          │
│ • …          │  ┌─ Puede gestionar ──────────────────┐  │
│              │  │ Bookings, Contratos…               │  │
│              │  ├─ Puede editar ─────────────────────┤  │
│              │  │ Presupuestos, Roadmaps…            │  │
│              │  ├─ Solo ver ─────────────────────────┤  │
│              │  │ Analytics, Cashflow…               │  │
│              │  ├─ Sin acceso ───────────────────────┤  │
│              │  │ Automations…                       │  │
│              │  └────────────────────────────────────┘  │
│              │  Indicador "Override de workspace" si    │
│              │  difiere del default industria.          │
└──────────────┴──────────────────────────────────────────┘
```

Datos:
- Lista de roles desde `catalog.ts` + count de miembros con ese `role` en `contacts` (mirror_type = workspace_member) del workspace activo.
- Por rol: `computeRolePerms(matrix, roleName)` (ya existe en `service.ts`) → agrupar módulos por nivel (`manage` / `edit` / `view` / `none`).
- Por cada módulo mostrar: label, descripción (de `ModuleDescriptor`), badge de nivel, e icono "modificado por workspace" cuando el override difiere del default.
- Botón "Ver matriz completa" → cambia al modo edición existente (solo si OWNER/TEAM_MANAGER).

Mejoras menores en datos auxiliares:
- Añadir a `src/lib/permissions/catalog.ts` un mapa `ROLE_DESCRIPTIONS: Record<string,{summary:string; responsibilities:string[]}>` con texto industria (Booker, A&R, Manager, Tour Manager, Product Manager, Label Copy, Sync, Royalties, Legal, Marketing, RRSS, Diseño, Producción musical, Mezcla/Mastering, Distribución, Prensa, Radio, Promo digital, Manager financiero, Admin, etc.) — tomado de los PDFs de industria ya cargados como knowledge.

## 2. Enforcement en módulos (UI)

Envolver entradas y acciones en cada hub con `<IfCan>` / `<PermissionGuard>`:

- `src/pages/FinanzasHub.tsx` → `budgets` y `cashflow` (ocultar tabs `view < 'view'`, deshabilitar CTA `< 'edit'`, "Cerrar trimestre" solo `manage`).
- `src/pages/Proyectos.tsx`, `src/pages/Projects.tsx` → `projects`.
- `src/pages/Releases.tsx`, `src/pages/ReleaseDetail.tsx` → `releases` (incluye `creditos`, ruta actual del usuario).
- `src/pages/Documents.tsx` → `contracts`.
- `src/pages/Roadmaps.tsx`, `RoadmapDetail.tsx` → `roadmaps`.
- `src/pages/Drive.tsx` → `drive`.
- `src/pages/Approvals.tsx` → `solicitudes`.
- `src/pages/Analytics.tsx` → `analytics`.
- `src/pages/Automatizaciones.tsx` → `automations`.
- Sidebar (`src/components/`) → ocultar items con `level === 'none'`.

Patrón estándar:
```tsx
<IfCan module="budgets" required="view" fallback={<ForbiddenPage/>}>
  …contenido…
</IfCan>

<PermissionGuard module="budgets" required="edit">
  {(allowed)=> <Button disabled={!allowed}>Nuevo presupuesto</Button>}
</PermissionGuard>
```

## 3. Enforcement en BD (RLS aditivo, no destructivo)

Migración nueva: añadir políticas `*_functional_perm` que se suman (OR) a las existentes — nunca eliminar las que ya hay para no romper el flujo.

Plantilla por módulo:
```sql
CREATE POLICY "select_by_functional_perm" ON public.<tabla>
FOR SELECT TO authenticated
USING (
  public.has_functional_permission(auth.uid(), workspace_id, '<module>', 'view')
);

CREATE POLICY "write_by_functional_perm" ON public.<tabla>
FOR INSERT/UPDATE/DELETE TO authenticated
USING (public.has_functional_permission(auth.uid(), workspace_id, '<module>', 'edit'));
```

Tablas objetivo (mapeo módulo → tabla principal): `bookings`, `budgets`+`budget_lines`, `cashflow_entries`, `contracts`+`contract_drafts`, `releases`+`tracks`, `projects`, `storage_nodes`/`project_files`, `roadmaps`+`roadmap_items`, `approvals`, `automation_configs`, `contacts`. (Para `analytics` no hay tabla; se gatea solo en UI).

Cada migración se hará tabla por tabla, validando que la política previa sigue cubriendo a OWNER/TEAM_MANAGER (la RPC ya hace bypass).

## 4. Índices de rendimiento

Migración con índices sobre columnas que el sistema consulta a menudo:
- `functional_role_default_permissions(role_name, module)` (PK ya cubre, añadir `(module)`).
- `functional_role_permission_overrides(workspace_id, role_name, module)` y `(workspace_id)`.
- `contacts ((field_config->>'workspace_user_id'))` (ya creado en migración previa) + `((field_config->>'mirror_type'))`.
- Índices parciales por `workspace_id` en las tablas con políticas funcionales nuevas si faltan.

## 5. Tests / QA mínimo

- Smoke manual: con un usuario rol `Booker` debería ver `bookings` (manage) y NO ver `cashflow` ni `automations`.
- Verificación de la RPC con `supabase--read_query` para 2-3 combinaciones (OWNER, Booker, A&R).
- Confirmar que la pestaña informativa carga sin permisos de admin (cualquier miembro puede consultarla).

## Detalles técnicos

- Mantener separación: lógica en `src/lib/permissions/*`, UI en `src/pages/teams/*` y `src/components/permissions/*`.
- Paginación ya implementada en `loadPermissionsMatrix` (pageSize 500).
- Validación Zod ya cubre escrituras; las lecturas son por RPC + select tipados.
- No tocar `src/integrations/supabase/types.ts` (autogenerado).
- Sin cambios en `auth.users` ni en schemas reservados.

## Entregables

1. `src/lib/permissions/catalog.ts` — añadir `ROLE_DESCRIPTIONS` y `getRoleDescription()`.
2. `src/pages/teams/RoleInfoTab.tsx` — nueva pestaña informativa.
3. `src/pages/Teams.tsx` — añadir toggle/modo "Información de roles".
4. Wrap con `<IfCan>` / `<PermissionGuard>` en los 10 hubs listados.
5. Migración SQL: políticas RLS aditivas + índices.
6. Actualizar `mem://features/functional-role-permissions` con la nueva pestaña y el enforcement RLS.
