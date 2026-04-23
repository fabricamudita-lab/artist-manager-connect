
## Plan: quitar definitivamente Dev Tools del enlace público compartido

### Diagnóstico
El problema ya no parece estar en la estructura del código, sino en el entorno publicado:

- `DevRoleSwitcher` solo existe en `src/components/DashboardLayout.tsx`.
- La ruta pública `"/shared/release/:token"` en `src/App.tsx` renderiza `SharedRelease` directamente, sin `DashboardLayout`.
- Además, `src/components/DevRoleSwitcher.tsx` ya tiene guardas por hostname y por rutas públicas.

Con esa estructura, `Dev Tools` no debería salir en `https://artist-manager-connect.lovable.app/shared/...`. Si sigue apareciendo ahí, lo más probable es que el dominio publicado esté sirviendo un build anterior.

### Qué haré
1. **Endurecer aún más la visibilidad de `DevRoleSwitcher`**
   - En `src/components/DevRoleSwitcher.tsx`, cambiar la lógica para que el botón se muestre solo en:
     - `localhost`
     - `127.0.0.1`
     - hosts internos de preview/editor tipo `*.lovableproject.com`
   - Ocultarlo por defecto en cualquier `*.lovable.app`, incluido:
     - `artist-manager-connect.lovable.app`
     - previews compartibles tipo `id-preview--*.lovable.app`

2. **Mantener la lista negra de rutas públicas**
   - Seguir ocultándolo en:
     - `/shared/`
     - `/epk/`
     - `/contract-draft/`
     - `/sign/`
     - `/sync-request/`
     - `/artist-form/`
     - `/release-form/`
     - `/contact-form/`
     - `/reset-password`
     - `/auth`

3. **No tocar `App.tsx` ni `DashboardLayout.tsx` salvo que al revisar haya divergencias**
   - La arquitectura actual ya es correcta: rutas públicas fuera del layout privado.
   - El ajuste real será de endurecimiento final en `DevRoleSwitcher.tsx`.

4. **Publicar/redeployar de nuevo el sitio**
   - Este paso es clave: aunque el código ya esté bien encaminado, el dominio publicado necesita recibir el build actualizado.
   - Sin redeploy, `artist-manager-connect.lovable.app` puede seguir mostrando el bundle antiguo.

5. **Verificación final en el enlace exacto**
   - Comprobar específicamente:
     - `https://artist-manager-connect.lovable.app/shared/release/b00af56f-b0d1-414d-94a8-ab692a9f846c`
   - Resultado esperado:
     - no aparece `Dev Tools`
     - la página pública sigue funcionando normal

### Archivo principal
| Archivo | Cambio |
|---|---|
| `src/components/DevRoleSwitcher.tsx` | Cambiar allowlist de hostnames para permitir solo entorno local/editor y bloquear cualquier `.lovable.app`, además de mantener exclusión de rutas públicas |

### Nota técnica
Hay dos elementos distintos en la esquina inferior derecha:
- **Dev Tools**: componente de tu app
- **Edit with Lovable**: badge inyectado por la plataforma publicada

Este plan elimina el primero del enlace público. Si también quieres ocultar el badge de Lovable en producción, eso se trata aparte como ajuste de publicación, no de código.
