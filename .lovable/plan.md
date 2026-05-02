# Fix: scroll con trackpad bloqueado en selector de rol funcional

## Problema

En el diálogo "Editar rol funcional" (`Teams.tsx`), al abrir el desplegable de roles funcionales (`FunctionalRoleCombobox`), no se puede hacer scroll con el trackpad por la lista de roles.

Causa: el `PopoverContent` se renderiza en un Portal dentro de un `Dialog` modal de Radix. Radix Dialog aplica un "scroll lock" global y, combinado con la heurística de `cmdk` (`CommandList`) que controla el wheel para navegación por teclado, el evento `wheel` del trackpad no llega a desplazar la lista. Esto ya nos ha pasado antes con Selects en touch (memoria del proyecto), pero aquí afecta también a trackpad por el conflicto Dialog ↔ Popover ↔ cmdk.

## Solución

Cambio mínimo y localizado en `src/pages/Teams.tsx`, en el componente `FunctionalRoleCombobox`:

1. Añadir `onWheel={(e) => e.stopPropagation()}` y `onTouchMove={(e) => e.stopPropagation()}` al `PopoverContent` para que el wheel no sea capturado por el scroll-lock del Dialog padre.
2. Añadir las mismas props (o equivalentes) al `CommandList` para que `cmdk` no consuma el wheel.
3. Asegurar `max-h-[260px] overflow-y-auto` explícito en `CommandList` (ya hereda `max-h-[300px]` del componente UI, lo dejamos como está salvo que necesitemos tunear).
4. Añadir `onOpenAutoFocus` no-op no es necesario; el foco actual ya está en el input de búsqueda.

No se modifica el componente compartido `src/components/ui/command.tsx` para no afectar otros usos.

## Archivos a modificar

- `src/pages/Teams.tsx` — `PopoverContent` y `CommandList` dentro de `FunctionalRoleCombobox` (líneas ~85–147).

## Verificación

- Abrir Teams → editar rol funcional de un miembro → el desplegable debe permitir scroll con trackpad y rueda del ratón hasta ver todos los roles (Mánager Personal, Business Manager, ..., A&R, Productor, etc.).
- Confirmar que la navegación con flechas del teclado en `cmdk` sigue funcionando.
- Confirmar que el resto de combobox/Selects de la app no se ven afectados (no se toca el componente UI compartido).
