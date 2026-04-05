

## Fix: Permitir comisión al 0% en Editar Booking

### Problema

En `EditBookingDialog.tsx` (línea 674-675), el código usa `|| ''` y `|| null` que tratan el valor `0` como falsy:

```js
value={formData.comision_porcentaje || ''}  // 0 se muestra como vacío
onChange={(e) => updateField('comision_porcentaje', parseFloat(e.target.value) || null)}  // 0 se guarda como null
```

### Solución

**Archivo: `src/components/booking-detail/EditBookingDialog.tsx`**

1. Cambiar el `value` para que respete el `0`:
   - `value={formData.comision_porcentaje ?? ''}` (usa nullish coalescing)

2. Cambiar el `onChange` para que acepte `0`:
   - `parseFloat(e.target.value)` → si es `NaN`, guardar `null`; si es `0`, guardar `0`

3. Aplicar el mismo fix al campo `comision_euros` (líneas 682-683) que tiene el mismo bug.

4. Revisar y aplicar el mismo patrón a cualquier otro campo numérico en el mismo formulario que use `|| ''` o `|| null` (fee, pvp, gastos_estimados) para consistencia.

Un solo archivo, cambio de operador en 4-6 campos numéricos.

