
# Agregar "Mover a..." al DropdownMenu del CompactBookingCard

## Problema

El menu que aparece al hacer clic derecho en la tarjeta del Kanban es en realidad el **DropdownMenu** (menu del boton de tres puntos), no el **ContextMenu**. Esto ocurre porque los listeners de drag-and-drop (`useSortable`) interfieren con el evento de clic derecho, impidiendo que el ContextMenu de Radix capture el evento correctamente.

El ContextMenu ya tiene "Mover a..." pero nunca se muestra porque el DropdownMenu lo intercepta.

## Solucion

Agregar la opcion "Mover a..." con su submenu de fases al **DropdownMenu** (el menu del boton de tres puntos), entre "Ver detalles" y "Duplicar".

## Detalle tecnico

**Archivo**: `src/components/CompactBookingCard.tsx`

En el `DropdownMenuContent` (alrededor de la linea 148), agregar un `DropdownMenuSub` con las fases disponibles, justo despues del item "Ver detalles":

```
DropdownMenuItem: Ver detalles
DropdownMenuSeparator
DropdownMenuSub: Mover a...        <-- NUEVO
  DropdownMenuSubContent:
    - Fases filtradas (excluyendo la actual)
DropdownMenuSeparator
DropdownMenuItem: Duplicar
DropdownMenuItem: Generar PDF
DropdownMenuItem: Eliminar
```

Se importaran `DropdownMenuSub`, `DropdownMenuSubTrigger`, y `DropdownMenuSubContent` (ya disponibles en el componente de dropdown-menu).
