
# Fijar ancho del texto para estabilizar posición del switch

## Problema

El contenedor del segundo toggle (`ToggleRow`) crece y encoge según el texto que muestre:
- "Producción propia" → más ancho → switch desplazado a la izquierda
- "Derivado" → más estrecho → switch desplazado a la derecha

Esto hace que el switch "salte" de posición al cambiar de estado.

## Causa técnica

En `CreateReleaseBudgetDialog.tsx` (~línea 670), el `<span>` del texto no tiene un ancho fijo:

```tsx
<span className={cn(
  "text-xs font-medium whitespace-nowrap",
  contracted ? "text-primary" : "text-muted-foreground"
)}>
  {contracted ? "Producción propia" : "Derivado"}
</span>
```

Al cambiar el texto, el ancho del `<span>` y del contenedor padre cambia, lo que desplaza el switch.

## Solución

Fijar un ancho mínimo en el `<span>` equivalente al texto más largo ("Producción propia"). Con Tailwind, se puede usar `inline-block` + `w-[110px]` (o `min-w-[110px]`) para reservar siempre ese espacio:

```tsx
<span className={cn(
  "text-xs font-medium whitespace-nowrap inline-block w-[110px]",
  contracted ? "text-primary" : "text-muted-foreground"
)}>
  {contracted ? "Producción propia" : "Derivado"}
</span>
```

De esta manera el switch siempre está exactamente en la misma posición horizontal, porque el bloque de texto siempre ocupa el mismo ancho.

## Archivo a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**, línea 670-675 — añadir `inline-block w-[110px]` al `className` del `<span>`.

Cambio mínimo, una sola línea.
