## Contexto actual

La base de datos **ya soporta múltiples presupuestos por booking**: la tabla `budgets` tiene una columna `booking_offer_id UUID REFERENCES booking_offers(id) ON DELETE SET NULL` (relación N:1 → un booking puede tener N presupuestos) y existe el índice `idx_budgets_booking_offer_id`.

La pestaña **Presupuesto** del detalle de booking (`BookingPresupuestoTab`) ya itera con `linked.map(...)`, así que técnicamente puede mostrar varias tarjetas. Pero hay piezas que asumen "1 presupuesto por evento" y la UX no invita a crear/gestionar varios. Y hay un comportamiento problemático: un *fuzzy match* por nombre/fecha que mezcla presupuestos no vinculados sin pedir permiso.

## Objetivo

Permitir que un mismo booking tenga **varios presupuestos vinculados de forma deliberada** (ej. "Producción", "Catering", "Backline"), con una UX clara para crear, vincular, marcar como principal y desvincular, más una **vista consolidada** de KPIs sumando todos.

## Cambios

### 1. Base de datos (migración)

Tabla `budgets` (ya existe `booking_offer_id`, no se rompe nada):

- Añadir columna `is_primary_for_booking BOOLEAN NOT NULL DEFAULT false` para marcar el presupuesto principal de cada booking (el que se usa cuando el sistema necesita "el presupuesto" del evento).
- Añadir columna `booking_role TEXT` (libre, opcional) para etiquetar el presupuesto dentro del booking: ej. "Producción", "Catering", "Backline". Validado contra longitud máx. 60.
- Índice parcial único: `CREATE UNIQUE INDEX budgets_one_primary_per_booking ON budgets(booking_offer_id) WHERE is_primary_for_booking = true` → garantiza máximo un principal por booking.
- Índice compuesto `(booking_offer_id, created_at DESC)` para listar rápidamente los presupuestos de un booking ordenados.
- Trigger `BEFORE INSERT/UPDATE`: si el booking aún no tiene ningún principal y se vincula un nuevo presupuesto, marcarlo automáticamente como principal. Si se marca uno como principal, desmarcar el anterior en el mismo booking (transacción atómica).
- RLS: las políticas existentes de `budgets` siguen aplicando (no se amplía superficie de acceso). Solo se añade un `CHECK` para que `booking_role` tenga `length <= 60` (evita XSS/abuso de tamaño antes incluso de llegar al cliente).

### 2. Backend / capa de datos

Crear `src/lib/budgets/bookingBudgets.ts` (lógica separada de UI, validada con Zod, paginada):

- `listBudgetsForBooking(bookingId, { limit=50, offset=0 })` — query parametrizada (sin string concat), valida UUID con Zod, devuelve `{ items, total, hasMore }`.
- `linkBudgetToBooking(budgetId, bookingId)` — valida ambos UUIDs, comprueba que el budget no esté ya vinculado a otro booking (si lo está, error explícito que la UI traduce en confirmación).
- `unlinkBudgetFromBooking(budgetId)` — pone `booking_offer_id = null`, `is_primary_for_booking = false`.
- `setPrimaryBudget(budgetId, bookingId)` — delega en el trigger.
- `updateBudgetRole(budgetId, role)` — Zod: `z.string().trim().max(60).nullable()`.
- Cada función maneja errores Supabase (RLS, FK violation, índice único) devolviendo errores tipados.

### 3. UI — pestaña Presupuesto del booking (`BookingPresupuestoTab`)

- **Eliminar el fuzzy match** por nombre/fecha que actualmente sugiere vincular presupuestos del mismo artista. Sustituirlo por un buscador explícito ("Vincular presupuesto existente…") que abre un combobox paginado con los presupuestos del artista no vinculados a ningún otro booking.
- Cabecera con KPIs **consolidados** (suma de todos los presupuestos vinculados): Capital total, Pagado total, Comprometido total, Disponible total. Si solo hay 1, se ve igual que ahora.
- Cada presupuesto se renderiza como tarjeta colapsable con:
  - Etiqueta editable inline (`booking_role`: "Producción", "Catering"…).
  - Badge "Principal" + botón "Marcar como principal" si no lo es.
  - Botón "Desvincular" (con confirm dialog que aclara que el presupuesto no se borra, solo se desvincula).
  - KPIs individuales que ya existen.
- Botón "+ Nuevo presupuesto" siempre visible (no solo cuando ya hay uno), y nuevo botón "Vincular existente".
- Al crear el segundo presupuesto, sugerir un nombre por defecto: `Presupuesto N - {evento}`.

### 4. UI — barra superior de KPIs en `BookingDetail`

La tarjeta "Estimar gastos" / "Gastos Est." actualmente solo lee `booking.gastos_estimados`. Se amplía:

- Si hay presupuestos vinculados, mostrar **"Comprometido: €X.XXX"** (suma del comprometido de todos los presupuestos vinculados) en vez del valor estático, y un subtexto "N presupuestos".
- Click en la tarjeta lleva a la pestaña Presupuesto.

### 5. Coherencia con el resto del sistema

Ya hay sitios que asumen 1:N correctamente (`duplicate_booking_deep` itera, `FinanzasPresupuestos` lista todos). Verificar y dejar consistente:
- `useEventAssistant` y `BookingTimeline`: cuando consultan "el presupuesto" del booking, pasar a usar `is_primary_for_booking = true` como criterio de desempate (con fallback al más reciente).
- Sin tocar nada del sistema de auth, RLS de booking_offers, ni del panel de usuario: el modelo de permisos sigue siendo "quien ve el booking ve sus presupuestos".

## Detalles técnicos / seguridad

- **Validación servidor**: trigger PG + `CHECK` constraints + Zod en cliente antes de cada mutación.
- **Inyección SQL**: todas las consultas pasan por el query builder de Supabase (parametrizado). Cero string concat.
- **XSS**: `booking_role` se renderiza como texto plano (React escapa por defecto, nada de `dangerouslySetInnerHTML`). Longitud capada a 60.
- **Edge cases cubiertos**:
  - Vincular un presupuesto que ya pertenece a otro booking → confirmación explícita ("Mover de booking X a Y").
  - Desvincular el principal cuando hay otros → el trigger promociona automáticamente el más reciente.
  - Borrar un booking → `ON DELETE SET NULL` mantiene los presupuestos huérfanos (no se pierden datos financieros).
  - Booking sin artist_id → el buscador de "vincular existente" se desactiva con mensaje claro.
- **Paginación**: `listBudgetsForBooking` y el combobox de "Vincular existente" usan `range()` de Supabase con `limit=50` por página.
- **Separación lógica/UI**: toda la lógica vive en `src/lib/budgets/bookingBudgets.ts`; el componente solo consume vía React Query.

## Archivos afectados

- `supabase/migrations/<timestamp>_multi_budgets_per_booking.sql` (nuevo)
- `src/lib/budgets/bookingBudgets.ts` (nuevo, capa de datos + Zod)
- `src/components/booking-detail/BookingPresupuestoTab.tsx` (refactor: KPIs consolidados, eliminar fuzzy, añadir vincular/desvincular/principal/role)
- `src/components/booking-detail/LinkExistingBudgetDialog.tsx` (nuevo, combobox paginado)
- `src/pages/BookingDetail.tsx` (KPI superior usa comprometido agregado)
- `src/integrations/supabase/types.ts` (regenerado por la migración)
