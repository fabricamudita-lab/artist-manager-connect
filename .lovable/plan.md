

## Editar y Eliminar presupuestos con avisos de seguridad

### Problema
La lista de presupuestos en Finanzas tiene un botón de eliminar pero sin ningún aviso sobre dependencias. No hay opción de editar campos básicos (nombre, fecha, ciudad, estado) sin abrir el diálogo completo.

### Analisis de dependencias de un presupuesto

Un presupuesto (`budgets`) puede estar vinculado a:

| Dependencia | Campo | Impacto al eliminar | Impacto al editar |
|---|---|---|---|
| **Budget Items** (`budget_items`) | `budget_id` | Se borran todas las partidas (cascade manual) | Sin impacto |
| **Retenciones IRPF** (`irpf_retentions`) | `budget_id` + `budget_item_id` | Se borran retenciones fiscales -- peligroso si trimestre cerrado | Sin impacto |
| **Booking** (`booking_offers`) | `budgets.booking_offer_id` | El booking pierde su presupuesto vinculado | Cambiar nombre/fecha no afecta |
| **Proyecto** (`projects`) | `budgets.project_id` | El proyecto pierde el recurso vinculado | Sin impacto |
| **Lanzamiento** (`releases`) | `budgets.release_id` | El lanzamiento pierde su presupuesto | Sin impacto |
| **Cashflow/Pagos** | Items referenciados en vista de pagos | Se pierden registros de pagos pendientes | Sin impacto |

### Peligros identificados

1. **Retenciones IRPF en trimestre cerrado**: Si el presupuesto tiene items con retenciones IRPF registradas en un trimestre ya presentado (Modelo 111), eliminar el presupuesto alteraría las cifras fiscales. Se debe avisar y, si el trimestre está bloqueado, bloquear la eliminación.

2. **Presupuesto vinculado a Booking**: El booking depende del presupuesto para cálculos de beneficio/margen. Eliminar dejará el booking sin datos financieros detallados.

3. **Presupuesto vinculado a Proyecto o Lanzamiento**: El proyecto/lanzamiento mostrará un recurso menos en sus indicadores.

4. **Borrado en cascada manual necesario**: Las FK de `budget_items` e `irpf_retentions` requieren borrado previo para evitar errores de constraint (ya implementado en `BudgetDetailsDialog`).

### Cambios en `FinanzasPresupuestos.tsx`

**1. Ampliar la query de presupuestos**
- Incluir `booking_offer_id`, `project_id`, `release_id`, `type` en la interfaz `Budget` y el `select`.

**2. Edición inline rápida**
- Añadir botón `Pencil` por fila que abra el `BudgetDetailsDialog` existente (ya funciona como editor completo).
- Alternativa: un diálogo ligero para editar solo nombre, ciudad, fecha, estado. Dado que ya existe `BudgetDetailsDialog`, reutilizarlo es más coherente.

**3. Eliminación con análisis de impacto**
- Antes de mostrar el `AlertDialog`, consultar las dependencias del presupuesto:
  - Contar `budget_items` vinculados.
  - Contar `irpf_retentions` vinculadas.
  - Verificar si hay retenciones en trimestres bloqueados (consultar `fiscal_quarters` con `is_locked = true`).
  - Verificar si tiene `booking_offer_id`, `project_id`, `release_id`.
- Mostrar un `AlertDialog` detallado con lista de consecuencias:

```text
¿Eliminar "Presupuesto - CurtCircuit"?

Este presupuesto tiene las siguientes vinculaciones:
  ⚠️ 14 partidas presupuestarias (se eliminarán)
  ⚠️ 8 retenciones IRPF (se eliminarán)
  🔗 Vinculado al booking "CurtCircuit" (perderá su presupuesto)
  🔗 Vinculado al proyecto "PLAYGRXVND" (se desvinculará)
  
  🔴 2 retenciones pertenecen a un trimestre fiscal CERRADO.
     Eliminar este presupuesto alterará las cifras del Modelo 111.

[Cancelar]  [Eliminar igualmente]
```

- Si hay retenciones en trimestre cerrado, el botón de eliminar será rojo con texto extra de advertencia.

**4. Lógica de borrado seguro (`handleDeleteBudget`)**
- Paso 1: Borrar `irpf_retentions` donde `budget_id = id`.
- Paso 2: Borrar `budget_items` donde `budget_id = id`.
- Paso 3: Borrar el `budget` en sí.
- Usar transacción lógica (secuencial con rollback manual si falla).

### Flujo visual

```text
Lista de Presupuestos
─────────────────────────────────────────────────
Nombre              Ciudad   Fecha     Estado   Acciones
Presupuesto - CC    BCN      27/03     ✓        [👁] [✏️] [🗑]

Click 🗑 → Fetch dependencias → AlertDialog con impacto detallado
Click ✏️ → Abre BudgetDetailsDialog (editor completo existente)
```

### Archivos modificados
- `src/components/finanzas/FinanzasPresupuestos.tsx`

