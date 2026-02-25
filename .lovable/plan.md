

## Fix: Scroll con trackpad en dropdowns del dialog de creditos

El problema es conocido: los dialogos de Radix UI bloquean el scroll, lo que impide hacer scroll con trackpad/dedos en elementos scrollables renderizados dentro de Portals (como el `SelectContent` del selector de rol y el `CommandList` de busqueda de perfil).

### Solucion

Aplicar `onWheel={(e) => e.stopPropagation()}` en los contenedores con scroll para evitar que el dialog intercepte los eventos de trackpad.

### Cambios

**`src/components/credits/GroupedRoleSelect.tsx`**
- Agregar `onWheel={e => e.stopPropagation()}` al `ScrollArea` dentro del `SelectContent`

**`src/components/credits/AddCreditWithProfileForm.tsx`**
- Agregar `onWheel={e => e.stopPropagation()}` al `ScrollArea` que envuelve el `CommandList` en la busqueda de perfiles

Ambos son cambios de una sola linea que resuelven el problema sin efectos secundarios.

