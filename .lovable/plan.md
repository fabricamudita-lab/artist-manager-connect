# Comisión en Booking: clarificar uso, permitir 0€ y asociar a perfil

## Diagnóstico

Hay tres problemas convergentes en el formulario "Editar Booking → Financiero":

1. **No deja guardar 0€**: el trigger SQL `calculate_booking_commission` recalcula automáticamente la comisión en cada `INSERT/UPDATE` de `booking_offers`:
   - `comision_porcentaje = es_cityzen ? 10 : 5`
   - `comision_euros = fee * comision_porcentaje / 100`
   
   Aunque escribas `0` en el formulario, el trigger lo sobreescribe. Por eso "no se permite" 0€.

2. **Conceptualmente confuso**: hoy estos campos parecen ser "la comisión de management/booking", pero esas ya viven dentro del **presupuesto** (líneas con `commission_percentage` / `is_commission_percentage` en `budget_items`). Por tanto, el campo del booking representa realmente **comisiones EXTRA** puntuales (un finder fee, un agente externo, un porcentaje a otro colaborador, etc.).

3. **Sin perfil asociado**: no hay forma de indicar a quién se paga esa comisión extra, lo que impide trazabilidad en cashflow y liquidaciones.

## Propuesta

### A. Renombrar y rediseñar la sección en EditBookingDialog → tab "Financiero"

Sustituir la fila actual `Comisión (%) | Comisión (€)` por una sub-sección clara:

```text
┌─ Comisión adicional (opcional) ─────────────────────────────┐
│  ℹ Las comisiones de management y agencia ya están          │
│    incluidas en el presupuesto. Usa este campo solo para    │
│    comisiones extra puntuales (finder fee, agente externo). │
│                                                             │
│  Beneficiario          % sobre fee     Importe (€)          │
│  [Selector perfil ▾]   [____]          [____]               │
│                                                             │
│  Concepto (opcional)                                        │
│  [____________________________________________________]     │
└─────────────────────────────────────────────────────────────┘
```

- **Beneficiario**: `Select` con perfiles/contactos (reusar el patrón de `BudgetContactSelector` o el selector de `cashflow-contact-linking`). Opción "Sin asignar".
- **0€ es válido**: el formulario debe distinguir `null` (no informado) de `0` (sin comisión). Aceptar `0` y enviarlo a la BD tal cual.
- **% e Importe se enlazan**: si hay `fee`, al cambiar % se recalcula €, y viceversa. Pero respetando entradas explícitas del usuario.

### B. Cambios en la base de datos (migración)

1. **Eliminar / desactivar el trigger `calculate_booking_commission`** que sobreescribe los valores. Opciones:
   - `DROP TRIGGER` que lo invoque sobre `booking_offers`.
   - Mantener la función pero llamarla solo en `INSERT` cuando ambos campos son `NULL` (auto-sugerencia inicial), nunca en `UPDATE`.
   
   Recomendación: opción 2, así sigue precargando un valor sugerido al crear, pero respeta cualquier edición posterior (incluido `0`).

2. **Añadir columnas a `booking_offers`**:
   - `comision_beneficiario_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL`
   - `comision_beneficiario_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL`
   - `comision_concepto text`
   - Solo uno de los dos `*_id` puede estar relleno (`CHECK` constraint).
   - Índice en `comision_beneficiario_profile_id` y `comision_beneficiario_contact_id` (consultas por beneficiario).

3. **No tocar** `comision_porcentaje` / `comision_euros`: ya existen y siguen sirviendo para el importe. Asegurar que aceptan `0`.

### C. Cambios en frontend

- **`EditBookingDialog.tsx`** (sección Financiero, líneas ~731-748):
  - Reemplazar la fila por el bloque descrito en A.
  - Banner informativo (`Alert` con `Info` icon) explicando que management/agencia van en el presupuesto.
  - Inputs numéricos: tratar `''` como `null`, `0` como `0` (no convertir 0 a null).
  - Nuevo selector de beneficiario (Profile o Contact).

- **Visualización en BookingDetail (Quick Stats card "Comisión")**:
  - Si `comision_euros == null && comision_porcentaje == null` → mostrar "—" (sin comisión extra).
  - Si `comision_euros == 0` → mostrar "Sin comisión" en verde claro.
  - Si > 0 → mostrar importe + nombre del beneficiario abajo en pequeño.

- **`BookingCard.tsx`** (línea 200): cambiar el fallback `|| 5` por `?? '—'` para no inventar 5% cuando no hay dato.

- **`useBookingCalendarSync` / cashflow** (futuro, fuera de scope inmediato): cuando se marque el booking como cobrado, esa comisión extra puede generar un movimiento de salida hacia el beneficiario. Por ahora solo dejamos el dato registrado.

## Resumen del cambio de modelo mental

| Concepto                          | Dónde vive                                   |
|-----------------------------------|----------------------------------------------|
| Caché del artista                 | `booking_offers.fee`                         |
| Comisión management / agencia     | Presupuesto (`budget_items` con `is_commission_percentage`) |
| **Comisión extra puntual**        | `booking_offers.comision_*` + nuevo beneficiario |
| Gastos producción / equipo        | Presupuesto + `booking_expenses`             |

## Detalles técnicos

- Migración: `DROP TRIGGER IF EXISTS <nombre> ON booking_offers;` (necesito verificar el nombre exacto del trigger leyendo `pg_trigger`); recrearlo solo `BEFORE INSERT WHEN (NEW.comision_porcentaje IS NULL AND NEW.comision_euros IS NULL)`.
- Columnas nuevas con `DEFAULT NULL`, sin `NOT NULL`.
- `CHECK ((comision_beneficiario_profile_id IS NULL) OR (comision_beneficiario_contact_id IS NULL))`.
- `useQuery` para resolver el nombre del beneficiario en la card (reusar `identity-resolution-logic`).
- Memoria a actualizar: `mem://booking/module-architecture` (clarificar el rol de `comision_*` como "extra opcional") y crear `mem://finanzas/booking-extra-commission` describiendo el modelo.

## Lo que NO cambia
- El cálculo existente de comisiones de management/agencia dentro de presupuestos.
- Los flujos de cobros/pagos del módulo Finanzas.
- La estructura de `booking_offers.fee`.
