## Objetivo

Añadir un nuevo estado **"Pagado (sin justificante)"** al selector de `billing_status`, que cuente como pagado en cashflow pero quede marcado como "pendiente de regularizar" para que la gestoría pueda revisarlo.

## Etiqueta y semántica

- **Valor en BD**: `pagado_sin_factura`
- **Etiqueta UI**: `Pagado (sin justificante)`
- **Tooltip / descripción corta**: "Salida de dinero sin factura/recibo. Pendiente de regularizar con gestoría."
- **Color**: tono ámbar/naranja (distinto del verde de "Pagada" para que destaque visualmente como algo a revisar).

## Comportamiento contable

| Métrica | Cuenta como… |
|---|---|
| Total pagado (cashflow, salidas) | **Sí**, suma como pagado |
| Pendiente de pago | **No**, ya está fuera |
| Pendiente de regularizar (nuevo contador / aviso) | **Sí**, aparece destacado |
| Filtros "Solo pagadas" | Incluido |
| Filtros "Pendiente de factura" | Incluido como sub-categoría |

Helper único `isPaidStatus(s)` que devuelve `true` para `'pagado'`, `'pagada'` y `'pagado_sin_factura'`. Se reemplazan todas las comparaciones literales `=== 'pagado'` por este helper en los puntos críticos.

## Cambios en código

### 1. Nuevo helper `src/lib/billingStatus.ts` (nuevo archivo)

```ts
export const BILLING_STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'factura_solicitada', label: 'Factura solicitada' },
  { value: 'factura_recibida', label: 'Factura recibida' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'pagado_sin_factura', label: 'Pagado (sin justificante)' },
  { value: 'agrupada', label: 'Agrupada en factura' },
] as const;

export const PAID_STATUSES = ['pagado', 'pagada', 'pagado_sin_factura'] as const;
export const isPaidStatus = (s?: string | null) => !!s && PAID_STATUSES.includes(s as any);
export const needsRegularization = (s?: string | null) => s === 'pagado_sin_factura';
export const billingStatusLabel = (s?: string | null) => { /* mapeo */ };
```

### 2. `src/components/BudgetDetailsDialog.tsx`

- Añadir `<SelectItem value="pagado_sin_factura">Pagado (sin justificante)</SelectItem>` en los dos selectores (líneas 4034 y 4604).
- Ampliar el mapa de etiquetas (líneas 3037-3042 y 4622-4625) para incluir la nueva opción.
- En la función PDF/CSV (líneas 2464, 2792) tratar `pagado_sin_factura` como "Pagado (sin justificante)".
- Actualizar la lógica `data.pendiente === 0` para que `isPaidStatus` reconozca el nuevo estado.

### 3. `src/components/EnhancedBudgetItemsView.tsx`

- Ampliar el type `billing_status` (línea 46) para incluir `'pagado_sin_factura'`.
- Añadir el SelectItem y el color del badge (`statusColors`, `statusLabels`).

### 4. `src/components/finanzas/CashflowView.tsx` y `CashflowPanel.tsx`

- Reemplazar `.neq('billing_status', 'pagado')` por filtro que excluya **todos** los estados pagados:
  ```ts
  .not('billing_status', 'in', '(pagado,pagada,pagado_sin_factura)')
  ```
- Añadir un badge "Sin justificante" cuando una línea aparece marcada como `pagado_sin_factura`, para que se distinga visualmente.

### 5. `src/hooks/useFinanzasPanel.ts`

- Reemplazar las 4 comparaciones `i.billing_status === 'pagado'` (líneas 266, 322, 363, 527) por `isPaidStatus(i.billing_status)`.
- Añadir un nuevo agregado `pendienteRegularizar` (suma de items `pagado_sin_factura`) y exportarlo del hook.

### 6. `src/components/booking-detail/BookingPresupuestoTab.tsx`

- Línea 173: usar `isPaidStatus` en lugar de `=== 'pagado'`.

### 7. `src/components/LiquidarFacturasDialog.tsx`

- Línea 63: el filtro `.in('billing_status', [...])` no incluye `pagado_sin_factura` (correcto: ya no se puede facturar después). Sin cambios.
- Línea 293: mostrar etiqueta legible vía `billingStatusLabel`.

### 8. `src/utils/budgetCrewLoader.ts` y `src/utils/generateProjectDocumentation.ts`

- Añadir mapeo de la nueva opción si listan etiquetas.

### 9. Aviso "Pendiente de regularizar"

- En `BudgetSummaryCards`, si `pendienteRegularizar > 0`, mostrar una tarjeta ámbar:
  > "Pagos sin justificante: €XXX,XX (N líneas) — pendientes de regularizar con gestoría."

## Cambios en base de datos

**Ninguno.** El campo `billing_status` ya es `text` libre (no es un `enum` PostgreSQL). Confirmado por los selects existentes que usan strings arbitrarios. Se añade el nuevo valor sin migración.

## Fuera de alcance (responder a "también en cobros del booking")

Los cobros del booking (anticipo/liquidación) usan otro modelo (`anticipo_estado`, `liquidacion_estado`, `cobro_estado`) con solo dos estados (cobrado/pendiente), no el sistema `billing_status`. Para introducir "cobrado sin factura emitida" allí se necesitan columnas nuevas (`anticipo_sin_factura`, `liquidacion_sin_factura` boolean) y modificar `PagoDialog`. Lo abordaré en un cambio aparte si confirmas que también lo quieres allí — aviso para no mezclar dos arquitecturas en el mismo paso.

## Resumen ejecutable

1. Crear `src/lib/billingStatus.ts` con catálogo y helpers.
2. Actualizar selectores y badges en BudgetDetailsDialog y EnhancedBudgetItemsView.
3. Sustituir `=== 'pagado'` por `isPaidStatus(...)` en hooks y vistas (Cashflow, FinanzasPanel, BookingPresupuestoTab).
4. Añadir agregado `pendienteRegularizar` y aviso visual en BudgetSummaryCards.
5. Sin migración SQL.
