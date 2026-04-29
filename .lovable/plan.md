
# Refinamiento del enforcement de permisos (Prioridad ALTA)

Objetivo: cerrar los 3 huecos detectados en la auditoría sin tocar lógica de negocio ni romper a usuarios `OWNER` / `TEAM_MANAGER` (que ya tienen bypass automático en `has_functional_permission`).

Principio: **todo es aditivo y reutiliza componentes existentes** (`HubGate`, `PermissionGuard`, `IfCan`, `useCan`). No se crean tablas nuevas, no se cambian RLS, no se toca `useAuth` ni `ProtectedRoute`.

---

## 1. Tabs de FinanzasHub filtradas por permiso

**Problema actual**: el hub entero exige `cashflow:view`. Un usuario con sólo `budgets:view` (p.ej. un Tour Manager o Booker) no puede entrar a Presupuestos porque el `HubGate` lo bloquea antes.

**Solución**:
- Mover el `HubGate` exterior y reemplazarlo por lógica granular.
- Cada tab tiene un `module` asociado:
  - `panel`, `cobros`, `pagos`, `liquidaciones`, `fiscal` → `cashflow`
  - `presupuestos` → `budgets`
- Filtrar el array `TABS` con `useCan()` antes de renderizar `TabsList`.
- Si el `activeTab` actual no está permitido, hacer `navigate` automático al primer tab visible.
- Si **ninguna** tab queda visible, mostrar `<ForbiddenView module="cashflow" />`.
- Esto preserva el routing actual (`/finanzas`, `/finanzas/cobros`, etc.) y no rompe deep-links: si se entra por URL a un tab no permitido, redirige al primero permitido.

Archivos: `src/pages/FinanzasHub.tsx` (único cambio).

## 2. Gate en páginas de detalle

**Problema**: `ReleaseDetail`, `RoadmapDetail`, `ApprovalDetail` y `Projects.tsx` (vista lista antigua) son accesibles por URL directa. La RLS bloquea las queries y el usuario ve una pantalla "fantasma" sin mensaje claro.

**Solución**: envolver cada componente con `<HubGate module="X" required="view">` igual que ya se hizo en los hubs.

| Archivo | Módulo |
|---|---|
| `src/pages/ReleaseDetail.tsx` | `releases` |
| `src/pages/RoadmapDetail.tsx` | `roadmaps` |
| `src/pages/ApprovalDetail.tsx` | `solicitudes` |
| `src/pages/Projects.tsx` | `projects` |

Importante: el `HubGate` se aplica al componente exportado, **después** de los hooks que cargan datos por ID, para no romper el orden de hooks. Pattern: extraer el contenido a `XInner` y exportar `<HubGate>...<XInner/></HubGate>` igual que se hizo en los hubs.

## 3. Gating fino de CTAs (botones Crear / Editar / Eliminar)

**Problema**: dentro de los hubs ya gateados, los botones "Nuevo / Eliminar" están visibles para usuarios con sólo `view`. Al pulsarlos, la BD bloquea la mutación con un error genérico — UX pobre.

**Solución**: envolver cada CTA con el componente ya existente `<PermissionGuard module="X" required="edit|manage">` (o el más liso `<IfCan>` si no se quiere fallback). Si el usuario no tiene permiso, el botón simplemente no se renderiza.

**Alcance prioritario** (los CTAs más visibles y dañinos si se pulsan sin permiso):

```text
src/pages/Releases.tsx          → botón "Nuevo Release"  (releases:edit)
src/pages/Proyectos.tsx         → botón "Nuevo Proyecto" (projects:edit)
src/pages/Roadmaps.tsx          → botón "Nuevo Roadmap"  (roadmaps:edit)
src/pages/Documents.tsx         → "Nuevo contrato" / "Nuevo borrador" (contracts:edit)
src/pages/Approvals.tsx         → botón "Nueva solicitud" (solicitudes:edit)
src/pages/Automatizaciones.tsx  → "Nueva automatización" (automations:manage)
src/pages/Drive.tsx             → "Subir archivo" / "Nueva carpeta" (drive:edit)
src/pages/Agenda.tsx            → "Nuevo evento" (bookings:edit)
src/components/finanzas/CobrosTab.tsx + PagosTab + LiquidacionesTab → botones de alta (cashflow:edit)
src/components/finanzas/FinanzasPanelTab.tsx → "Cerrar trimestre" (cashflow:manage)
src/pages/Budgets.tsx           → "Nuevo presupuesto" (budgets:edit)
```

Los botones de **eliminar** dentro de listas (filas/cards) suelen estar en componentes hijos. Plan: en esta iteración cubrimos sólo los CTAs principales del header de cada hub. Los iconos de borrar fila se dejan para una siguiente iteración (la RLS sigue siendo la red de seguridad real).

## 4. Toast claro cuando RLS bloquea una mutación (mejora UX)

Pequeña mejora transversal: en los handlers de error de las mutaciones, detectar el código de error de Postgres `42501` (insufficient_privilege) o el mensaje "violates row-level security policy" y mostrar un toast amistoso `"No tienes permiso para realizar esta acción"` en lugar del error técnico crudo.

