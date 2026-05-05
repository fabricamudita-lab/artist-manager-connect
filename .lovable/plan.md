## Problema

El sidebar muestra el icono de candado (🔒) en módulos como **Proyectos, Discografía, Booking, Finanzas, Drive, Documentos, Hojas de Ruta, Analytics**, pero al entrar el usuario sí ve el contenido (HubGate lo deja pasar). Esto crea información contradictoria.

## Causa raíz

Hay **dos rutas de cálculo de permisos** que no coinciden:

| Capa | Cómo resuelve el rol funcional | Sujeto a RLS |
|---|---|---|
| **HubGate** (página) | RPC `get_functional_permission` (`SECURITY DEFINER`) | No — bypassea RLS |
| **Sidebar** vía `useFunctionalPermissions` → `getEffectivePermissions` | Query cliente directa a `contacts` filtrando por `field_config->>workspace_user_id` | **Sí** — limitado por RLS |

Para usuarios que no son OWNER/TEAM_MANAGER (p. ej. el perfil "test" con rol funcional asignado), las RLS de `contacts` impiden que el cliente lea su propia fila espejo. El cliente recibe `roleName = null`, asume permisos vacíos y **bloquea visualmente todo el sidebar** con candados, mientras el HubGate (que sí ve la fila a través del RPC) le concede acceso al entrar.

## Solución

Unificar ambas capas en torno a la **misma fuente autoritativa** (la BD), reemplazando la lectura cliente del rol por una RPC equivalente.

### 1. Nueva función SQL `get_user_functional_role`
`SECURITY DEFINER`, devuelve el `role_name` resuelto desde el contacto espejo del usuario en su workspace activo (misma lógica que ya está embebida en `get_functional_permission`).

```sql
create or replace function public.get_user_functional_role(
  _user_id uuid, _workspace_id uuid
) returns text
language plpgsql stable security definer set search_path = public
as $$ ... select c.role from public.contacts c
       where field_config->>'workspace_user_id' = _user_id::text
         and field_config->>'mirror_type' = 'workspace_member'
         and c.role is not null limit 1 ... $$;
```

### 2. Actualizar `src/lib/permissions/service.ts`
- En `getEffectivePermissions`, sustituir el bloque que hace `supabase.from('contacts').select('role')...` por `supabase.rpc('get_user_functional_role', { _user_id, _workspace_id })`.
- Mantener cache de 60s y bypass OWNER/TEAM_MANAGER tal cual.

### 3. Actualizar `src/components/permissions/HubGate.tsx`
- En el bloque que obtiene el `roleName` para el mensaje de "Sin acceso", también usar la nueva RPC en lugar de la query directa a `contacts`. Así quedan completamente alineadas las dos rutas y el mensaje funciona aunque RLS oculte la fila.

### 4. Garantía visual extra (defensa en profundidad)
En `src/components/AppSidebar.tsx` (`isItemLocked`), tratar **`roleName === null` mientras `permsLoading === false`** como "no bloquear" — nunca mostramos candados si no hemos podido resolver el rol; preferimos dejar pasar al HubGate, que es la autoridad. Esto evita falsos positivos si en el futuro vuelve a fallar la resolución.

```ts
const isItemLocked = (url) => {
  if (!isManagement || permsLoading) return false;
  if (isWorkspaceAdmin) return false;
  if (!roleName) return false;          // ← nuevo
  const mod = URL_TO_MODULE[url];
  if (!mod) return false;
  return !can(mod, 'view');
};
```
(Requiere exponer `roleName` desde `useCan`, que ya lo devuelve `useFunctionalPermissions`.)

## Resultado esperado

- El sidebar mostrará candado **solo** en módulos donde el HubGate también bloquearía el acceso. Cero contradicción.
- Para perfiles con rol funcional como "Mánager Personal" (defaults `manage` en todo), no aparecerá ningún candado.
- Para perfiles con rol restringido (p. ej. "Booker"), aparecerán candados únicamente en los módulos realmente vetados (`releases`, `cashflow`, etc.).

## Archivos a modificar

- `supabase/migrations/<new>.sql` — nueva función `get_user_functional_role`.
- `src/lib/permissions/service.ts` — usar RPC para resolver el rol.
- `src/components/permissions/HubGate.tsx` — mismo cambio para el mensaje.
- `src/components/AppSidebar.tsx` — guarda extra cuando `roleName` es null.
