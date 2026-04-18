

## Plan: Reordenar el botón "Más filtros" al final del Select de ordenación

### Cambio
En `src/components/releases/ReleasesFiltersToolbar.tsx`, mover el bloque del `<Popover>` "Más filtros" para que aparezca **después** del Select "Ordenar por" (actualmente está antes). Así el orden visual queda:

`Buscar · Estado · Tipo · Artista · Ordenar por · Más filtros · Limpiar`

### Archivo
| Archivo | Cambio |
|---|---|
| `src/components/releases/ReleasesFiltersToolbar.tsx` | Reordenar: el Popover "Más filtros" pasa a renderizarse tras el Select de `sortBy` |

Sin cambios de lógica ni de estado.

