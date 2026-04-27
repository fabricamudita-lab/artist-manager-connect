# Eliminar presupuestos desde el detalle del Booking

Añadir un botón **Eliminar** en cada tarjeta de presupuesto vinculada al booking, con un diálogo de **doble confirmación** que detalle exactamente qué se perderá antes de borrar.

## UX

En la cabecera de cada tarjeta de presupuesto (junto a "Duplicar" y "Abrir presupuesto completo"), añadir un botón **Eliminar** en rojo (icono `Trash2`).

Al pulsarlo, abrir un `AlertDialog` con:

**Título**: `¿Eliminar "<nombre del presupuesto>"?`

**Cuerpo dinámico** que liste lo que se perderá (calculado con los datos ya cargados + una consulta ligera de conteos):
- N partidas de presupuesto (`budget_items`)
- Total Capital (€XX.XXX,XX) y total Pagado
- Si es **primario**: aviso de que se promoverá automáticamente otro presupuesto como primario (gestionado por trigger DB existente)
- Si tiene pagos registrados (items con `billing_status` cobrado/pagado): **bloquear eliminación** y mostrar mensaje pidiendo desvincular cobros antes
- Si tiene partidas conciliadas (`is_reconciled`): aviso fuerte sobre alteración de cierre fiscal
- Aviso final: *"Esta acción no se puede deshacer."*

**Doble confirmación**: el botón rojo "Eliminar definitivamente" permanece deshabilitado hasta que el usuario escriba el nombre exacto del presupuesto en un input de confirmación (patrón GitHub-style).

Tras eliminar, toast de éxito + `invalidateQueries(['booking-budgets', bookingId])`.

## Capa lógica

Extender `src/lib/budgets/bookingBudgetActions.ts` con:

```ts
export async function getBudgetDeletionImpact(budgetId: string): Promise<{
  itemCount: number;
  totalCapital: number;
  totalPaid: number;
  hasPaidItems: boolean;
  hasReconciledItems: boolean;
  isPrimary: boolean;
}>

export async function deleteBudget(budgetId: string): Promise<void>
```

- `getBudgetDeletionImpact`: una sola query a `budget_items` (`select id, unit_price, quantity, billing_status, is_reconciled`) + lectura del flag `is_primary_for_booking` del header. Calcula totales en cliente.
- `deleteBudget`: valida con Zod (id uuid), re-comprueba en servidor que no haya items pagados/conciliados (defensa en profundidad), borra `budget_items` y luego el `budgets`. El trigger `promote_next_primary_budget` ya existente se encarga de promover otro primario si procede.

## Componente UI

Nuevo componente `src/components/booking-detail/DeleteBudgetDialog.tsx`:
- Props: `budget`, `open`, `onOpenChange`, `onDeleted`
- Usa `useQuery` para cargar el impacto al abrirse
- Renderiza lista de impacto con iconos (AlertTriangle ámbar / rojo según severidad)
- Input de confirmación por nombre + botón destructivo
- Maneja estados: loading impacto, bloqueado por pagos, confirmando, eliminando

Integrarlo en `BookingPresupuestoTab.tsx` añadiendo estado `budgetToDelete` y el botón Trash2 en la cabecera de cada tarjeta del bloque "linked".

## Archivos afectados

- `src/lib/budgets/bookingBudgetActions.ts` (añadir funciones)
- `src/components/booking-detail/DeleteBudgetDialog.tsx` (nuevo)
- `src/components/booking-detail/BookingPresupuestoTab.tsx` (botón + estado + render del diálogo)

No requiere migración de base de datos: los triggers de promoción de primario y las RLS de `budgets`/`budget_items` ya existen.
