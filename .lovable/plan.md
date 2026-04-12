

## Mostrar resumen de tareas pendientes en el header del Timeline cuando está colapsado

### Cambio
Cuando el Timeline está colapsado, mostrar un aviso compacto en el header indicando cuántas tareas están pendientes o vencidas, similar al resumen que ya se implementó en "Estado de Pagos".

### Archivo: `src/components/booking-detail/BookingTimeline.tsx`

**En el `CardTitle` (línea ~168-172)**, añadir un bloque condicional cuando `collapsed`:

1. Contar checkpoints pendientes (`status === 'pending'`) y vencidos (`due_date < today && status !== 'done'`)
2. Mostrar badges inline:
   - Si hay vencidos: badge rojo `🔴 X vencidas`
   - Si hay pendientes (no vencidos): badge amarillo `X pendientes`
   - Si todo está hecho: badge verde `✓ Al día`

```tsx
<CardTitle className="text-sm flex items-center gap-2 w-full">
  <Clock className="h-4 w-4" />
  Timeline
  {collapsed && (
    <div className="flex items-center gap-2 ml-2">
      {overdueCount > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
          {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
        </span>
      )}
      {pendingCount > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
          {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
        </span>
      )}
      {overdueCount === 0 && pendingCount === 0 && checkpoints.length > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ Al día</span>
      )}
    </div>
  )}
  <ChevronDown ... />
</CardTitle>
```

Las variables `overdueCount` y `pendingCount` se calculan a partir de `checkpoints` ya cargado en el componente — sin queries adicionales.

