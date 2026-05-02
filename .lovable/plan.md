# Fix: candados incorrectos en el menú lateral

## Problema

El sidebar muestra el icono de candado en elementos como **Proyectos, Discografía, Booking, Sincronizaciones, Hojas de Ruta, Finanzas, Analytics, Drive, Documentos**, aunque tu cuenta es **Management (OWNER del workspace)** y sí puedes acceder a ellos al hacer clic.

## Causa

En `src/components/AppSidebar.tsx`, el helper `isItemLocked` decide el bloqueo usando solo `useCan().can(module, 'view')`. Ese hook (`useFunctionalPermissions`) únicamente evalúa el **rol funcional** (overrides) y devuelve `false` cuando el OWNER no tiene un rol funcional asignado o cuando su rol funcional concreto no incluye explícitamente "view" en un módulo.

Sin embargo, `HubGate` sí permite el acceso a esos módulos porque hace un **bypass**: si la membresía es `OWNER` o `TEAM_MANAGER`, concede acceso total sin mirar el rol funcional. De ahí la inconsistencia: el sidebar bloquea visualmente lo que el HubGate permite abrir.

Además, el hook `useFunctionalPermissions` ya expone `isWorkspaceAdmin` (true para OWNER/TEAM_MANAGER), pero `useCan` no lo está devolviendo, así que el sidebar no puede usarlo.

## Solución

1. **`src/hooks/useFunctionalPermissions.ts`** — exponer `isWorkspaceAdmin` también desde `useCan`:
   ```ts
   export function useCan() {
     const { perms, loading, roleName, isWorkspaceAdmin } = useFunctionalPermissions();
     return {
       loading,
       perms,
       roleName,
       isWorkspaceAdmin,
       can: (module, required) => hasPermission(perms, module, required),
     };
   }
   ```

2. **`src/components/AppSidebar.tsx`** — saltarse el bloqueo si el usuario es admin del workspace, alineando el sidebar con el comportamiento real de `HubGate`:
   ```ts
   const { can, loading: permsLoading, isWorkspaceAdmin } = useCan();

   const isItemLocked = (url: string): boolean => {
     if (!isManagement || permsLoading) return false;
     if (isWorkspaceAdmin) return false; // OWNER / TEAM_MANAGER nunca ven candado
     const mod = URL_TO_MODULE[url];
     if (!mod) return false;
     return !can(mod, 'view');
   };
   ```

## Resultado esperado

- **OWNER / TEAM_MANAGER** (tu caso, "Management"): no verás ningún candado; el menú se ve completo y limpio como antes.
- **Colaboradores con rol funcional**: seguirán viendo todo el menú, pero con candado en los módulos donde su rol funcional no tenga permiso "view", y al entrar verán el `ForbiddenView` con la opción de pedir permiso (comportamiento ya implementado).

## Archivos a modificar

- `src/hooks/useFunctionalPermissions.ts` (exportar `isWorkspaceAdmin` desde `useCan`)
- `src/components/AppSidebar.tsx` (usar `isWorkspaceAdmin` en `isItemLocked`)
