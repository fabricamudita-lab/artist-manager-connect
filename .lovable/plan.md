

## Unificar terminología del campo "fee" según tipo de presupuesto

### Problema
El mismo campo aparece como "Presupuesto Total" (vista release), "CAPITAL" (diálogo detalle) y "Caché (Ingresos)" (PDF/CSV). Debe ser consistente.

### Decisión de nomenclatura

Creo un helper centralizado `getCapitalLabel(type)` que devuelve:

| `budget.type` | Label principal | Subtítulo KPI | En resumen financiero |
|---|---|---|---|
| `concierto` | **Caché** | "Fee del promotor" | "Caché (Ingresos)" |
| Cualquier otro | **Capital** | "Presupuesto total" | "Capital (Presupuesto)" |

**Por qué "Capital"**: es el término más neutro y escalable. Funciona para producción musical, videoclip, campaña, y cualquier tipo futuro. "Presupuesto Total" es demasiado largo para KPIs y se confunde con el nombre del propio presupuesto. "Capital Aportado" es demasiado específico (implica un aportante).

### Cambios por archivo

**1. `src/components/BudgetDetailsDialog.tsx`** (~6 puntos)
- Línea ~628: toast → usar helper en vez de triple ternario
- Línea ~3230: header editable → `isConcert ? 'Caché:' : 'Capital:'` (eliminar caso `Capital Aportado`)
- Línea ~3349: KPI concierto → sin cambio (ya dice "CACHÉ")
- Línea ~3396: KPI no-concierto → sin cambio (ya dice "CAPITAL")
- Línea ~2298: PDF export → condicional: `isConcert ? 'Caché (Ingresos)' : 'Capital (Presupuesto)'`
- Línea ~2675: CSV export → mismo condicional

**2. `src/pages/release-sections/ReleasePresupuestos.tsx`**
- Línea ~822: "Presupuesto Total" → "Capital"

**3. `src/components/CreateBudgetDialog.tsx`**
- Línea ~513: "Capital / Presupuesto (€)" → `concierto ? 'Caché / Fee (€)' : 'Capital (€)'`

**4. `src/utils/exportUtils.ts`**
- Línea ~78: ya usa condicional, ajustar a "Capital" en vez de "Presupuesto"

**5. `src/components/booking-detail/BookingPresupuestoTab.tsx`**
- Línea ~228: KPI "Capital" → sin cambio (ya correcto para booking context donde siempre es concierto)

### Resumen
Helper centralizado + 4 archivos con cambios de texto. Sin impacto en lógica, DB ni cálculos. Escalable a nuevos tipos.

