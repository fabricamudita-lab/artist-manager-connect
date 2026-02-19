
# Arreglar scroll de trackpad en "Servicios contratados"

## Diagnóstico

El dropdown de "Servicios contratados" es un `<Popover>` con `<Command>` + `<CommandList>` dentro de un `<Dialog>` de Radix UI.

El problema tiene dos capas:

1. **Radix Dialog activa scroll-lock** en el body cuando está abierto, interceptando eventos `wheel` globales.
2. **El `PopoverContent` se renderiza via Portal** (fuera del árbol DOM del Dialog), por lo que los eventos `wheel` que llegan al `CommandList` se propagan hasta el overlay del Dialog, que los bloquea antes de que el `CommandList` pueda usarlos para hacer scroll.

El scroll de la barra lateral funciona porque usa eventos de puntero (`pointer`), no `wheel`. El trackpad en macOS genera eventos `wheel` (nativo del sistema), que son los que se bloquean.

## Solución

Añadir un handler `onWheel` en el `CommandList` que llame a `e.stopPropagation()`, impidiendo que el evento suba al overlay del Dialog y sea cancelado:

```tsx
<CommandList
  className="max-h-[250px]"
  onWheel={(e) => e.stopPropagation()}
>
```

Esto es suficiente porque:
- El `CommandList` ya tiene `overflow-y-auto` (definido en `command.tsx`)
- El scroll nativo del elemento funciona correctamente cuando el evento no se propaga
- `stopPropagation()` no cancela el scroll — solo evita que el evento suba al Dialog

## Archivo a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`** — línea 822 donde está el `<CommandList>`:

```tsx
// Antes:
<CommandList className="max-h-[250px]">

// Después:
<CommandList className="max-h-[250px]" onWheel={(e) => e.stopPropagation()}>
```

Un cambio de una línea. Sin tocar `dialog.tsx`, `command.tsx` ni ningún otro componente.
