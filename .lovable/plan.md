## Diagnóstico

La pestaña **Finanzas** de un proyecto solo suma `budgets` con `project_id = id` y `cobros`. Por eso aparece todo a 0: los **booking_offers**, **sync_offers**, **releases** y demás entidades que tienen valor económico vinculadas al proyecto **no se agregan**.

Tablas con `project_id` con potencial económico (verificadas en la BD):

| Tabla | Importe | Estado |
|---|---|---|
| `budgets` | `fee` | `budget_status`, `show_status` |
| `booking_offers` | `fee` | `phase` (`interes` / `oferta` / `confirmado` / `facturado`) |
| `sync_offers` | `master_fee + publishing_fee` (o `sync_fee` si no hay desglose) | `phase` (`solicitud`, etc.) |
| `releases` | sin importe directo → suma vía `budgets.release_id` (ya cubierto) |
| `cobros` | `amount_gross` / `amount_net` | `status` |

> Nota: los presupuestos vinculados a un release/booking suelen tener también `project_id` cuando el booking/release está dentro de un proyecto, así que se evita el doble conteo limitando la agregación de `booking_offers`/`sync_offers` a aquellos **sin presupuesto** asociado para ese proyecto. Para mantenerlo simple y predecible: sumamos por entidad de origen, **sin doble contar** mediante una clave `${entityType}-${entityId}` ya cubierta por presupuestos.

## Solución

Modificar **`src/pages/ProjectDetail.tsx`**:

### 1. Cargar las nuevas fuentes

Añadir al `useEffect` de carga (junto a `loadCobros`):

- `loadBookingOffers`: `select id, fee, phase, event_date, project_id` filtrado por `project_id = id`.
- `loadSyncOffers`: `select id, sync_fee, master_fee, publishing_fee, phase, project_id` filtrado por `project_id = id`.

Nuevos estados: `bookingOffers`, `syncOffers`.

### 2. Recalcular los KPIs en la pestaña Finanzas

Reescribir las constantes `ingresosConfirmados`, `enNegociacion`, y añadir `pipelineGlobal`:

```ts
// --- Presupuestos (ya existente) ---
const presupuestosConfirmados = budgets.filter(b => 
  b.budget_status === 'confirmado' || b.show_status === 'confirmado'
).reduce((s, b) => s + Number(b.fee || 0), 0);

const presupuestosNegociacion = budgets.filter(b => 
  ['negociacion','pendiente'].includes(b.budget_status) || b.show_status === 'negociacion'
).reduce((s, b) => s + Number(b.fee || 0), 0);

// --- Booking offers SIN presupuesto vinculado en este proyecto ---
const budgetBookingIds = new Set(
  budgets.map(b => b.booking_offer_id).filter(Boolean)
);
const bookingExtraConfirmado = bookingOffers
  .filter(o => !budgetBookingIds.has(o.id) && ['confirmado','facturado'].includes(o.phase))
  .reduce((s, o) => s + Number(o.fee || 0), 0);
const bookingExtraNegociacion = bookingOffers
  .filter(o => !budgetBookingIds.has(o.id) && ['interes','oferta'].includes(o.phase))
  .reduce((s, o) => s + Number(o.fee || 0), 0);

// --- Sync offers ---
const syncTotal = (o) => Number(o.sync_fee || 0) || 
  (Number(o.master_fee || 0) + Number(o.publishing_fee || 0));
const syncConfirmado = syncOffers
  .filter(o => ['confirmado','facturado','aprobado'].includes(o.phase))
  .reduce((s, o) => s + syncTotal(o), 0);
const syncNegociacion = syncOffers
  .filter(o => ['solicitud','negociacion','pendiente','oferta'].includes(o.phase))
  .reduce((s, o) => s + syncTotal(o), 0);

const ingresosConfirmados = presupuestosConfirmados + bookingExtraConfirmado + syncConfirmado;
const enNegociacion = presupuestosNegociacion + bookingExtraNegociacion + syncNegociacion;
```

Actualizar también el subtítulo de cada KPI: en vez de "X presupuestos" mostrar "X fuentes" (presupuestos + offers + syncs contadas).

### 3. Añadir bloque desplegable "Desglose por origen"

Bajo las cards KPI, una pequeña tabla:

```
Bookings  ............................ X €
Releases (vía presupuestos) .......... X €
Sincronizaciones ..................... X €
Otros presupuestos ................... X €
─────────────────────────────────────
Total pipeline ....................... X €
```

Esto da transparencia al usuario sobre qué entidades suman.

### 4. Sin cambios en BD ni RLS

Las tablas ya tienen `project_id` indexado y políticas RLS que permiten lectura al equipo del proyecto.

## Fuera de alcance

- No tocar la UI de "Cobros del proyecto" (queda igual, solo mira `cobros`).
- No tocar "Ejecución de presupuesto" (sigue basándose en `budget_items`).
- No mezclar gastos con ingresos.