Implementación: helper `src/lib/permissions/handlePermissionError.ts` con `function handleSupabaseError(error)` que se puede llamar desde cualquier `.catch()`. Sólo se aplica oportunísticamente en los CTAs que toquemos en el punto 3 (no se hace refactor masivo).

---

## Detalles técnicos

### Patrón para tabs filtradas (FinanzasHub)

```tsx
const TABS = [
  { value: 'panel',         label: 'Panel',         module: 'cashflow' as ModuleKey, ... },
  { value: 'cobros',        label: 'Cobros',        module: 'cashflow' as ModuleKey, ... },
  { value: 'pagos',         label: 'Pagos',         module: 'cashflow' as ModuleKey, ... },
  { value: 'presupuestos',  label: 'Presupuestos',  module: 'budgets'  as ModuleKey, ... },
  { value: 'liquidaciones', label: 'Liquidaciones', module: 'cashflow' as ModuleKey, ... },
  { value: 'fiscal',        label: 'Fiscal',        module: 'cashflow' as ModuleKey, ... },
];

const { can, loading } = useCan();
const visibleTabs = TABS.filter(t => loading || can(t.module, 'view'));

useEffect(() => {
  if (loading) return;
  if (!visibleTabs.length) return;
  if (!visibleTabs.find(t => t.value === activeTab)) {
    navigate(visibleTabs[0].path, { replace: true });
  }
}, [loading, activeTab, visibleTabs.length]);

if (!loading && !visibleTabs.length) {
  return <ForbiddenView module="cashflow" required="view" />;
}
```

### Patrón para páginas de detalle

```tsx
function ReleaseDetailInner() { /* contenido actual */ }

export default function ReleaseDetail() {
  return (
    <HubGate module="releases" required="view">
      <ReleaseDetailInner />
    </HubGate>
  );
}
```

### Patrón para CTAs

```tsx
<PermissionGuard module="releases" required="edit">
  <Button onClick={openNewReleaseDialog}>Nuevo Release</Button>
</PermissionGuard>
```

### Helper de errores RLS

```ts
// src/lib/permissions/handlePermissionError.ts
import { toast } from '@/hooks/use-toast';

export function isPermissionError(err: any): boolean {
  return err?.code === '42501'
      || /row-level security/i.test(String(err?.message ?? ''));
}

export function handleSupabaseError(err: any, fallbackMsg = 'Error') {
  if (isPermissionError(err)) {
    toast({
      title: 'Permiso denegado',
      description: 'No tienes permisos para realizar esta acción.',
      variant: 'destructive',
    });
    return;
  }
  toast({ title: fallbackMsg, description: err?.message ?? 'Error desconocido', variant: 'destructive' });
}
```

---

## Lo que NO hacemos (y por qué)

- **No tocamos RLS ni la BD**: ya están bien. No hacen falta migraciones, índices nuevos ni cambios de esquema. Los índices que se pidieron (`mirror_type`, `frdp_module`) ya están creados en la migración del 29/04.
- **No añadimos paginación nueva**: el sistema de permisos no hace queries propias paginables; consume la RPC `has_functional_permission` (cacheada 60s) y la tabla `functional_role_permission_overrides` (filas escasas, todas las del workspace caben en una query). Aplicar paginación aquí no aporta nada.
- **No tocamos `useAuth` ni `ProtectedRoute`**: el sistema de permisos funcionales se aplica encima de la autenticación, no la sustituye.
- **No reescribimos `PermissionBoundary` / `useAuthz`**: coexisten con el sistema funcional, sirven para gating por proyecto. Documentado en memoria, fuera del alcance de esta iteración.
- **No metemos zod**: este cambio no introduce ningún nuevo input de usuario, sólo gating.

## QA al terminar

- Con un OWNER: confirmar que ve todo (tabs, botones, páginas de detalle).
- Con un usuario sin `cashflow` pero con `budgets:view`: entrar a `/finanzas` debe redirigir a `/finanzas/presupuestos` y ver sólo esa tab.
- Con un usuario `releases:view` (sin `edit`): entrar a `/releases/:id` debe verse, pero el botón "Nuevo Release" en `/releases` no aparece.
- Confirmar que un toast claro salta si alguien (manipulando UI) intenta una mutación bloqueada por RLS.

## Entregables

1. **Modificados** (8 archivos):
   - `src/pages/FinanzasHub.tsx` (tabs filtradas)
   - `src/pages/ReleaseDetail.tsx`, `src/pages/RoadmapDetail.tsx`, `src/pages/ApprovalDetail.tsx`, `src/pages/Projects.tsx` (HubGate)
   - `src/pages/Releases.tsx`, `src/pages/Proyectos.tsx`, `src/pages/Roadmaps.tsx`, `src/pages/Documents.tsx`, `src/pages/Approvals.tsx`, `src/pages/Automatizaciones.tsx`, `src/pages/Drive.tsx`, `src/pages/Agenda.tsx`, `src/pages/Budgets.tsx` (PermissionGuard en CTAs principales)
   - `src/components/finanzas/CobrosTab.tsx`, `PagosTab.tsx`, `LiquidacionesTab.tsx`, `FinanzasPanelTab.tsx` (PermissionGuard en CTAs)
2. **Nuevo** (1 archivo): `src/lib/permissions/handlePermissionError.ts`
3. **Sin cambios en BD ni en `types.ts`**.
