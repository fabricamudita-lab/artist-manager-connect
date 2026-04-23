

## Plan: Ocultar "Dev Tools" en rutas públicas

### Problema
El botón **Dev Tools** (`DevRoleSwitcher`) aparece en el enlace público compartido (ej. `/shared/release/:token`) porque su lógica de visibilidad incluye cualquier hostname con `lovable` — y el dominio publicado `artist-manager-connect.lovable.app` cumple esa condición. Riesgo: cualquier visitante externo lo ve y puede intentar cambiar de usuario.

### Cambio
En `src/components/DevRoleSwitcher.tsx`, endurecer la condición `isVisible`:

1. **Excluir rutas públicas** siempre, sin importar el hostname. Si `window.location.pathname` empieza por alguno de estos prefijos, no renderizar nunca:
   - `/shared/`, `/epk/`, `/contract-draft/`, `/sign/`, `/sync-request/`, `/artist-form/`, `/release-form/`, `/contact-form/`, `/reset-password`
2. **Excluir el dominio publicado** (`artist-manager-connect.lovable.app`) — solo dejar visible en `localhost` y en el subdominio de preview de Lovable (`id-preview--*.lovable.app`), que es donde realmente se desarrolla/testea.
3. Reaccionar a cambios de ruta: usar `useLocation()` de `react-router-dom` en lugar de leer `window.location` solo en el mount, para que al navegar entre rutas privadas y públicas se oculte/muestre correctamente.

### Archivo
| Archivo | Cambio |
|---|---|
| `src/components/DevRoleSwitcher.tsx` | Reemplazar el `useEffect` de visibilidad por una comprobación combinada de hostname + pathname usando `useLocation`, ocultando el componente en todas las rutas públicas y en el dominio `artist-manager-connect.lovable.app` |

