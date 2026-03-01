

## Fix: Remove `amount_net` from cobros insert operations

### Problem
The `cobros` table has `amount_net` as a **generated column** (computed automatically by the database, likely as `amount_gross - irpf`). Three files attempt to insert/upsert a value into this column, causing the error: `"cannot insert a non-DEFAULT value into column 'amount_net'"`.

### Changes

#### 1. `src/components/PagoDialog.tsx`
Remove `amount_net` from all three cobros insert/upsert operations:
- Line ~220: Remove `amount_net: unicoNeto` from the pago unico insert
- Line ~295: Remove `amount_net: anticipoNeto` from the anticipo insert
- Line ~312: Remove `amount_net: liquidacionNeto` from the liquidacion insert

#### 2. `src/components/MarcarCobradoDialog.tsx`
Remove `amount_net: netoRecibido` from the cobros upsert operation (~line 114).

### What stays the same
- All read operations that SELECT `amount_net` remain unchanged (the DB still returns the computed value)
- The IRPF calculation display in the dialog UI stays as-is
- No database migration needed — the generated column already works correctly

### Files to modify
| File | Change |
|------|--------|
| `src/components/PagoDialog.tsx` | Remove `amount_net` from 3 insert calls |
| `src/components/MarcarCobradoDialog.tsx` | Remove `amount_net` from 1 upsert call |

