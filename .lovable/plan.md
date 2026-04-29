
# Enforcement real de permisos funcionales

Objetivo: que los permisos definidos en la matriz **realmente bloqueen** acceso, tanto en la UI como en la base de datos. Hoy se calculan y se muestran, pero no impiden nada.

Principios:
- **Aditivo, nunca destructivo**: las RLS nuevas se SUMAN a las existentes (OR), no se borran las que ya hay.
- **OWNER / TEAM_MANAGER**: siempre tienen control total (la RPC `has_functional_permission` ya hace bypass).
- **Sin tocar** schemas reservados (`auth`, `storage`, `realtime`) ni `types.ts`.

---

## 1. UI: gating en hubs y sidebar

Para cada hub, envolver el contenido con `<IfCan module="X" required="view" fallback={<ForbiddenView/>}>` y los CTAs con `<PermissionGuard required="edit|manage">`.

Crear primero un componente compartido `src/components/permissions/ForbiddenView.tsx` con icono de candado, título "No tienes acceso a este módulo" y enlace a Dashboard, para usarlo como fallback en todos los hubs.

Mapeo módulo → archivo:

```text
bookings      → src/pages/Agenda.tsx (calendario), src/components/booking/* (ya bajo Agenda)
budgets       → src/pages/Budgets.tsx + tab dentro de FinanzasHub
cashflow      → tabs Cobros/Pagos/Liquidaciones/Fiscal/Panel en FinanzasHub
contracts     → src/pages/Documents.tsx
releases      → src/pages/Releases.tsx, src/pages/ReleaseDetail.tsx
projects      → src/pages/Proyectos.tsx, src/pages/Projects.tsx
drive         → src/pages/Drive.tsx
roadmaps      → src/pages/Roadmaps.tsx, src/pages/RoadmapDetail.tsx
solicitudes   → src/pages/Approvals.tsx, src/pages/ApprovalDetail.tsx
analytics     → src/pages/Analytics.tsx
contacts      → src/pages/MyManagement.tsx (Teams ya gestionado por workspace_role)
automations   → src/pages/Automatizaciones.tsx
```

Tratamiento especial en `FinanzasHub.tsx`: cada tab del array `TABS` se filtra por permiso. `panel/cobros/pagos/liquidaciones/fiscal` requieren `cashflow:view`; `presupuestos` requiere `budgets:view`. Si todas son `none`, mostrar `ForbiddenView`.

CTAs (botones "Nuevo / Crear / Eliminar") usan `<PermissionGuard required="edit">` (o `manage` para borrar y para acciones tipo "Cerrar trimestre", "Configurar automatización").

Sidebar (`src/components/AppSidebar.tsx` o similar): ocultar entradas de menú cuyo módulo asociado esté en `none` para el usuario actual usando `useCan()`.

## 2. RLS aditivo en BD (12 tablas)

Una sola migración SQL con políticas adicionales por tabla. Todas usan la helper `public.has_functional_permission(auth.uid(), <tabla>.workspace_id, '<módulo>', '<nivel>')` que ya existe y hace bypass para OWNER/TEAM_MANAGER.

Plantilla por tabla:

```sql
CREATE POLICY "select_by_func_perm_<modulo>" ON public.<tabla>
FOR SELECT TO authenticated
USING (public.has_functional_permission(auth.uid(), workspace_id, '<modulo>', 'view'));

CREATE POLICY "insert_by_func_perm_<modulo>" ON public.<tabla>
FOR INSERT TO authenticated
WITH CHECK (public.has_functional_permission(auth.uid(), workspace_id, '<modulo>', 'edit'));

CREATE POLICY "update_by_func_perm_<modulo>" ON public.<tabla>
FOR UPDATE TO authenticated
USING (public.has_functional_permission(auth.uid(), workspace_id, '<modulo>', 'edit'));

CREATE POLICY "delete_by_func_perm_<modulo>" ON public.<tabla>
FOR DELETE TO authenticated
USING (public.has_functional_permission(auth.uid(), workspace_id, '<modulo>', 'manage'));
```

Mapeo:

| Tabla | Módulo |
|---|---|
| `bookings` | bookings |
| `budgets`, `budget_lines` | budgets |
| `cashflow_entries` | cashflow |
| `contracts`, `contract_drafts` | contracts |
| `releases`, `tracks` | releases |
| `projects` | projects |
| `storage_nodes`, `project_files` | drive |
| `roadmaps`, `roadmap_items` | roadmaps |
| `approvals` | solicitudes |
| `automation_configs` | automations |

Para tablas hijas sin `workspace_id` directo (`budget_lines`, `tracks`, `roadmap_items`, `contract_drafts`), la policy hace JOIN con la tabla padre vía subselect.

`contacts` se deja fuera por ahora: tiene su propio modelo y romperíamos el espejo `mirror_type=workspace_member` que el propio sistema de permisos consulta para resolver el rol del usuario. Se gatea solo en UI.

`analytics` no tiene tabla → solo UI.

## 3. Índices de rendimiento

Misma migración:

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_mirror_type
  ON public.contacts ((field_config->>'mirror_type'));
CREATE INDEX IF NOT EXISTS idx_frdp_module
  ON public.functional_role_default_permissions (module);
```

## 4. QA y memoria

- Smoke checklist: con un usuario `Booker` (rol funcional), confirmar que ve Bookings/Roadmaps, NO ve Cashflow ni Automatizaciones; con `Asesor Legal`, confirmar acceso `manage` a Contratos.
- Verificar con `supabase--read_query` que `has_functional_permission` devuelve `true` para OWNER en cualquier módulo y `false` para `Backliner` en `cashflow`.
- Actualizar `mem://features/functional-role-permissions` describiendo el enforcement aplicado (lista de tablas con RLS y hubs con `<IfCan>`).

## Detalles técnicos

- Hooks: `useCan().can(module, level)` ya existe y está cacheado 60s + Realtime.
- `ForbiddenView` se ubica en `src/components/permissions/` para mantener la separación.
- Las nuevas RLS son **aditivas**: si el usuario ya tenía acceso por una policy previa (p.ej. ser propietario del recurso), seguirá teniéndolo; si NO tenía acceso pero su rol funcional sí lo concede, ahora podrá acceder. Esto puede ser intencional (un Booker accede a `bookings` aunque no sea creador). Si el usuario quisiera el comportamiento opuesto (intersección en vez de unión) habría que reemplazar policies, lo cual NO se hace en este plan por seguridad.
- Migración única, idempotente con `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`.

## Entregables

1. `src/components/permissions/ForbiddenView.tsx` (nuevo).
2. Wraps con `<IfCan>` / `<PermissionGuard>` en los 12 archivos de hubs/páginas listados.
3. Filtrado del sidebar por `useCan()`.
4. Migración SQL: ~40 policies aditivas + 2 índices.
5. Actualización de `mem://features/functional-role-permissions`.

## Aviso

El enforcement de RLS es la red de seguridad real. A partir del momento en que se aplique, **un rol con `cashflow=none` no podrá leer `cashflow_entries` aunque alguien manipule el cliente**. Si algún flujo interno (edge functions con anon key, vistas materializadas, etc.) dependía de leer esas tablas sin autenticación, lo notarás de inmediato. Las edge functions que usan `service_role` no se ven afectadas.
