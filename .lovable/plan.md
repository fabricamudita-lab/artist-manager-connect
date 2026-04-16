
## Problema real
Do I know what the issue is? Sí.

No es un problema de permisos del contacto ni de que la función no exista. `check-contact-references` sí se está invocando, pero falla en runtime antes de comprobar nada. Los logs muestran:

`TypeError: supabase.auth.getClaims is not a function`

La causa es que estas dos Edge Functions usan `@supabase/supabase-js@2.45.0`, y en este proyecto el patrón compatible es `auth.getUser(token)`, no `auth.getClaims(...)`. Por eso el botón de borrar cae en el `catch` de `EditContactDialog.tsx` y aparece el toast genérico “No se pudieron comprobar las referencias del contacto”.

Además, `delete-contact` tiene el mismo problema y fallará también en el segundo paso si no lo corregimos.

## Plan
1. **Corregir la autenticación en ambas Edge Functions**
   - `supabase/functions/check-contact-references/index.ts`
   - `supabase/functions/delete-contact/index.ts`
   - Sustituir `auth.getClaims(...)` por el mismo patrón que ya usa el proyecto en otras funciones: `auth.getUser(token)`.

2. **Mantener intacta la lógica actual de permisos**
   - Seguir usando el cliente con `Authorization` para respetar RLS al validar acceso al contacto.
   - Mantener el cliente admin solo para el conteo/borrado seguro de referencias, como ya está planteado.

3. **Alinear la solución con el resto del proyecto**
   - Reutilizar el patrón ya presente en funciones como `seed-contacts` e `import-csv-events`, para no introducir una variante nueva de auth ni romper el panel de usuario o la sesión actual.

4. **Endurecer un poco el feedback del front**
   - Revisar `src/components/EditContactDialog.tsx` para que el error de la función quede más claro en consola y no vuelva a parecer un fallo “misterioso”.
   - El comportamiento visual seguirá siendo el mismo: si hay referencias, se bloquea; si no las hay, pasa a la doble confirmación.

5. **Validación final**
   - Contacto sin referencias: debe abrirse el paso de escribir el nombre.
   - Contacto con referencias: debe abrirse el bloqueo con desglose.
   - Confirmación de borrado: `delete-contact` debe responder OK y cerrar/refrescar el diálogo.
   - Confirmar en logs que ya no aparece `getClaims is not a function`.

## Impacto
- Sin migraciones de base de datos
- Sin cambios en RLS
- Sin cambios en la lógica del panel lateral
- El fallo está aislado a estas dos Edge Functions y al manejo del error desde `EditContactDialog`
