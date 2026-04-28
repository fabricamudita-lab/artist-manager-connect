## Objetivo

Transformar la pestaña **Presupuesto** del detalle de un booking en un centro de gestión profesional donde:

1. Cada booking tenga **un único presupuesto principal** (el que alimenta Caché/Cobros oficiales).
2. Se puedan crear **presupuestos alternativos** (propuestas internas, simulaciones, escenarios "con/sin equipo").
3. Se pueda **duplicar** o **vincular** desde otros presupuestos del mismo proyecto/artista.
4. La interfaz sea estéticamente clara, ordenada y use **menús desplegables** para no saturar.

Se mantiene la lógica ya aprobada: duplicar, renombrar inline, eliminar con confirmación "CONFIRMAR".

---

## Cambios funcionales

### 1. Concepto "Principal" vs "Alternativos"

- Se reutiliza la columna existente `budgets.is_primary_for_booking` (ya en BD).
- **Reglas**:
  - Cuando solo hay un presupuesto vinculado → automáticamente principal.
  - Al añadir más, el primero conserva el flag; el resto entran como **Alternativos**.
  - El usuario puede "Marcar como principal" desde el menú → se desmarca el anterior (operación atómica vía dos updates en secuencia con invalidación).
  - El presupuesto principal es el que muestran Cobros, Cashflow y Caché (lógica existente respeta este flag).

### 2. Layout rediseñado de la sección

```text
┌─ Presupuestos del evento ────────────────────────── [+ Añadir ▾] ─┐
│                                                                    │
│  ╔═ PRINCIPAL ═══════════════════════════════════════════════════╗ │
│  ║ 📋 Presupuesto - CurtCircuit         [ Acciones ▾ ]          ║ │
│  ║ ─────────────────────────────────────────────────────────────║ │
│  ║ Capital   Pagado    Comprometido    Disponible               ║ │
│  ║ 3.818€    2.256€    2.856€          962€                     ║ │
│  ║ ─ Desglose por categoría ───────────────────────────────────  ║ │
│  ║ Músicos (5) ............................... 1.500€           ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                    │
│  Alternativos (2)                                  [ Colapsar ▾ ] │
│  ┌─ 📋 Propuesta sin equipo técnico  [Marcar principal][Acciones▾]┐│
│  │   Capital 3.818€ · Comprometido 1.800€ · Disponible 2.018€    ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌─ 📋 Escenario con cachet alto     [Marcar principal][Acciones▾]┐│
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ── Disponibles para vincular del proyecto ──────────────────────  │
│  • Presupuesto - Gira Norte    [Vincular ▾ (como alternativo)]    │
└────────────────────────────────────────────────────────────────────┘
```

Detalles visuales:
- **Principal**: tarjeta destacada con borde primary y badge "Principal" verde; KPIs grandes y desglose completo.
- **Alternativos**: tarjetas compactas plegadas por defecto (mostrar solo nombre + Capital/Disponible). Click para expandir desglose. Acordeón controlado.
- Etiquetas de estado: badge `Borrador`, `Aprobado`, `Cerrado` según `budget_status` cuando aplique.
- Iconografía consistente: `Star` para principal, `Copy` duplicar, `Pencil` renombrar, `Link` vincular, `Trash2` eliminar.

### 3. Menú "Añadir ▾" (DropdownMenu en la cabecera)

Reemplaza los botones sueltos actuales. Opciones:

| Opción | Acción |
|---|---|
| ➕ Crear nuevo presupuesto en blanco | mutación `createBudget` actual (autocarga crew si hay formato) |
| 🧬 Duplicar el principal | `duplicateBudget(principalId)` y abrir el resultado |
| 🔗 Vincular uno existente del proyecto… | abre submenú con la lista de `unlinked` del proyecto |

Si no hay principal aún, solo se muestra "Crear nuevo presupuesto".

### 4. Menú "Acciones ▾" por tarjeta

Sustituye la fila actual de botones (Duplicar / Abrir / Eliminar). DropdownMenu con:

- **Abrir presupuesto completo** (ExternalLink)
- **Renombrar** (Pencil) → activa edición inline existente
- **Duplicar como nuevo alternativo** (Copy)
- **Marcar como principal** (Star) — solo visible si `!is_primary_for_booking`
- **Desvincular del booking** (Unlink) — solo visible para alternativos: pone `booking_offer_id = null`, sin borrar
- **Eliminar…** (Trash2, rojo) — abre `DeleteBudgetDialog` existente con "CONFIRMAR"

El nombre del presupuesto sigue siendo editable haciendo click directo (lápiz al hover), comportamiento ya existente.

### 5. Vinculación de presupuestos del mismo proyecto

- La sección "Presupuestos del mismo proyecto" se mantiene pero se refina:
  - Se muestra solo cuando hay candidatos.
  - Cada item incluye chip con tipo + fee + fecha del evento si difiere.
  - Botón único "Vincular" que añade como alternativo (no toca el principal).
  - Si no había ningún presupuesto vinculado, el primer vínculo se marca como principal automáticamente.

### 6. Cambio del flag principal (lógica)

Función nueva en `bookingBudgetActions.ts`:

```text
setPrimaryBudget(bookingId, newPrimaryId):
  1. UPDATE budgets SET is_primary_for_booking=false
     WHERE booking_offer_id = bookingId AND is_primary_for_booking = true
  2. UPDATE budgets SET is_primary_for_booking=true
     WHERE id = newPrimaryId
```

`unlinkBudget(budgetId)`:
- Si el budget es principal y existen otros vinculados → exigir promover otro antes (toast informativo).
- Si no, `UPDATE budgets SET booking_offer_id=null WHERE id=...`.

### 7. Estado vacío

Mantener `EmptyState` actual pero con texto mejorado: "Aún no hay presupuestos para este concierto. Crea uno desde cero o duplica uno existente del proyecto." y un botón con menú desplegable que ofrece ambas opciones cuando hay candidatos del proyecto.

---

## Archivos afectados

- `src/components/booking-detail/BookingPresupuestoTab.tsx`
  - Reestructurar render: cabecera con DropdownMenu "Añadir", tarjeta principal destacada, sección "Alternativos" colapsable, sección "Disponibles para vincular" pulida.
  - Reemplazar botones por DropdownMenu de acciones por tarjeta.
  - Añadir mutaciones `setPrimaryMutation` y `unlinkMutation`.
  - Calcular `principal` = `linked.find(b => b.is_primary_for_booking)` o `linked[0]` (auto-primary si no hay flag).
  - Añadir al `select` el campo `is_primary_for_booking`.
- `src/lib/budgets/bookingBudgetActions.ts`
  - Añadir `setPrimaryBudget(bookingId, newPrimaryId)`.
  - Añadir `unlinkBudgetFromBooking(budgetId)`.
  - Añadir `ensurePrimaryOnLink(bookingId)` helper que marca principal si ninguno lo es.
- Reutilizar componentes: `DropdownMenu`, `Card`, `Badge`, `Collapsible`, `BudgetDetailsDialog`, `DeleteBudgetDialog`.

No se requieren migraciones — el campo `is_primary_for_booking` ya existe.

---

## Resultado esperado

- Una tarjeta principal grande, clara, con KPIs y desglose por categoría (como en la captura del usuario).
- Alternativos compactos, expandibles, fáciles de comparar.
- Acciones agrupadas en menús desplegables limpios (≤ 2 botones visibles por tarjeta).
- Flujo profesional para crear/duplicar/vincular sin saturar la UI.
- Promoción/desvinculación de presupuestos sin perder datos ni romper la trazabilidad financiera.
