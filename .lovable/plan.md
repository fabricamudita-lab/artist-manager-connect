

# Añadir opcion "Añadir todos" al menu de bloques

## Cambio

En el dropdown "Añadir Bloque" de `src/pages/RoadmapDetail.tsx`, agregar una opcion al inicio del menu que diga **"Añadir todos"** separada del resto por un divisor. Al hacer clic, se añaden todos los bloques faltantes de una vez.

## Detalle tecnico

En `src/pages/RoadmapDetail.tsx`, dentro del `DropdownMenuContent` del menu "Añadir Bloque" (aprox. linea 290-300):

- Agregar un `DropdownMenuItem` con texto "Añadir todos" que recorra `availableBlockTypes` y llame a `addBlock.mutate(type)` para cada uno
- Agregar un `DropdownMenuSeparator` debajo para separarlo visualmente de las opciones individuales
- Solo se mostrara cuando haya mas de 1 bloque disponible (si solo queda uno, no tiene sentido "añadir todos")

