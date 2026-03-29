

## Fix: "Equipo involucrado" no muestra datos

### Causa raíz

En `src/pages/ProjectDetail.tsx` línea 881, la query de presupuestos contiene:

```
profiles:artist_id(full_name)
```

El campo `artist_id` en `budgets` referencia la tabla `artists`, que tiene `name` y `stage_name` pero **no** `full_name`. Esto genera el error:

> `column artists_1.full_name does not exist`

Como las 5 queries están en un `Promise.all` y los errores se lanzan secuencialmente, el error del budget impide que se procese la respuesta del equipo → `team` queda vacío.

### Solución

**`src/pages/ProjectDetail.tsx` — línea 881**

Cambiar:
```
profiles:artist_id(full_name)
```
por:
```
artist:artist_id(name, stage_name)
```

Esto corrige la columna inexistente y usa un alias más preciso. El resto de la lógica que consume `budgets` deberá adaptarse para leer `artist?.stage_name || artist?.name` en vez de `profiles?.full_name`.

Un solo archivo, una línea corregida.

