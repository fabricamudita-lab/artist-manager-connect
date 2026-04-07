

## Unificar el sistema de presupuestos en todos los puntos de acceso

### Problema actual

El mismo presupuesto se muestra de formas distintas según desde dónde se acceda:

- **Drive** ("Presupuestos y Facturas"): solo cuenta archivos subidos, no muestra los presupuestos reales de la tabla `budgets`
- **Booking detail** (pestaña Presupuesto): muestra KPIs y desglose resumido, pero "Abrir presupuesto completo" redirige a `/finanzas` sin contexto
- **Project detail** (pestaña Presupuestos): lista simple con botón "Ver" que abre `BudgetDetailsDialog`
- **ProjectLinkedBudgets** (sidebar del proyecto): al hacer clic redirige a `/finanzas` sin abrir nada concreto
- **Finanzas**: tabla completa con `BudgetDetailsDialog`

### Solución: `BudgetDetailsDialog` como punto de acceso universal

El componente `BudgetDetailsDialog` ya existe y es completo. La estrategia es usarlo consistentemente en todos los puntos de acceso, eliminando las redirecciones ciegas a `/finanzas`.

### Cambios

**1. `ProjectLinkedBudgets.tsx` — Abrir dialog en vez de navegar a /finanzas**

- Importar `BudgetDetailsDialog`
- Añadir estado `selectedBudget` para controlar qué presupuesto se muestra
- Al hacer clic en una tarjeta, `setSelectedBudget(budget)` en vez de `navigate('/finanzas')`
- Renderizar `BudgetDetailsDialog` con el presupuesto seleccionado

**2. `BookingPresupuestoTab.tsx` — Abrir dialog en vez de navegar a /finanzas**

- Importar `BudgetDetailsDialog`
- Añadir estado `selectedBudgetForDialog`
- Cambiar el botón "Abrir presupuesto completo" para abrir el dialog
- Mantener los KPIs como resumen rápido, con el dialog para edición completa

**3. `ProjectDetail.tsx` (pestaña Presupuestos) — Ya usa `BudgetDetailsDialog`**

- Verificar que `setSelectedBudget(budget)` pasa el budget completo (actualmente parece funcionar)
- Sin cambios necesarios si ya abre el dialog correctamente

**4. Drive / Carpetas — Mostrar presupuestos reales en la categoría "Presupuestos y Facturas"**

- En `Carpetas.tsx`, cuando `selectedCategory === 'economia'`, además de los archivos subidos, consultar `budgets` filtrados por `artist_id`
- Mostrar una sección superior con tarjetas de presupuestos reales (similar a como se muestran en el proyecto), cada una abriendo `BudgetDetailsDialog`
- Debajo, los archivos normales de la categoría (facturas, liquidaciones subidas manualmente)

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/project-detail/ProjectLinkedBudgets.tsx` | Abrir `BudgetDetailsDialog` en vez de navegar |
| `src/components/booking-detail/BookingPresupuestoTab.tsx` | Abrir `BudgetDetailsDialog` en vez de navegar |
| `src/pages/Carpetas.tsx` | Añadir sección de presupuestos reales en categoría "economia" |

### Resultado

Da igual desde donde accedas (Drive, Booking, Proyecto, Finanzas): al hacer clic en un presupuesto siempre se abre el mismo `BudgetDetailsDialog` con la información completa y editable.

