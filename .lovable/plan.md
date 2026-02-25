

## Mostrar datos de MOODITA Management en modo demo

Actualmente, cuando no hay sesion activa, el Dashboard muestra "Demo User" y el sidebar muestra campos vacios (sin nombre ni rol). Vamos a hacer que toda la app muestre "MOODITA Management" con rol "management" como perfil de demo.

### Cambios

**1. `src/hooks/useAuth.tsx`** - Perfil demo centralizado

En lugar de parchear cada componente individualmente, haremos que el hook `useAuth` devuelva un perfil mock cuando no hay usuario autenticado. Asi todos los componentes (sidebar, dashboard, role selector, etc.) reciben datos consistentes.

- Cuando `loading` sea false y no haya `profile`, devolver un perfil demo:
  - `full_name`: "MOODITA Management"
  - `active_role`: "management"
  - `roles`: ["management", "artist"]
  - `email`: "demo@moodita.app"
- El `loading` se pondra en false inmediatamente si no hay sesion

**2. `src/pages/Dashboard.tsx`** - Limpiar mock redundante

- Eliminar el mock local de `displayProfile` ya que el hook ahora devuelve el perfil demo
- Usar directamente `profile` que siempre tendra valor

**3. `src/components/AppSidebar.tsx`** - Sidebar siempre con datos

- El footer del sidebar ya usa `profile?.full_name` y `profile?.active_role` - con el cambio en el hook, estos campos se llenaran automaticamente con "MOODITA Management" y "management"
- Cambiar el boton "Cerrar Sesion" para que no aparezca en modo demo (cuando no hay `user`)

### Resultado

- El sidebar mostrara "MOODITA Management" con rol "management"
- El dashboard dira "Bienvenido, MOODITA Management (Management)"
- Todas las secciones de management seran visibles en la navegacion
- No aparecera el boton de cerrar sesion en modo demo

