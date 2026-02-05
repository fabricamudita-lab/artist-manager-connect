
# Plan: Mejorar Navegación y Añadir Snap-to-Grid

## Problemas Identificados

1. **Scroll horizontal conflictivo**: Los gestos de swipe hacia la izquierda activan la navegación del navegador (volver atrás) en lugar de hacer scroll en el canvas
2. **Falta de alineación**: Los perfiles pueden quedar en posiciones irregulares, superpuestos o desalineados

## Solución

### 1. Prevenir Navegación del Navegador

Capturar los eventos de scroll/wheel en el contenedor y prevenir la propagación cuando el usuario intenta hacer scroll horizontal:

```typescript
// En el contenedor scrollable
onWheel={(e) => {
  // Prevenir que el navegador interprete el scroll horizontal como navegación
  if (Math.abs(e.deltaX) > 0) {
    e.stopPropagation();
  }
}}
```

Además, añadir `overscroll-behavior: contain` en CSS para evitar que el scroll se propague al body.

### 2. Snap-to-Grid al Soltar

Cuando el usuario suelta una tarjeta, la posición se ajustará automáticamente a la cuadrícula más cercana:

```typescript
const GRID_SNAP_SIZE = 24; // Coincide con el tamaño de los puntos del fondo

const snapToGrid = (position: Position): Position => ({
  x: Math.round(position.x / GRID_SNAP_SIZE) * GRID_SNAP_SIZE,
  y: Math.round(position.y / GRID_SNAP_SIZE) * GRID_SNAP_SIZE,
});

// Al soltar (handleMouseUp/handleTouchEnd):
const snappedPosition = snapToGrid(currentPosition);
setCurrentPosition(snappedPosition);
onPositionChange(snappedPosition);
```

### 3. Guías Visuales (Opcional pero recomendado)

Mostrar líneas guía cuando una tarjeta está siendo arrastrada y se alinea con otras:
- Línea vertical cuando X coincide con otra tarjeta
- Línea horizontal cuando Y coincide

## Cambios por Archivo

| Archivo | Cambios |
|---------|---------|
| `TeamMemberFreeCanvas.tsx` | Añadir `overscroll-behavior: contain`, handler `onWheel` para prevenir navegación |
| `DraggableMemberCard.tsx` | Implementar función `snapToGrid()` y aplicarla al soltar |

## Detalles Técnicos

### TeamMemberFreeCanvas.tsx

```tsx
{/* Scrollable Canvas Container */}
<div 
  className="overflow-auto border rounded-lg bg-muted/20" 
  style={{ 
    maxHeight: '70vh',
    overscrollBehavior: 'contain', // Previene scroll encadenado
  }}
  onWheel={(e) => {
    // Prevenir navegación del navegador en scroll horizontal
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
    }
  }}
>
```

### DraggableMemberCard.tsx

```tsx
const GRID_SNAP_SIZE = 24; // Tamaño de la cuadrícula de puntos

const snapToGrid = (pos: Position): Position => ({
  x: Math.round(pos.x / GRID_SNAP_SIZE) * GRID_SNAP_SIZE,
  y: Math.round(pos.y / GRID_SNAP_SIZE) * GRID_SNAP_SIZE,
});

// En handleMouseUp:
const handleMouseUp = () => {
  if (isDragging) {
    setIsDragging(false);
    const snappedPosition = snapToGrid(currentPosition);
    setCurrentPosition(snappedPosition);
    onPositionChange(snappedPosition);
  }
};

// Igual para handleTouchEnd
```

## Comportamiento Esperado

1. **Scroll horizontal**: Funciona normalmente dentro del canvas sin activar el "volver atrás" del navegador
2. **Al soltar una tarjeta**: Se ajusta automáticamente a la cuadrícula de 24px (visible como los puntos del fondo)
3. **Alineación visual**: Las tarjetas quedan perfectamente alineadas si se colocan cerca unas de otras

## Consideraciones Adicionales

- El snap de 24px coincide con el `backgroundSize` del grid de puntos, creando coherencia visual
- La función snap es bidireccional (X e Y), permitiendo alineación tanto horizontal como vertical
- El contenedor ahora "atrapa" el scroll, evitando efectos no deseados en el resto de la página
