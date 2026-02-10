
# Agregar selector de Artista al dialogo "Nuevo Lanzamiento"

## Problema

El dialogo de creacion de lanzamiento no incluye un campo para vincular el release a un artista. El campo `artist_id` ya existe en el modelo y en la logica de creacion, pero no se expone en la interfaz.

## Solucion

Agregar un selector de artista (usando el componente `SingleArtistSelector` que ya existe) al formulario de creacion de lanzamiento.

## Cambio

| Archivo | Detalle |
|---|---|
| `src/components/releases/CreateReleaseDialog.tsx` | 1. Importar `SingleArtistSelector`. 2. Agregar estado `selectedArtistId` inicializado con el prop `artistId`. 3. Insertar el selector entre el campo "Tipo" y "Fecha de Lanzamiento" con label "Artista". 4. Usar `selectedArtistId` en lugar de `artistId` al enviar el formulario. |

El componente `SingleArtistSelector` ya maneja la carga de artistas, busqueda y la opcion "Ningun artista", por lo que no se necesita logica adicional.
