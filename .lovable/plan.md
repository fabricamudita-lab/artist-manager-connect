

# Forzar clic en el dialogo de sincronizacion de hora

## Problema

El dialogo "Sincronizar hora del evento" se puede cerrar pulsando Enter, lo que puede llevar a una accion no deseada. El usuario quiere que sea obligatorio hacer clic en uno de los dos botones.

## Solucion

En `src/components/roadmap-blocks/ScheduleBlock.tsx` (lineas 559-581):

1. Agregar `onInteractOutside={(e) => e.preventDefault()}` al `DialogContent` para evitar que se cierre al hacer clic fuera.
2. Agregar `onEscapeKeyDown={(e) => e.preventDefault()}` para evitar que se cierre con Escape.
3. Ocultar el boton X de cierre con la clase CSS `[&>button:last-child]:hidden` en el `DialogContent`.
4. Cambiar `onOpenChange` para que no permita cerrar el dialogo externamente: `onOpenChange={() => {}}` (solo se cierra via los botones).

Esto obliga al usuario a elegir explicitamente una de las dos opciones.

