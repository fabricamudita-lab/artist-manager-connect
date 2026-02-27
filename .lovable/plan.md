

## Fix: El cronograma no se guarda al generarlo desde el wizard

### Problema

Cuando se genera un cronograma desde el wizard, las tareas se crean con IDs legibles como `audio-grabacion`, `mkt-single1`, etc. (definidos en `releaseTimelineTemplates.ts`). Sin embargo, la tabla `release_milestones` tiene una columna `id` de tipo `uuid`, por lo que la insercion falla silenciosamente al intentar guardar IDs que no son UUIDs validos.

El cronograma se muestra correctamente en pantalla (porque vive en el state local), pero nunca llega a persistir en la base de datos. Al salir y volver, la query devuelve 0 milestones y se muestra la pantalla vacia.

### Solucion

Modificar la funcion `saveMilestonesToDB` en `ReleaseCronograma.tsx` para que **no envie el campo `id`** al insertar milestones. Dejar que la base de datos genere UUIDs automaticamente con `gen_random_uuid()`.

Ademas, actualizar el state local con los IDs reales devueltos por la base de datos despues de la insercion, para que las ediciones posteriores (auto-save) funcionen correctamente.

### Cambios tecnicos

**Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`**

1. En `saveMilestonesToDB` (~linea 1286): eliminar `id: task.id` del objeto de insercion. Usar `.select()` para obtener los IDs generados.

2. Despues de la insercion exitosa, mapear los IDs devueltos por Supabase de vuelta a los workflows en el state, para que el auto-save posterior use UUIDs validos.

3. Invalidar la query de milestones despues de guardar para mantener la cache sincronizada.

### Detalle del cambio

```text
Antes (falla):
  insert({ id: 'audio-grabacion', release_id: ..., title: ..., ... })
  -- ERROR: "audio-grabacion" no es un UUID valido

Despues (funciona):
  insert({ release_id: ..., title: ..., ... }).select()
  -- La DB genera el UUID automaticamente
  -- Se actualiza el state con los nuevos IDs
```

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/release-sections/ReleaseCronograma.tsx` | Eliminar `id: task.id` de la insercion, usar `.select()` para obtener IDs generados, actualizar state con IDs reales |

