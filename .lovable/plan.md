

## Fix: EPK no se puede guardar — RLS policy mismatch

### Problema
La política RLS de INSERT en `epks` exige `creado_por = auth.uid()`. Pero el código en `useEPK.ts` (línea 254) asigna `creado_por: profile.id`, que es el UUID de la tabla `profiles`, no el UUID de `auth.users`. Son valores distintos, por eso falla.

### Solución
Cambiar la línea 254 de `useEPK.ts`:

```typescript
// Antes
creado_por: profile.id,

// Después  
creado_por: user.id,
```

Esto usa `user.id` (de `supabase.auth.getUser()`), que coincide con `auth.uid()` en la política RLS.

Con este cambio, ya no se necesita ni siquiera la query a `profiles` para el INSERT (aunque puede mantenerse si se usa en otro sitio).

### Archivo afectado
- `src/hooks/useEPK.ts` — línea 254: cambiar `profile.id` por `user.id`

### Fix adicional (silencioso)
- Corregir el error de runtime `Select.Item` con valor vacío (buscar en el EPK builder o componentes relacionados un `<SelectItem value="">` y asignarle un valor no vacío).

