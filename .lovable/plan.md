## Simplificar la doble confirmación de borrado

Cambiar el requisito de tipear el nombre exacto del presupuesto por una palabra fija y predecible: **`CONFIRMAR`**.

### Cambios en `src/components/booking-detail/DeleteBudgetDialog.tsx`

1. Reemplazar la lógica de match:
   - Antes: `confirmText.trim() === budgetName.trim()`
   - Después: `confirmText.trim().toUpperCase() === 'CONFIRMAR'`

2. Actualizar el bloque de confirmación:
   - Label: `Para confirmar, escribe CONFIRMAR:`
   - Input `placeholder="CONFIRMAR"`
   - Mantener `autoComplete="off"` y disabled durante mutación.

3. Sin cambios en la lógica de impacto, bloqueos por partidas pagadas, ni en `bookingBudgetActions.ts`.

### Resultado

El usuario siempre escribe la misma palabra (`CONFIRMAR`) sin importar el nombre del presupuesto, evitando fricción con nombres largos o con caracteres especiales, manteniendo la doble confirmación intencional.