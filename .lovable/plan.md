
<final-text>
## Plan: Recuperar el acceso real a los datos y eliminar el “modo demo vacío”

### Diagnóstico
No parece que se haya borrado la base de datos.

He comprobado que en Supabase siguen existiendo datos reales:
- `artists`: 10
- `booking_offers`: 3
- `projects`: 5
- `contacts`: 66
- `releases`: 5
- `release_assets`: 6
- `release_milestones`: 75
- `track_credits`: 117
- `tour_roadmaps`: 4
- `storage_nodes`: 89

### Causa real
El problema es de autenticación/sesión, no de borrado:

1. `src/components/ProtectedRoute.tsx`
   - ahora deja pasar a cualquiera:
   ```ts
   // Auth bypass: allow all visitors to access every route
   return <>{children}</>;
   ```

2. `src/hooks/useAuth.tsx`
   - si no hay sesión, inyecta un perfil demo fake:
   ```ts
   profile: profile ?? (!loading && !user ? demoProfile : profile)
   ```

3. Los logs encajan con esto:
   - `refresh_token_not_found`
   - `INITIAL_SESSION undefined`

### Efecto de este bug
La app entra “sin login real”, pero sigue renderizando como si hubiese un usuario.
Entonces:
- algunas páginas hacen queries anónimas con RLS y reciben vacío
- otras usan `supabase.auth.getUser()` y salen antes de cargar nada
- otras usan el perfil demo `demo@moodita.app`, que no corresponde a tus datos reales

Por eso parece que “se ha borrado todo”, pero en realidad la app se ha quedado fuera de tu sesión y encima oculta ese fallo con un bypass demo.

### Cambios a implementar

#### 1. `src/hooks/useAuth.tsx`
- Eliminar el `demoProfile`
- No devolver nunca un perfil fake cuando no hay sesión
- Manejar sesión inválida/expirada de forma explícita
- Si `getSession()` devuelve vacío o el refresh token falla, dejar `user=null`, `profile=null`
- Mantener `loading` correcto hasta resolver el estado real

#### 2. `src/components/ProtectedRoute.tsx`
- Restaurar protección real de rutas
- Si `loading`, mostrar spinner
- Si no hay sesión, redirigir a `/auth`
- Conservar `location` para volver al sitio correcto tras login

#### 3. `src/App.tsx`
- Cambiar la raíz `/` para que:
  - si hay sesión -> `/dashboard`
  - si no hay sesión -> `/auth`
- Hacer que `/auth` redirija al dashboard si ya hay sesión activa

#### 4. UX de sesión expirada
- Añadir feedback claro cuando la sesión haya expirado
- Mostrar mensaje tipo:
  - “Tu sesión ha caducado, vuelve a iniciar sesión”
- Evitar que el usuario vea toda la app vacía sin explicación

#### 5. Verificación post-fix
Probar que vuelven a aparecer correctamente:
- artistas
- booking
- proyectos
- contactos
- lanzamientos
- fotos / DAM
- cronogramas
- créditos / splits
- hojas de ruta

## Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/hooks/useAuth.tsx` | quitar perfil demo y arreglar resolución de sesión real |
| `src/components/ProtectedRoute.tsx` | volver a proteger rutas con auth real |
| `src/App.tsx` | redirecciones correctas `/` y `/auth` según sesión |

## Resultado esperado
Al volver a exigir sesión real, la app dejará de mostrar el “modo demo vacío” y cargará otra vez tus datos auténticos de Supabase.

## Detalle técnico
Ahora mismo hay una mezcla peligrosa:
- frontend abierto al público
- RLS activa en base de datos
- perfil demo inyectado en cliente

Eso genera una falsa sensación de acceso, pero las tablas siguen protegidas y muchas consultas devuelven vacío. La corrección no es restaurar datos, sino restaurar el flujo de autenticación real.
</final-text>
