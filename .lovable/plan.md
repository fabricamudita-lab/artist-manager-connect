He confirmado el problema: el acceso por artista sí cambia correctamente, pero el permiso funcional de Road Manager no está cerrando Releases de forma efectiva en todos los puntos.

Hallazgos clave:
- `Perfil Test` es `MEMBER`, tiene rol funcional `Road Manager` y `releases = none`.
- La función SQL `has_functional_permission(..., 'releases', 'view')` devuelve `false` para ese usuario, así que la matriz funcional está bien.
- El fallo viene de dos capas:
  1. En UI, `HubGate` deja renderizar contenido mientras los permisos cargan. Esto puede permitir ver datos o entrar en rutas antes de que el bloqueo se aplique.
  2. En base de datos hay políticas RLS permisivas antiguas que siguen abiertas, por ejemplo `releases_select_strict` permite ver releases si el usuario tiene acceso al artista, aunque `releases = none`. Además, tablas relacionadas como `release_artists`, `release_assets`, `release_budgets`, `release_milestones`, `tracks` y `track_credits` tienen políticas tipo `auth.role() = authenticated` o `true`, que saltan el permiso funcional.

Plan de corrección:

1. Corregir el bloqueo visual de módulos
- Cambiar `HubGate` para que mientras carga no muestre el contenido protegido, sino un estado de carga/skeleton.
- Cambiar `IfCan` y `PermissionGuard` para que durante carga no muestren acciones protegidas como botones de editar/crear.
- Resultado: sin “flash” de contenido no autorizado.

2. Proteger todas las rutas de Releases
- Añadir `HubGate module="releases" required="view"` a las subrutas que ahora no lo tienen:
  - `/releases/:id/cronograma`
  - `/releases/:id/presupuestos`
  - `/releases/:id/imagen-video`
  - `/releases/:id/creditos`
  - `/releases/:id/audio`
  - `/releases/:id/epf`
  - `/releases/:id/pitch`
  - `/releases/:id/contratos`
- Mantener el guard existente en `/releases` y `/releases/:id`.

3. Endurecer RLS en base de datos con una nueva migración
- Crear una migración que elimine o reemplace las políticas permisivas conflictivas.
- Para `releases`, dejar el SELECT autenticado condicionado por:
  - acceso al artista (`user_can_see_artist`) y
  - permiso funcional `releases:view`.
- Para INSERT/UPDATE/DELETE, exigir `releases:edit/manage` además del acceso de artista correspondiente.
- Para `release_artists`, `tracks`, `track_credits`, `release_assets`, `release_milestones` y `release_budgets`, restringir lectura/escritura usando el release padre y el permiso funcional de Releases.
- Mantener las políticas públicas necesarias para enlaces compartidos (`share_token`, `pitch_token`) sin afectar usuarios autenticados normales.
- Con esto, aunque alguien acceda por URL directa o modifique el frontend, Supabase no devolverá los datos.

4. Añadir helpers SQL seguros para no duplicar lógica
- Crear funciones `can_view_release`, `can_edit_release` y `can_manage_release` con `SECURITY DEFINER`, usando `auth.uid()` y el `workspace_id` del artista.
- Soportar releases con `artist_id` y también releases multi-artista vía `release_artists`.
- Deny-by-default para releases sin artista salvo reglas específicas de creador si hace falta.

5. Invalidación y actualización en tiempo real de permisos
- Ampliar `useFunctionalPermissions` para invalidar caché también cuando cambie `artist_role_bindings` y cuando cambie el contacto espejo del usuario actual.
- Así, al cambiar el rol funcional o el acceso a artistas desde Teams, una ventana ya abierta se actualiza sin mantener permisos viejos durante 60 segundos.

6. Ajustar queries de Releases para ser coherentes con la seguridad
- En `useReleasesWithSearch` y `useRelease`, mantener las queries limpias, pero depender de RLS como autoridad final.
- Añadir manejo de errores 403/RLS para mostrar “Sin acceso” en lugar de “no encontrado” cuando corresponda.
- Evitar que búsquedas relacionadas consulten tablas si no hay releases visibles.

7. Corregir el error runtime detectado en PDF
- Cambiar `src/utils/exportCronogramaPDF.ts` para usar `import autoTable from 'jspdf-autotable'` y `autoTable(doc, ...)`, igual que ya se hace en otros componentes.
- Esto corrige `doc.autoTable is not a function` sin cambiar el diseño del PDF.

Validación esperada después de implementar:
- Con `Perfil Test` como Road Manager:
  - no aparece Releases en sidebar,
  - `/releases` muestra acceso denegado,
  - `/releases/:id` y cualquier subruta de release muestran acceso denegado,
  - las queries directas a `releases` y tablas relacionadas no devuelven datos,
  - si se cambia a un rol con `releases:view`, vuelve a ver solo los artistas asignados.
- El acceso por “Gestionar acceso a artistas” seguirá filtrando correctamente por artista, pero ya no podrá ampliar módulos que el rol funcional tiene en `none`.