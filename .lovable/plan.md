

## Resumen visible en "Estado de Pagos" cuando está colapsado

### Problema
Al minimizar la tarjeta, solo se ve el título "Estado de Pagos" sin ninguna información útil. El usuario pierde visibilidad del estado actual del cobro.

### Solución
Añadir un resumen compacto inline en el header que se muestre **solo cuando está colapsado**, con:
- Badge de estado (Cobrado / Pendiente / Vencido)
- Importe cobrado o pendiente

### Archivo: `src/components/booking-detail/PaymentStatusCard.tsx`

**En el `CardHeader` (línea ~206-210)**, después del título "Estado de Pagos" y antes del chevron, añadir un bloque condicional que solo aparece cuando `collapsed`:

```tsx
<CardTitle className="text-base flex items-center gap-2 w-full">
  <Banknote className="h-4 w-4 text-primary" />
  Estado de Pagos
  {collapsed && (
    <div className="flex items-center gap-2 ml-2">
      <StatusBadge estado={...} fechaEsperada={...} />
      <span className="text-sm font-semibold text-muted-foreground">{fmt(amount)}</span>
    </div>
  )}
  <ChevronDown className="..." />
</CardTitle>
```

La lógica del badge y el importe reutiliza las mismas variables ya calculadas (`cobroEstado`, `fee`, `hasFraccionado`, etc.) para mostrar:
- **Pago único cobrado**: Badge "Cobrado" + importe
- **Fraccionado**: Badge con estado general + total cobrado / total
- **Sin pagos**: Badge "Pendiente" + fee total

Un cambio pequeño, solo en el header, sin tocar la lógica existente.

