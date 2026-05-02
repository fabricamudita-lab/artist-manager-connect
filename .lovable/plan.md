# Mejoras del módulo de Imprevistos del Booking

Refactor del tab actual de "Gastos de viaje" en el detalle de booking (`BookingExpensesTab.tsx` + tabla `booking_expenses`) para convertirlo en un gestor de imprevistos completo.

## 1. Renombrado del tab

- En `src/pages/BookingDetail.tsx`: cambiar la etiqueta del tab de **"Gastos de viaje"** → **"Imprevistos"** (mantener la key interna para no romper rutas/permisos).
- Quitar el solapamiento visual con el tab "Archivos" añadiendo `gap-1` o `flex-wrap` si hace falta en el `TabsList`.

## 2. Cambios en la base de datos (migración)

Nueva migración que extiende `booking_expenses`:

```sql
ALTER TABLE public.booking_expenses
  ADD COLUMN expense_date DATE,                      -- fecha del gasto
  ADD COLUMN invoice_url TEXT,                       -- adjunto de factura/ticket
  ADD COLUMN invoice_number TEXT,                    -- nº de factura opcional
  ADD COLUMN irpf_percentage NUMERIC(5,2) DEFAULT 0, -- IRPF u otra retención
  ADD COLUMN other_tax_percentage NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN other_tax_label TEXT,                   -- nombre del impuesto extra
  ADD COLUMN split_mode TEXT NOT NULL DEFAULT 'single'
    CHECK (split_mode IN ('single','split')),
  ADD COLUMN split_promoter_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN split_agency_pct   NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN split_artist_pct   NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN pushed_budget_item_id UUID
    REFERENCES public.budget_items(id) ON DELETE SET NULL;

-- Validar que la suma del split sea 100 cuando split_mode='split'
ALTER TABLE public.booking_expenses
  ADD CONSTRAINT booking_expenses_split_sum_chk
  CHECK (
    split_mode = 'single'
    OR (COALESCE(split_promoter_pct,0)
      + COALESCE(split_agency_pct,0)
      + COALESCE(split_artist_pct,0)) = 100
  );

CREATE INDEX IF NOT EXISTS idx_booking_expenses_booking_id
  ON public.booking_expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_expenses_expense_date
  ON public.booking_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_booking_expenses_pushed_budget_item
  ON public.booking_expenses(pushed_budget_item_id);
```

Storage: reutilizar el bucket existente para adjuntos del booking (mismo que ya usa `booking_documents`).

## 3. Categorías sincronizadas con presupuestos

Crear `src/lib/booking/expenseCategories.ts` que reexporte las categorías reales de `budget_items` (las mismas que ya usa el editor de presupuesto: `equipo_artistico`, `equipo_tecnico`, `transporte`, `alojamiento`, `catering`, `produccion`, `marketing`, `comisiones`, `otros`, etc.).

El select de "Categoría" en el diálogo de imprevistos consumirá esa lista única → así un imprevisto siempre encaja en una partida de presupuesto.

## 4. Diálogo "Añadir/Editar Imprevisto" (rediseño)

Campos del nuevo formulario, en orden:

1. **Descripción** *(req.)*
2. **Categoría** — desplegable con categorías de presupuesto.
3. **Fecha del gasto** — `<Input type="date">`, default = fecha del evento.
4. **Importe (€)** + **IVA %** + **IRPF %** + **Otro impuesto** (label + %).
5. **Adjuntar factura/ticket** — botón de upload (PDF/imagen) → `invoice_url` + `invoice_number` opcional.
6. **¿Quién paga?** — toggle:
   - "Un único pagador" → select Promotor / Agencia / Artista (lógica actual).
   - "Dividir entre varios" → 3 inputs de % (Promotor / Agencia / Artista). Validación en vivo: deben sumar 100. Vista previa del importe asignado a cada parte.
7. **Handler (quién gestiona)** — sin cambios.
8. Si la parte del **Artista > 0** → checkbox **"Añadir la parte del artista al presupuesto del evento"**.

