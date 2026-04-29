# Mostrar mensaje de "Sin permisos" en hubs principales

## Problema

Cuando "Perfil Test" tiene un rol funcional limitado (p. ej. **Booking Agent**) y entra a **Discografía**, no ve el mensaje de bloqueo: ve la pantalla vacía "Sin lanzamientos". Esto pasa porque:

- En `src/App.tsx`, las rutas **top-level** (`/releases`, `/booking`, `/finanzas`, `/projects`, `/drive`, `/documents`, `/roadmaps`, `/sincronizaciones`, `/analytics`, `/automatizaciones`, `/agenda`) **no están envueltas en `<HubGate>`**.
- Sólo las sub-rutas de Releases (`/releases/:id/cronograma`, etc.) tienen `HubGate`. RLS bloquea los datos a nivel BD, pero la UI muestra el estado vacío en lugar del mensaje claro.

## Solución

### 1. Envolver hubs principales con `HubGate`

En `src/App.tsx`, añadir `<HubGate module="X" required="view">` dentro del `DashboardLayout` para cada ruta top-level, mapeando ruta → módulo del catálogo:

| Ruta | Módulo |
|---|---|
| `/releases` | `releases` |
| `/booking` | `bookings` |
| `/finanzas` | `budgets` (hub financiero principal) |
| `/projects` y `/proyectos` | `projects` |
| `/drive` | `drive` |
| `/documents` | `contracts` |
| `/roadmaps` | `roadmaps` |
| `/sincronizaciones` | `solicitudes` |
| `/analytics` | `analytics` |
| `/automatizaciones` | `automations` |
| `/agenda` | `bookings` (calendario de directos) |

`HubGate` ya muestra spinner mientras carga y `ForbiddenView` cuando no hay permiso, así que no hay riesgo de "flash" de contenido.

### 2. Personalizar el mensaje con el rol funcional actual

Para que el aviso diga literalmente algo como *"El perfil **Booking Agent** tiene limitaciones para ver Releases. Pide al creador del workspace que ajuste tus permisos."*, hay que exponer el nombre del rol:

- **`src/lib/permissions/service.ts`**: nueva función `getActiveFunctionalRole(userId, workspaceId)` que reutiliza la query del contacto-espejo (ya existe inline en `getEffectivePermissions`) y devuelve el `role_name` actual. Cachear junto con los perms.
- **`src/hooks/useFunctionalPermissions.ts`**: cargar también el `roleName` y devolverlo en el state (`{ loading, perms, workspaceId, isWorkspaceAdmin, roleName }`). `useCan()` también lo expone.
- **`src/components/permissions/HubGate.tsx`**: pasar `roleName` a `ForbiddenView`.
- **`src/components/permissions/ForbiddenView.tsx`**:
  - Nueva prop opcional `roleName?: string`.
  - Si llega, el copy pasa a:
    > **El perfil _{roleName}_ tiene limitaciones**
    >
    > Tu rol actual no permite {ver/editar/gestionar} **{Módulo}**. Pide al creador del workspace que ajuste tus permisos para acceder a esta información.
  - Si `roleName` es null (caso raro: sin contacto-espejo) se mantiene el copy genérico actual.

Botones existentes ("Ir al Dashboard" / "Ver matriz de roles") se conservan.

### 3. Sin cambios destructivos

- No se tocan las RLS ya endurecidas en la migración anterior.
- No se tocan las sub-rutas que ya tienen `HubGate`.
- El bypass para `OWNER`/`TEAM_MANAGER` sigue intacto: nunca verán el mensaje.

## Archivos modificados

- `src/App.tsx` — wrap de 11 rutas top-level.
- `src/lib/permissions/service.ts` — `getActiveFunctionalRole` + cache.
- `src/hooks/useFunctionalPermissions.ts` — exponer `roleName`.
- `src/components/permissions/HubGate.tsx` — propagar `roleName`.
- `src/components/permissions/ForbiddenView.tsx` — copy personalizado.

## Verificación manual

1. Con "Perfil Test" como **Booking Agent**, ir a `/releases` → debe verse el mensaje "El perfil _Booking Agent_ tiene limitaciones…".
2. Ir a `/booking` → acceso permitido (su módulo).
3. Cambiar el rol a **Road Manager** y volver a `/releases` → mensaje actualizado al instante (gracias al realtime de `artist_role_bindings` ya implementado).
4. Como OWNER → todos los hubs siguen accesibles sin mensaje.
