## Problema

Al abrir el dashboard de un perfil tipo **Management/Artista** (ej. "Demo Artist Profile") desde Equipos, la pestaña **Presupuestos** sale vacía aunque el artista vinculado (Klaus Stroink) tenga 4 presupuestos.

## Causa raíz

`ContactDashboardDialog` solo carga `budget_items` filtrados por `contact_id` (líneas de presupuesto donde la persona aparece como proveedor/asistente). Nunca carga los **presupuestos completos del artista** (`budgets.artist_id`).

Para perfiles con `artistId` vinculado (managers, miembros del roster, artistas), el usuario espera ver los presupuestos del propio artista, no únicamente las partidas donde figura como proveedor.

## Solución

Ampliar la carga de datos en `ContactDashboardDialog.tsx`:

1. Añadir una nueva consulta paralela: cuando hay `artistIds`, cargar `budgets` con `select('id, name, type, fee, show_status, budget_status, event_date, city, venue, artist_id, formato, expense_budget, internal_notes, created_at')` filtrado por `.in('artist_id', artistIds)`.
2. Añadir `budgets: any[]` al estado `DashboardData`.
3. En la pestaña **Presupuestos** del dialog, mostrar **dos secciones**:
   - **Presupuestos del artista** (los `budgets` cargados nuevos) — lista clickable que abre `BudgetDetailsDialog` (mismo patrón que `DriveBudgetsSection`).
   - **Partidas como proveedor** (los `budget_items` actuales) — se mantiene tal cual para contactos.
4. Actualizar `tabCounts.presupuestos` para sumar `budgets.length + budgetItems.length`.
5. En la pestaña "Resumen", añadir una `Section` extra para los presupuestos del artista cuando existan.

## Detalles técnicos

- Reusar `BudgetDetailsDialog` (ya usado en `DriveBudgetsSection` y `ProjectLinkedBudgets`) para el click en cada presupuesto, evitando navegar fuera y manteniendo coherencia con el resto de la app (memoria `mem://finanzas/budget-access-unification`).
- Mantener el comportamiento actual para perfiles que son **solo contactos** sin `artistId` (no se cargan budgets de artista, evitando ruido).
- Si hay varios perfiles seleccionados con distintos `artistId`, mostrar todos los presupuestos agregados (ya soportado por `.in('artist_id', artistIds)`).

## Archivos a modificar

- `src/components/ContactDashboardDialog.tsx` — nueva query, nuevo estado, render con `BudgetDetailsDialog`.

No se requieren cambios de base de datos ni RLS.