Validación con **zod** antes de insertar:

```ts
const schema = z.object({
  description: z.string().trim().min(1).max(200),
  category: z.string().min(1),
  amount: z.number().nonnegative(),
  iva_percentage: z.number().min(0).max(100),
  irpf_percentage: z.number().min(0).max(100),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  split_mode: z.enum(['single','split']),
  split_promoter_pct: z.number().min(0).max(100),
  split_agency_pct: z.number().min(0).max(100),
  split_artist_pct: z.number().min(0).max(100),
}).refine(d => d.split_mode === 'single'
  || d.split_promoter_pct + d.split_agency_pct + d.split_artist_pct === 100,
  { message: 'Los porcentajes deben sumar 100' });
```

## 5. Push al presupuesto del evento

Nueva función helper `pushExpenseToBudget(expense)` en `src/lib/budgets/bookingBudgetActions.ts`:

1. Localiza el budget principal del booking (`budgets.booking_offer_id = bookingId AND is_principal = true`).
2. Calcula `artistAmount = amount * (split_artist_pct/100)` (o `amount` completo si `payer = 'artist'` en modo single).
3. Inserta en `budget_items`:
   - `category` = categoría del imprevisto
   - `subcategory` = `'imprevistos'`
   - `name` = `"[Imprevisto] " + description`
   - `quantity` = 1, `unit_price` = `artistAmount`
   - `iva_percentage` = del imprevisto
   - `observations` = `"Generado desde imprevistos · " + expense_date + (invoice_number ? " · Factura " + invoice_number : "")`
4. Guarda el `id` resultante en `booking_expenses.pushed_budget_item_id` para evitar duplicados y poder sincronizar/desvincular.
5. Si el imprevisto ya estaba pusheado y se edita → `UPDATE` el item existente. Si se elimina el imprevisto → `DELETE` el item correspondiente.

Toast informativo: *"Añadido 120,00 € al presupuesto del evento (categoría Transporte)."*

## 6. Cambios en la tabla / lista

Columnas visibles tras el refactor:

| Fecha | Descripción | Categoría | Importe | IVA | IRPF | Reparto | Factura | Acciones |

- **Reparto**: si `split_mode='single'` muestra badge único; si `split`, muestra mini-chips (`P 60% · A 40%`).
- **Factura**: si `invoice_url`, icono clickable para abrir.
- KPIs superiores actualizados: además de Promotor / Agencia, añadir **A cargo del Artista** (suma de la parte del artista de cada imprevisto).

## 7. Seguridad y arquitectura

- **RLS**: la tabla ya tiene RLS por booking; mantener. Nueva política/uso vía `auth.uid()`.
- **XSS**: todos los textos se renderizan con React (sin `dangerouslySetInnerHTML`).
- **SQL injection**: solo cliente Supabase (sin SQL crudo).
- **Paginación**: la query de imprevistos por booking añade `.range(0, 49)` con `loadMore` (50 por página). Para la mayoría de eventos basta con la primera página.
- **Separación lógica**: toda la lógica de cálculo y push al presupuesto vive en `src/lib/booking/expenses.ts` y `bookingBudgetActions.ts` — el componente solo orquesta UI.

## 8. Compatibilidad con datos existentes

Los registros antiguos quedarán con `split_mode='single'`, `expense_date = created_at::date` (backfill en la migración) y campos de impuestos a 0 — sin romper nada.

## Archivos afectados

- `supabase/migrations/<nuevo>.sql` *(nuevo)*
- `src/lib/booking/expenseCategories.ts` *(nuevo)*
- `src/lib/booking/expenses.ts` *(nuevo — lógica + zod)*
- `src/lib/budgets/bookingBudgetActions.ts` *(añadir `pushExpenseToBudget`)*
- `src/components/booking-detail/BookingExpensesTab.tsx` *(rediseño)*
- `src/components/booking-detail/ExpenseDialog.tsx` *(nuevo — extraído del tab)*
- `src/pages/BookingDetail.tsx` *(label tab + spacing)*
