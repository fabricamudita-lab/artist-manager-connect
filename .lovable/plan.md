

# Rastro visual ("ghost") de la posicion original al arrastrar barras del Gantt

## Resumen

Cuando el usuario arrastra una barra del Gantt, dejar visible un "fantasma" semitransparente (25% de opacidad) en la posicion original de la barra, mientras la barra real se mueve con el cursor. Esto permite al usuario comparar visualmente la posicion anterior con la nueva propuesta.

## Comportamiento

1. El usuario empieza a arrastrar una barra.
2. En la posicion original aparece un rectangulo gris con opacidad 0.25 (el "ghost").
3. La barra real se renderiza en la posicion del drag preview (como ya funciona).
4. Al soltar, el ghost permanece visible mientras el dialogo de confirmacion esta abierto.
5. Si el usuario confirma ("Sobreescribir"), el ghost desaparece y la barra queda en la nueva posicion.
6. Si el usuario cancela, el ghost desaparece y la barra vuelve a su posicion original.

## Cambio tecnico

| Archivo | Cambio |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | En el renderizado de cada barra, cuando `dragPreview` esta activo y coincide con el `taskId` actual: 1. Renderizar **dos** barras en lugar de una. 2. La primera barra (ghost) se posiciona con las coordenadas **originales** de la tarea, con `opacity: 0.25` y sin interactividad (`pointer-events: none`). 3. La segunda barra se posiciona con las coordenadas del `dragPreview` (comportamiento actual). Esto solo requiere un bloque condicional extra dentro del JSX de la barra, sin cambios de estado ni logica adicional. |

## Detalle visual

```text
Antes de arrastrar:
  [=========]

Durante arrastre:
  [=========]          [=========]  14 dic – 20 dic
   ^-- ghost 25%        ^-- barra real (posicion nueva)

Dialogo abierto:
  [=========]          [=========]  14 dic – 20 dic
   ^-- ghost sigue      ^-- preview se mantiene
       visible

Tras confirmar o cancelar:
  [=========]   (solo la barra final, ghost desaparece)
```

## Implementacion

Dentro del map de barras, la condicion sera aproximadamente:

```text
if (isDraggingThisTask) {
  // 1. Render ghost bar at ORIGINAL position (opacity 0.25, pointer-events none)
  // 2. Render real bar at PREVIEW position (existing logic)
} else {
  // Render bar normally
}
```

No se necesitan estados nuevos: la posicion original ya se conoce por los datos de la tarea, y la posicion del preview esta en `dragPreview`.

