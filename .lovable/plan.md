

## Desactivar autenticacion para acceso publico

El objetivo es permitir que cualquier visitante (incluido Claude.ai) pueda ver todas las paginas sin necesidad de registrarse o iniciar sesion.

### Cambios

**1. `src/components/ProtectedRoute.tsx`**

Modificar el componente para que siempre permita el acceso sin verificar autenticacion:
- Eliminar la redireccion a `/auth` cuando no hay usuario
- Eliminar la verificacion de permisos
- Renderizar directamente los `children` sin esperar carga de sesion
- Mantener el componente para no romper imports, pero que sea un passthrough

**2. `src/App.tsx`**

Modificar `PublicRoute` para que no redirija a `/dashboard` cuando hay usuario autenticado. Simplemente renderiza sus children siempre. Tambien cambiar la ruta raiz `/` para que vaya directamente al Dashboard en vez de a Auth.

**3. `src/pages/Dashboard.tsx`**

Agregar un perfil mock cuando no hay perfil cargado (usuario no autenticado), para que el dashboard se renderice correctamente con datos de ejemplo en vez de mostrar "No se pudo cargar el perfil".

**4. `src/hooks/useAuth.tsx`**

No se modifica. El hook seguira funcionando normalmente, simplemente el `profile` sera null para visitantes no autenticados, y el Dashboard manejara ese caso con el perfil mock.

### Resultado

- Todas las rutas seran accesibles sin login
- El dashboard mostrara un perfil de demo
- Los componentes que dependen de datos de Supabase mostraran estados vacios (sin datos) pero no bloquearan la navegacion
- Las rutas publicas (EPK, shared, etc.) seguiran funcionando igual

