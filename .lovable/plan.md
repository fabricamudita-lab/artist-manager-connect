

# Agregar equipos (artistas) al dropdown de "Equipos" en Contactos

## Problema

El desplegable "Equipos" en la pagina de Contactos solo muestra los contact_groups (grupos manuales), pero no los equipos/artistas reales que si aparecen en la pagina de Equipos (ej: "Rita Payes", "VIC").

## Solucion

Cargar los artistas desde la tabla `artists` y mostrarlos en el dropdown junto a los grupos existentes, con la misma estructura visual que en Teams (avatar + nombre + conteo). Filtrar los contactos por su asignacion al artista via `contact_artist_assignments`.

## Cambios

| Archivo | Detalle |
|---|---|
| `src/pages/Agenda.tsx` | 1. Agregar estado `artists` y funcion `fetchArtists` que cargue desde la tabla `artists`. 2. Modificar el dropdown de "Equipos" para mostrar: "Todos los equipos", luego los artistas (con avatar y conteo de contactos asignados), separador, y luego los grupos existentes (contact_groups). 3. Actualizar la logica de filtrado: si el valor seleccionado corresponde a un artista (prefijo `artist-`), filtrar via `contact_artist_assignments`; si corresponde a un grupo, mantener el filtrado actual via `contact_group_members`. |

## Detalle del dropdown

```text
[Todos los equipos]
---
Rita Payes (8)
VIC (6)
---
Grupo manual 1
Grupo manual 2
```

## Detalle tecnico

- Se usara un prefijo `artist-` en el valor del SelectItem para distinguir artistas de grupos (ej: `artist-uuid` vs `group-uuid`).
- Al seleccionar un artista, se consultara `contact_artist_assignments` para obtener los contact_id asignados y filtrar.
- Al seleccionar un grupo, se mantiene la logica actual con `contact_group_members`.
- Se contara la cantidad de contactos asignados a cada artista para mostrar el numero entre parentesis.

