
# Solucionar desplegables que no responden en CreateReleaseBudgetDialog

## Causa raíz

El problema tiene dos capas:

**1. Conflicto Radix Popover dentro de Radix Dialog:**
Cuando un `Popover` de Radix UI se abre dentro de un `Dialog` de Radix UI, el sistema de gestión de foco y `pointer-events` del Dialog puede bloquear los eventos de clic en el trigger del Popover secundario. Radix Dialog captura el foco y puede marcar como `pointer-events: none` elementos que no son el modal activo.

La solución oficial de Radix es añadir `modal={false}` al `<Popover>` anidado dentro del Dialog. Esto le indica al Popover que no intente capturar el foco ni gestionar el stack de modales de forma independiente.

**2. Contenedor `overflow-hidden` bloqueando clics:**
El `DialogContent` tiene `overflow-hidden` y dentro hay un `div` con `overflow-y-auto`. Esta combinación crea un contexto de apilamiento que puede interferir con la detección de eventos de clic en triggers de popovers que están justo en el borde del área visible.

## Cambios a realizar

### `src/components/releases/ReleaseBudgetContactField.tsx`
- Añadir `modal={false}` al componente `<Popover>` principal
- Añadir `avoidCollisions={false}` al `PopoverContent` para evitar repositionamiento inesperado dentro del dialog
- Añadir `style={{ pointerEvents: 'auto' }}` al `PopoverContent`

### `src/components/releases/CreateReleaseBudgetDialog.tsx`
- Añadir `modal={false}` a los dos `<Popover>` internos (Territorios y Servicios)
- Añadir `avoidCollisions={false}` a sus `PopoverContent`
- Añadir `pointer-events-auto` como clase CSS en el `PopoverContent` del DatePicker
- Eliminar `overflow-hidden` del `DialogContent` — ya que el scroll interno con `overflow-y-auto` es suficiente, y `overflow-hidden` en el container externo puede crear un stacking context que bloquee los portales anidados

### Resultado esperado

Los tres popovers (Sello, Distribución, Owner interno), el selector de Territorios, el selector de Servicios y los Date Pickers deberán responder correctamente a los clics, abrirse hacia abajo y mantener el scroll del formulario funcional.

## Detalle técnico

```text
Antes: <Popover>  → bloquea pointer-events dentro de Dialog
Después: <Popover modal={false}>  → permite interacción sin conflicto de foco

Antes: <DialogContent className="... overflow-hidden">
Después: <DialogContent className="... ">  (sin overflow-hidden, el scroll lo gestiona el div interno)

Antes: <PopoverContent className="...">
Después: <PopoverContent modal={false} avoidCollisions={false} className="... pointer-events-auto">
```

No se modifica la lógica de negocio ni la base de datos. Solo correcciones de comportamiento de UI.
