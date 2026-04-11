

## Cambiar etiqueta "Fee" → "Presupuesto Total" en contexto discográfico

### Problema
En la vista de presupuestos de un lanzamiento (discográfica), las etiquetas dicen "Fee" y "Fee Total", que es terminología de booking/conciertos. Para producción musical debería decir "Presupuesto Total" o "Capital".

### Alcance del cambio
**Solo etiquetas de UI** — el campo en base de datos sigue siendo `fee`. No hay riesgo de romper cálculos, queries ni lógica existente.

### Análisis de riesgos
- **Sin riesgo en DB**: no se toca la columna `fee`, solo texto visible.
- **Sin riesgo en booking**: los cambios son condicionales por tipo de presupuesto o por contexto (release vs booking).
- **Consistencia**: `BudgetDetailsDialog` ya usa etiquetas adaptativas (Caché/Capital Aportado/Capital según `type`). Estamos alineando el resto de la app.

### Cambios por archivo

**1. `src/pages/release-sections/ReleasePresupuestos.tsx`**
- Línea 822: KPI card "Fee Total" → "Presupuesto Total"
- Línea 854: Cabecera de tabla "Fee" → "Presupuesto"
- Línea 896: Celda que muestra el valor — sin cambio (solo muestra `€X`)
- Línea 1126: Diálogo de vincular, texto "Sin fee" → "Sin presupuesto"

**2. `src/components/CreateBudgetDialog.tsx`**
- Línea 513: Label "Fee (€)" → adaptar según tipo seleccionado: si `type === 'concierto'` → "Fee (€)", si no → "Capital / Presupuesto (€)"

**3. `src/components/project-detail/ProjectLinkedBudgets.tsx`**
- El componente ya muestra `€{budget.fee}` sin etiqueta "Fee", así que no necesita cambio.

**4. `src/utils/exportUtils.ts`**
- Línea 78: `Fee: €${budget.fee}` → adaptar label según `budget.type`: "Fee" para concierto, "Presupuesto" para el resto.

### Resumen
4 archivos tocados, solo cambios de texto condicional. Cero impacto en lógica financiera, queries o estructura de datos.

