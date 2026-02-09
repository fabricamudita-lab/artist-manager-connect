
# Fix: Hacer clic en las tarjetas del Dashboard de Perfiles

## Problema

Las tarjetas (ItemCard) ya tienen un handler `onClick` en el componente `Card`, pero el `DialogContent` de Radix UI intercepta los eventos de clic internamente (para manejar el cierre del dialog al hacer clic fuera), lo que impide que el `onClick` de las tarjetas funcione correctamente.

## Solucion

Cambiar la estrategia de interaccion en el componente `ItemCard`: usar `onPointerDown` con deteccion de movimiento en lugar de `onClick`, o simplemente envolver la logica con `onMouseDown` + `onMouseUp` para evitar la interferencia del Dialog.

La solucion mas simple y robusta: usar `role="button"` y `onMouseUp` en vez de `onClick`, ya que Radix intercepta `onPointerDownOutside` pero no `onMouseUp`.

### Cambios en `src/components/ContactDashboardDialog.tsx`

**ItemCard** (lineas 202-224): Reemplazar `onClick` por `onMouseUp` en el `Card`:

```typescript
const ItemCard = ({ title, subtitle, status, date, onClick }: {
  title: string;
  subtitle?: string;
  status?: string | null;
  date?: string | null;
  onClick?: () => void;
}) => (
  <Card
    className={`hover:bg-muted/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    role={onClick ? 'button' : undefined}
    onMouseUp={(e) => {
      if (onClick) {
        e.stopPropagation();
        onClick();
      }
    }}
  >
    <CardContent className="p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {date && <span className="text-xs text-muted-foreground">{formatDate(date)}</span>}
        <StatusBadge status={status} />
        {onClick && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
    </CardContent>
  </Card>
);
```

Esto evita la interferencia del Dialog manteniendo la misma experiencia visual para el usuario.

## Archivo a modificar

- `src/components/ContactDashboardDialog.tsx` (solo el componente ItemCard, lineas 202-224)
