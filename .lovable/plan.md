

## Duplicar presupuesto al duplicar evento de booking

### Problema

Hay dos caminos de duplicación y ambos fallan en duplicar presupuestos correctamente:

1. **`BookingDetail.tsx` → `handleDuplicate`**: Hace un simple INSERT del booking sin tocar presupuestos en absoluto.
2. **`duplicate_booking_deep` (RPC)**: Busca presupuestos por fuzzy match (artist_id + fecha + nombre/venue/city), pero **no busca por `booking_offer_id`** (el vínculo directo). Además, los presupuestos duplicados **no reciben el `booking_offer_id` del nuevo booking**, así que quedan sin vincular.

### Cambios

**1. Migración SQL — Corregir `duplicate_booking_deep`**

Actualizar la función para:
- Buscar presupuestos también por `booking_offer_id = p_booking_id` (vínculo directo), no solo por fuzzy match
- Asignar `booking_offer_id = v_new_booking_id` en los presupuestos duplicados para que queden vinculados al nuevo booking
- Quitar el prefijo "COPIA - " del nombre (el usuario quiere que sea idéntico)

**2. `BookingDetail.tsx` — Usar `duplicate_booking_deep` en vez de insert manual**

Reemplazar `handleDuplicate` para que llame a `supabase.rpc('duplicate_booking_deep', { p_booking_id, p_user_id })`. Esto unifica los dos caminos y asegura que siempre se dupliquen presupuestos, roadmaps, documentos, gastos e itinerario.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Nueva migración SQL | Actualizar `duplicate_booking_deep` para buscar por `booking_offer_id` y vincular presupuestos al nuevo booking |
| `src/pages/BookingDetail.tsx` | Reemplazar insert manual por `supabase.rpc('duplicate_booking_deep')` |

