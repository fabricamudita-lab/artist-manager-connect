
## Problema

El formulario del dialogo no hace scroll porque el `ScrollArea` no tiene una altura fija o limitada. Aunque el `DialogContent` tiene `max-h-[90vh]` y `flex flex-col`, el componente `ScrollArea` personalizado envuelve todo en un `div` extra que rompe el layout flex, impidiendo que `flex-1` funcione correctamente.

## Solucion

Modificar la clase del `ScrollArea` en `CreateReleaseBudgetDialog.tsx` para darle una altura maxima explicita y asegurar que el contenido sea scrollable. Se cambiara de `flex-1` a `min-h-0 flex-1 overflow-hidden` y se asegurara que el contenido interno tenga padding inferior suficiente.

## Cambio tecnico

En `src/components/releases/CreateReleaseBudgetDialog.tsx`:

- Linea 509: Agregar `overflow-hidden` al `DialogContent` para que el flex container no crezca mas alla del viewport
- Linea 535: Cambiar la clase del `ScrollArea` de `flex-1 -mx-6 px-6` a `flex-1 min-h-0 -mx-6 px-6` para que el contenedor flex pueda contraerse y activar el scroll

Alternativa mas robusta: reemplazar `ScrollArea` por un `div` con `overflow-y-auto` y clases flex apropiadas, ya que el componente `ScrollArea` personalizado agrega un wrapper `div` que interfiere con el flex layout.
