# Menú lateral idéntico para colaboradores con bloqueos visibles

## Diagnóstico del estado actual

Hoy el sidebar (`src/components/AppSidebar.tsx`) hace dos cosas que rompen el objetivo:

1. **Oculta** los grupos `managementOnly` (Operaciones, Administración) si el usuario no es OWNER/TEAM_MANAGER.
2. **Oculta** cada item individual si `useCan().can(module, 'view')` es `false` (ver `isItemAllowed` + `.filter(it => isItemAllowed(it.url))` en `renderGroup`).

Por eso un colaborador con permisos limitados ve un menú "recortado" en vez del menú completo. El bloqueo del contenido ya funciona bien — `HubGate` + `ForbiddenView` (en `src/components/permissions/`) muestran una pantalla con candado y mensaje de "Pide al responsable de tu workspace que ajuste tus permisos" cuando se entra a un módulo sin permiso.

El menú "simplificado de artista" (líneas 78-115) se mantiene solo para usuarios con `linkedArtistId` (artistas vinculados al roster), no para colaboradores del equipo. Eso ya está bien.

## Cambio a realizar

Reemplazar la lógica de "ocultar" por "mostrar bloqueado" para colaboradores que pertenecen al workspace.

### 1. `src/components/AppSidebar.tsx` — Mostrar todos los items, marcando los bloqueados

- Eliminar el filtro `isItemAllowed` del array `allItems` en `renderGroup`. En su lugar, calcular para cada item un flag `locked` y pasarlo a `renderNavItem`.
- Quitar el filtro final `groups.filter(g => !g.managementOnly || isManagement)` para colaboradores del workspace: los grupos `Operaciones` y `Administración` deben verse igual. (Se conserva la rama de "menú de artista" para artistas vinculados, que es un caso distinto.)
- En `renderNavItem`, cuando `locked === true`:
  - Renderizar como `<button>` (no `NavLink`) con estilo atenuado (`opacity-60`), icono de candado pequeño superpuesto, y al hacer click navegar a la ruta normal — **`HubGate` ya muestra `ForbiddenView` con el mensaje de "pedir permiso al responsable"**, así que la experiencia es exactamente la deseada sin duplicar lógica.
  - Tooltip en modo collapsed dirá `{title} · Sin acceso`.
- El cálculo de `locked` usa el mismo `useCan().can(module, 'view')` actual, pero solo para items con módulo mapeado en `URL_TO_MODULE`. Sin entrada en el mapa → nunca bloqueado (Dashboard, Chat, Mi Perfil, Ajustes…).

### 2. Cobertura de módulos en `URL_TO_MODULE`

Revisar que todas las rutas de los grupos `Operaciones` y `Administración` estén mapeadas. Hoy faltan algunas (`/sincronizaciones`, `/teams`, `/correo`, `/epks`, `/calendar`). Si algún módulo funcional no existe en el catálogo, ese item se mostrará desbloqueado (comportamiento conservador, igual que hoy). No se inventan módulos nuevos.

### 3. Verificación visual rápida

- Como OWNER/TEAM_MANAGER: el sidebar es idéntico al actual (todos los items desbloqueados).
- Como colaborador con rol funcional limitado: ve el mismo menú que el OWNER, con candado en los items sin permiso. Click en uno bloqueado → carga la página y `HubGate` muestra `ForbiddenView` con el mensaje "Pide al responsable de tu workspace que ajuste tus permisos".
- Como artista vinculado (linkedArtistId): sigue viendo el menú simplificado de artista, sin cambios.

## Archivos a editar

- `src/components/AppSidebar.tsx` — único archivo a modificar.

## Lo que NO cambia

- `HubGate`, `ForbiddenView`, `useFunctionalPermissions`, RLS, ni el catálogo de módulos. La pantalla de "no tienes acceso" ya existe y se reutiliza tal cual.
- El menú de artistas vinculados (`!isManagement && linkedArtistId`) se mantiene porque responde a otra necesidad (vista enfocada del artista).
