## Plan: contar perfiles únicos en el badge de Créditos

### Problema
En la lista de tracks de "Créditos y Autoría" el contador junto al icono de personas muestra el número total de filas de créditos. Como ahora un mismo perfil puede tener varios roles, ese número infla el conteo. En el ejemplo aparece "6" cuando en realidad hay 5 personas (una con dos roles).

### Solución
Cambiar el contador para que muestre el número de personas únicas (deduplicadas por nombre, ignorando mayúsculas/minúsculas y espacios), no el número de filas.

### Cambio
| Archivo | Cambio |
|---|---|
| `src/pages/release-sections/ReleaseCreditos.tsx` (badge en la cabecera del track, ~líneas 1016-1021) | Reemplazar `{credits.length}` por el tamaño de un `Set` con los nombres normalizados. |

### Resultado esperado
- El badge muestra "5" en lugar de "6" cuando hay 5 personas y una de ellas tiene dos roles.
- No cambia ninguna otra parte de la UI ni la base de datos.