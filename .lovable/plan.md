

## Plan: arreglar registro de nuevos usuarios

### Diagnóstico
Los logs de auth muestran: `column "role" of relation "profiles" does not exist`. El trigger `handle_new_user` (que se ejecuta automáticamente al crear un usuario en `auth.users`) intenta insertar en una columna `role` (singular) que ya no existe en la tabla `profiles`. La tabla actual usa:
- `roles` → array de `user_role` (default `{artist}`)
- `active_role` → `user_role` (default `'artist'`)

Por eso cualquier registro nuevo falla con "Database error saving new user".

### Solución
Actualizar la función `public.handle_new_user()` para que inserte en las columnas correctas (`roles` como array y `active_role`), respetando el rol enviado en `raw_user_meta_data.role` (artist / management) desde el formulario de registro.

### Cambio
| Archivo | Cambio |
|---|---|
| Migración SQL | `CREATE OR REPLACE FUNCTION public.handle_new_user()` que inserte en `profiles(user_id, email, full_name, roles, active_role)` usando el valor del metadata como rol activo y como único elemento del array `roles`. Se mantiene `SECURITY DEFINER` y `search_path` seguro. |

### Resultado esperado
- El registro de nuevos usuarios (Artista o Management) funciona correctamente desde `/auth`.
- Se crea automáticamente el perfil con el rol elegido.
- Sin cambios en la tabla `profiles` ni en otras políticas.

