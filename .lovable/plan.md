
# Unificar categorias entre Equipos y Contactos

## Problema actual

La pagina de Contactos (Agenda.tsx) tiene su propia lista de categorias hardcoded completamente diferente a la de Equipos:

| Contactos (actual) | Equipos (actual) |
|---|---|
| Artistas | Management |
| Tecnicos | Legal |
| Contables | Equipo Artistico |
| Prensa | Banda |
| Produccion | Equipo Tecnico |
| Disenadores | Comunicacion |
| General | Produccion, Tour Manager, Booking... |

Son dos sistemas independientes. Las categorias personalizadas se comparten via localStorage (`custom_team_categories`), pero las de sistema son distintas.

## Solucion

Reemplazar la lista `CATEGORIES` local de Agenda.tsx por `TEAM_CATEGORIES` de `teamCategories.ts`, que es la fuente unica de verdad. Los contactos existentes con categorias antiguas (artistas, tecnicos, contables, prensa, disenadores, general) se seguiran mostrando correctamente porque el filtro usa el valor almacenado en la base de datos.

## Cambios

| Archivo | Cambio |
|---|---|
| `src/pages/Agenda.tsx` | Eliminar la constante `CATEGORIES` local. Importar `TEAM_CATEGORIES` desde `teamCategories.ts`. Usar `TEAM_CATEGORIES` + `customCategories` en el selector de filtro de categorias y en `getCategoryInfo`. |
| `src/components/CreateContactDialog.tsx` | Importar `TEAM_CATEGORIES` y usarlas como opciones del selector de categoria (si no lo hace ya). Cambiar el default de `'general'` a `'otro'` para alinearse con el sistema unificado. |

## Detalle tecnico

1. En Agenda.tsx, el `Select` de categoria (linea 280-292) actualmente itera sobre `CATEGORIES`. Se cambiara a iterar sobre `[...TEAM_CATEGORIES, ...customCategories]` usando tambien el icono de cada categoria.

2. La funcion `getCategoryInfo` (linea 211) se reemplazara por las funciones ya existentes `getTeamCategoryLabel` y `getTeamCategoryIcon` de `teamCategories.ts`.

3. El valor default `'general'` en CreateContactDialog se cambiara a `'otro'` para coincidir con la ultima categoria del sistema unificado.

4. Los contactos existentes con categorias antiguas (artistas, contables, etc.) no se perderan - simplemente apareceran con su valor literal si no coinciden con ninguna categoria del sistema. Opcionalmente se puede agregar una nota al usuario sobre migrar datos existentes.
