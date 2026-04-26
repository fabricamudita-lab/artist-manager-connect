He localizado la causa: `davidsolanscontact@gmail.com` está como `TEAM_MANAGER` del workspace `MOODITA Workspace`. Con la regla actual `OWNER/TEAM_MANAGER => puede ver todos los artistas del workspace`, RLS le está permitiendo ver los 11 artistas y por herencia sus bookings/proyectos/contactos/solicitudes. Además, `profiles` tiene una política crítica: “All authenticated users can view all profiles”, por eso puede ver todos los perfiles.

Plan de corrección propuesto:

1. Corregir el rol del usuario demo
   - Añadir un rol básico de workspace, por ejemplo `MEMBER`, que permite pertenecer al workspace sin heredar acceso global.
   - Cambiar `davidsolanscontact@gmail.com` de `TEAM_MANAGER` a `MEMBER`.
   - No crear bindings nuevos automáticamente: si ahora no tiene bindings explícitos, verá cero artistas/proyectos salvo los que se le asignen expresamente.

2. Endurecer el acceso a contactos
   - Modificar `user_can_see_contact` para eliminar la fuga “mismo workspace = ve contactos”.
   - Nueva regla: contacto visible solo si:
     - lo creó el usuario,
     - está vinculado a un artista que puede ver,
     - o el usuario es `OWNER/TEAM_MANAGER` del workspace del creador.
   - Esto evita que un miembro básico vea todos los contactos del workspace.

3. Cerrar `profiles`
   - Eliminar la política `All authenticated users can view all profiles`.
   - Reemplazarla por RLS estricta:
     - cada usuario ve su propio perfil completo,
     - `OWNER/TEAM_MANAGER` puede ver perfiles de miembros de su workspace,
     - usuarios con binding explícito solo acceden a lo necesario mediante las relaciones autorizadas.
   - Revisar consultas de UI que dependen de `profiles` para que no fallen si RLS devuelve menos filas.

4. Reforzar tablas con datos sin `artist_id`
   - Revisar políticas que actualmente permiten `artist_id IS NULL` en `booking_offers`, `budgets` y `releases`.
   - Cambiarlas para que los registros sin artista solo sean visibles/editables por `created_by = auth.uid()` o por un manager real del workspace si existe otra relación segura.

5. Verificación final
   - Comprobar con SQL que `davidsolanscontact@gmail.com` ya no aparece como `TEAM_MANAGER`.
   - Comprobar que `user_can_see_artist(david, *)` solo devuelve `true` para artistas con binding explícito.
   - Comprobar que ya no puede listar todos los proyectos, perfiles, contactos, solicitudes ni sincronizaciones desde la app.

Resultado esperado tras aplicar:

```text
davidsolanscontact@gmail.com
├─ Workspace: MEMBER, no TEAM_MANAGER
├─ Artistas visibles: solo artist_role_bindings explícitos
├─ Proyectos visibles: solo project_role_bindings explícitos o proyectos de artistas visibles
├─ Contactos visibles: propios o vinculados a artistas visibles
└─ Perfiles visibles: propio perfil; no todos los perfiles del workspace
```

Esto completa el cierre de autorización que todavía quedaba abierto por rol de workspace y por la política global de `profiles`.