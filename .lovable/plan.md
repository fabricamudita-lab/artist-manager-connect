
## Plan: Quitar definitivamente "Dev Tools" de páginas externas

### Problema real
Ahora mismo `DevRoleSwitcher` sigue apareciendo porque está montado **globalmente** en `src/App.tsx`, fuera del árbol de rutas principal. Aunque dentro del componente haya lógica de hostname/pathname, sigue existiendo como UI flotante a nivel app y esa estrategia es frágil para enlaces públicos/externos.

### Solución
En lugar de “intentar ocultarlo” desde dentro del componente, hay que **dejar de renderizarlo en páginas públicas** desde la arquitectura de rutas.

### Cambios
1. **Quitar `<DevRoleSwitcher />` de `src/App.tsx`**
   - Ahora está renderizado de forma global.
   - Se eliminará de ahí para que no exista en rutas públicas, auth, reset, links compartidos, etc.

2. **Renderizar `DevRoleSwitcher` solo dentro del shell privado**
   - Añadirlo en `src/components/DashboardLayout.tsx`, que es el layout usado por las pantallas internas autenticadas.
   - Así solo aparecerá dentro del área privada de trabajo, nunca en enlaces públicos compartidos.

3. **Mantener una segunda capa de seguridad en `DevRoleSwitcher.tsx`**
   - Aunque ya no se renderice en páginas externas, dejar guardas defensivas:
     - ocultar en dominio publicado `artist-manager-connect.lovable.app`
     - mostrar solo en `localhost`, `127.0.0.1` o previews `id-preview--*`
     - no mostrar en rutas públicas conocidas (`/shared/`, `/epk/`, `/sign/`, `/contract-draft/`, `/sync-request/`, `/artist-form/`, `/release-form/`, `/contact-form/`, `/reset-password`, `/auth`)
   - Si se vuelve a montar accidentalmente fuera del layout, seguirá sin exponerse.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Eliminar el render global de `<DevRoleSwitcher />` |
| `src/components/DashboardLayout.tsx` | Añadir `<DevRoleSwitcher />` dentro del layout privado |
| `src/components/DevRoleSwitcher.tsx` | Endurecer guardas finales de visibilidad para preview/local únicamente y exclusión explícita de rutas públicas |

### Resultado esperado
- No se verá en:
  - enlaces copiados públicos
  - `/shared/...`
  - `/epk/...`
  - `/sign/...`
  - `/contract-draft/...`
  - formularios públicos
  - `/auth`
  - `/reset-password`
  - dominio publicado
- Sí podrá verse solo en entorno de desarrollo/preview **dentro del panel privado autenticado**.

### Nota técnica
Este enfoque es más seguro que depender solo de `pathname`/`hostname`, porque evita que el componente exista en el árbol de páginas externas. Es una corrección estructural, no solo visual.
