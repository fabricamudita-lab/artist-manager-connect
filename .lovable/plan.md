

# Plan: Arreglar el scroll del panel lateral de perfil de contacto

## Problema Identificado

El panel lateral (`ContactProfileSheet`) no permite hacer scroll para ver toda la información del perfil. En la captura del usuario se ve que el contenido se corta después de "Teléfono" y no hay forma de ver el resto de la información (información adicional, bancaria, notas, etc.).

## Causa Raiz

El componente `ScrollArea` de Radix UI requiere una **altura explícita** para funcionar correctamente. Actualmente:
- `SheetContent` tiene `flex flex-col h-full max-h-screen`
- `ScrollArea` tiene `flex-1` pero NO tiene altura explícita

El `flex-1` por sí solo no es suficiente porque el `ScrollArea` de Radix necesita que su contenedor tenga una altura fija o calculable para activar el overflow interno.

## Solución

Añadir estilos que fuercen el scroll correctamente:

| Cambio | Descripción |
|--------|-------------|
| Añadir `min-h-0` al ScrollArea | Permite que flex-1 calcule la altura correctamente |
| Añadir `h-full` al contenedor del ScrollArea | Fuerza el contenedor a respetar la altura del padre |
| Usar un div wrapper con overflow | Como alternativa más robusta |

## Cambio en `ContactProfileSheet.tsx`

```tsx
// ANTES (línea 230):
<ScrollArea className="flex-1 px-6 overflow-y-auto">

// DESPUÉS:
<div className="flex-1 min-h-0 overflow-hidden">
  <ScrollArea className="h-full px-6">
```

El truco clave es:
1. **`min-h-0`**: En flexbox, los hijos tienen `min-height: auto` por defecto, lo que impide que se reduzcan. Con `min-h-0` permitimos que el contenedor se reduzca y active el scroll.
2. **`overflow-hidden`** en el wrapper: Fuerza al contenido a no expandirse más allá.
3. **`h-full`** en ScrollArea: Le da una altura definida basada en el wrapper.

## Estructura Final

```text
┌─────────────────────────────────────┐
│ SheetContent (h-full max-h-screen)  │
│ ┌─────────────────────────────────┐ │
│ │ SheetHeader (shrink-0)          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ div (flex-1 min-h-0 overflow-   │ │
│ │      hidden)                    │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ ScrollArea (h-full)         │ │ │ <- SCROLL AQUI
│ │ │ ┌─────────────────────────┐ │ │ │
│ │ │ │ Contenido del perfil    │ │ │ │
│ │ │ │ (puede exceder altura)  │ │ │ │
│ │ │ └─────────────────────────┘ │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Footer (shrink-0)               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ContactProfileSheet.tsx` | Envolver ScrollArea en div con min-h-0 y ajustar clases |

