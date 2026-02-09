
# Fix: Navegacion desde el Dashboard de Perfiles

## Problema

La ruta de bookings en el Dashboard usa `/bookings/${item.id}` (plural) pero la ruta real definida en App.tsx es `/booking/${item.id}` (singular). Por eso al hacer clic en la flecha no navega correctamente.

## Solucion

Corregir las 2 instancias de `/bookings/` a `/booking/` en `src/components/ContactDashboardDialog.tsx`:

- **Linea 319** (tab "Todo"): `/bookings/${item.id}` a `/booking/${item.id}`
- **Linea 425** (tab "Bookings"): `/bookings/${item.id}` a `/booking/${item.id}`

## Archivo a modificar

- `src/components/ContactDashboardDialog.tsx`
