# Duplicar y renombrar presupuestos en Booking

Añadiremos dos acciones a cada tarjeta de presupuesto vinculada en la pestaña **Presupuesto** del detalle de Booking:

1. **Duplicar presupuesto** — clona un presupuesto existente (cabecera + partidas) y lo deja vinculado al mismo booking como punto de partida para uno nuevo.
2. **Editar el nombre inline** — al hacer clic en el nombre del presupuesto se vuelve editable; se guarda al pulsar Enter o al perder el foco (Escape descarta).

## UX

En cada tarjeta de presupuesto vinculado:

- El título (`budget.name`) pasa a ser editable: clic → `Input` → Enter/blur guarda, Esc cancela. Indicador visual sutil al pasar el ratón (icono lápiz).
- Nuevo botón pequeño **"Duplicar"** (icono `Copy`) junto a "Abrir presupuesto completo" / "Principal".
  - Al duplicar:
    - Nombre por defecto: `"<nombre original> (copia)"`.
    - Se queda vinculado al mismo `booking_offer_id`.
    - Nunca se marca como principal (si existe el flag `is_primary_for_booking`, se fuerza `false`).
    - Toast: "Presupuesto duplicado" con opción **Deshacer** (vía `undoableDelete` aplicado al nuevo id).
    - Refresca la query `['booking-budgets', bookingId, projectId]` y abre automáticamente el nuevo presupuesto en el `BudgetDetailsDialog` para empezar a editar.

## Implementación técnica

### Capa de datos (lógica separada de la UI)

Crear `src/lib/budgets/bookingBudgetActions.ts`:

- `renameBudget(budgetId: string, newName: string)`:
  - Validación con **Zod**: `z.string().trim().min(1, 'Requerido').max(120)`.
  - `supabase.from('budgets').update({ name }).eq('id', budgetId)`.
  - Devuelve el registro actualizado.
- `duplicateBudget(sourceBudgetId: string, userId: string)`:
  - Lee la cabecera con `select('*')`.
  - Inserta una nueva fila copiando solo campos no calculados/no generados (excluye `id`, `created_at`, `updated_at`, `is_primary_for_booking`, y cualquier columna generada — ver memoria *database-generated-columns*). El nuevo `created_by = userId`.
  - Lee `budget_items` del original (paginado, `range(0, 999)` por lote hasta agotar) y los inserta en bloque para el nuevo `budget_id`, excluyendo `id`/timestamps.
  - Devuelve el nuevo `budget`.
  - Maneja errores (registro origen no existe, fallo en items → revierte borrando la cabecera nueva).

Toda la lógica vive en este módulo; el componente solo invoca mutaciones (`useMutation`).

### UI — `BookingPresupuestoTab.tsx`

- Añadir estado `editingNameId: string | null` y `nameDraft: string`.
- En el render de cada tarjeta:
  - Reemplazar el `<CardTitle>` por: si `editingNameId === budget.id` mostrar `<Input>` autofocus; si no, el nombre con `onClick` para entrar en modo edición.
  - Botón `Duplicar` (variant outline, size sm, icono `Copy`) junto a los demás.
- Mutaciones:
  - `renameMutation` → llama a `renameBudget`, invalida query, toast.
  - `duplicateMutation` → llama a `duplicateBudget`, invalida query, abre el diálogo del nuevo presupuesto (`setSelectedBudgetForDialog(newBudget)`).

### Validación y seguridad

- **Zod** valida nombre en cliente y antes de la llamada.
- No se concatenan strings en queries (Supabase usa parámetros) → sin riesgo de SQL injection.
- El nombre se renderiza vía React (texto), no `dangerouslySetInnerHTML` → sin XSS.
- Las RLS existentes de `budgets` y `budget_items` ya cubren autorización (no se tocan).

### Esquema de BD

No requiere migración: `budgets.name` ya existe y `budget_items` ya soporta inserción masiva. No se añaden índices nuevos (las consultas siguen filtrando por `booking_offer_id`/`id` que ya están indexados como PK/FK).

## Edge cases cubiertos

- Nombre vacío al guardar → no se guarda, vuelve al valor original con toast de error.
- Duplicar un presupuesto sin partidas → se crea solo la cabecera (sin error).
- Si el origen tiene cientos de partidas → inserción paginada en lotes de 500.
- Si la duplicación de items falla a mitad → se elimina la cabecera nueva para no dejar registros huérfanos.
- El duplicado nunca hereda el flag de "principal" si la columna existe.

## Archivos afectados

- **Nuevo:** `src/lib/budgets/bookingBudgetActions.ts` (lógica + Zod).
- **Editado:** `src/components/booking-detail/BookingPresupuestoTab.tsx` (UI + mutaciones).
