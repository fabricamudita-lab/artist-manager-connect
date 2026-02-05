
# Plan: Deshabilitar Apertura del Panel en Vista Libre

## Problema

En el modo "Vista Libre", al hacer clic en un perfil para moverlo, se abre la barra lateral de perfil. El usuario quiere poder seleccionar y arrastrar los perfiles sin que se dispare esta acción.

## Solución

Modificar la lógica del componente `DraggableMemberCard` para distinguir entre un clic intencional (para ver perfil) y un clic de arrastre (para mover). La estrategia será:

1. **Detectar movimiento**: Solo considerar como "clic" si el usuario suelta el mouse sin haber movido el elemento
2. **Umbral de movimiento**: Establecer un umbral mínimo de 5 píxeles para considerar que hubo movimiento
3. **No pasar onClick en modo libre**: La opción más simple - en el modo libre, simplemente no pasar el callback `onClick` al componente

## Cambios a Realizar

### Archivo: `src/components/DraggableMemberCard.tsx`

Añadir lógica para rastrear si hubo movimiento durante el arrastre:

```typescript
const [hasMoved, setHasMoved] = useState(false);
const startPositionRef = useRef<Position>({ x: 0, y: 0 });

// En handleMouseDown:
startPositionRef.current = { x: e.clientX, y: e.clientY };
setHasMoved(false);

// En handleMouseMove:
const distance = Math.sqrt(
  Math.pow(e.clientX - startPositionRef.current.x, 2) +
  Math.pow(e.clientY - startPositionRef.current.y, 2)
);
if (distance > 5) setHasMoved(true);

// En handleMouseUp:
// Solo ejecutar onClick si NO hubo movimiento
if (!hasMoved && onClick) {
  onClick();
}
```

### Archivo: `src/pages/Teams.tsx`

Alternativa más simple: no pasar `onMemberClick` al `TeamMemberFreeCanvas`, de modo que en la vista libre los clics nunca abran el panel lateral. El usuario puede acceder al perfil a través del menú de acciones (tres puntos).

## Enfoque Recomendado

Usar la alternativa simple en `Teams.tsx`: no pasar el callback de clic al canvas libre. Esto hace que:
- En modo cuadrícula y lista: clic abre el panel lateral
- En modo libre: clic permite arrastrar, el menú de acciones permite ver/editar

Esto mantiene la experiencia consistente y predecible.

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/pages/Teams.tsx` | No pasar `onMemberClick` al `TeamMemberFreeCanvas` |
