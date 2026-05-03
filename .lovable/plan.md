## Problem

Hoy "Invitar Artista" desde el perfil de artista (`InviteArtistDialog`) no funciona en la práctica:

1. Llama a `supabase.auth.signUp()` desde el cliente con una contraseña aleatoria. Esto **cierra la sesión del usuario actual** (manager) y lo loguea como el artista invitado — efecto secundario no deseado.
2. No usa la edge function `invite-team-member`, así que se salta toda la validación de permisos, throttling y la tabla `invitations` para usuarios que aún no existen.
3. Crea el binding con rol fijo `ARTIST_MANAGER`, lo cual **contradice la regla** que acabamos de establecer (`contacts.role` → `artist_role_bindings.role`). Un artista no debería ser "Manager" de sí mismo.
4. Hace `update profiles.roles = ['artist']` directamente sobre un perfil que puede pertenecer a otro workspace.

Además, no existe un rol funcional "Artista" en el catálogo (`src/lib/permissions/catalog.ts` tiene 28 roles, ninguno es el propio artista accediendo a su portal).

## Decisión de diseño

**Unificar:** la invitación al artista pasa a ser un caso particular de "Invitar Miembro al Equipo", con:
- Scope fijo = `ARTIST` (el artista que se está editando).
- Rol funcional fijo = nuevo rol **"Artista"** (el artista de su propio portal).
- Categoría de equipo fija = `artistico`.
- UI simplificada (sólo email + nombre + toggles de acceso), sin pedir scope/rol/categoría.

Mantener un diálogo dedicado mejora la UX (el manager no debe entender la jerarquía técnica), pero **por debajo** llama a la misma edge function `invite-team-member` y respeta la misma cadena de permisos.

## Plan

### 1. Nuevo rol funcional "Artista"

`src/lib/permissions/catalog.ts`:
- Añadir `'Artista'` a `INDUSTRY_DEFAULTS` con permisos por defecto orientados a portal de artista:
  ```
  bookings: 'view', budgets: 'view', cashflow: 'view', contracts: 'view',
  releases: 'view', projects: 'view', drive: 'view', roadmaps: 'view',
  solicitudes: 'edit', analytics: 'view', contacts: 'view', automations: 'none'
  ```
- Añadir entrada en `ROLE_DESCRIPTIONS`.

`src/lib/permissions/roleMapping.ts`:
- Añadir `'artista' → 'ARTIST_OBSERVER'` (binding role: el artista observa su propia ficha; los toggles de acceso por módulo se manejan vía overrides).

### 2. Edge function `invite-team-member`

`supabase/functions/invite-team-member/index.ts`:
- Aceptar el rol literal `'Artista'` cuando `scope === 'ARTIST'` (hoy el `ArtistRoleSchema` sólo admite enums DB; cambiamos a aceptar string libre y mapear internamente con `mapFunctionalRoleToBindingRole`).
- Tras crear el binding con éxito (scope ARTIST, rol Artista), **vincular `artists.profile_id`** al perfil invitado (lo que hoy hace `InviteArtistDialog` manualmente).
- Si el invitado no existe aún, crear fila en `invitations` con metadatos `{ scope: 'ARTIST', scope_id, role: 'Artista' }` para que al registrarse se complete el binding (esto requiere un pequeño hook en el flujo de signup; reusar la lógica existente para invitations de workspace).

### 3. Reescribir `InviteArtistDialog`

`src/components/InviteArtistDialog.tsx`:
- Eliminar `supabase.auth.signUp()` y la actualización directa de `profiles`.
- Llamar a `supabase.functions.invoke('invite-team-member', { body: { email, scope: 'ARTIST', scopeId: artistId, role: 'Artista', teamCategory: 'artistico' } })`.
- Añadir sección **"Acceso al portal"** con checkboxes por módulo (releases, bookings, cashflow, drive, roadmaps, contracts, analytics) precargados desde `getIndustryDefaults('Artista')`.
- Al invitar con éxito, escribir esos toggles como filas en `functional_role_permission_overrides` para ese `user_id` (mismo mecanismo que `useFunctionalPermissions` ya consume).
- Mantener el banner explicativo y el estado "done".

### 4. Migración de datos

- No requiere cambios de schema: `'Artista'` se valida en el catálogo TS y vive como string en `contacts.role`.
- Las filas de `artist_role_bindings` para artistas ya invitados (si las hay con rol `ARTIST_MANAGER`) se quedan; los nuevos invitados usarán `ARTIST_OBSERVER`.

### 5. Memoria

Actualizar `mem://core/functional-role-binding-sync` para mencionar el rol `Artista` y que la invitación de artista usa la misma edge function unificada.

## Detalles técnicos clave

```text
ArtistProfile.tsx ─► InviteArtistDialog
                        │
                        │ functions.invoke('invite-team-member',
                        │   { scope: 'ARTIST', scopeId: artist.id,
                        │     role: 'Artista', teamCategory: 'artistico' })
                        ▼
                  invite-team-member (edge)
                        │
            ┌───────────┴───────────┐
       existe profile?         no existe
            │                       │
   insert artist_role_bindings   insert invitations
   (role = ARTIST_OBSERVER)      (token + metadata)
   update artists.profile_id
            │
            ▼
   InviteArtistDialog escribe overrides
   en functional_role_permission_overrides
   según los toggles seleccionados
```

## Archivos afectados

- `src/lib/permissions/catalog.ts` — añadir rol "Artista"
- `src/lib/permissions/roleMapping.ts` — mapeo Artista → ARTIST_OBSERVER
- `src/components/InviteArtistDialog.tsx` — reescritura completa
- `supabase/functions/invite-team-member/index.ts` — aceptar rol "Artista" + vincular `artists.profile_id`
- `mem://core/functional-role-binding-sync` — nota sobre rol Artista

## Pregunta para confirmar

¿Quieres que el manager pueda **personalizar los accesos por módulo** en el momento de invitar (toggles en el diálogo), o prefieres que se invite con un preset estándar y luego se ajuste desde "Gestionar acceso a artistas"? Mi recomendación es **toggles en el diálogo** (ya incluidos en el plan) porque es lo que pediste: "estaría bien poder escoger qué cosas puede hacer el artista y cuáles no".
