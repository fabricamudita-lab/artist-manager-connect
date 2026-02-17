
# Fix: Estado de Facturacion debe ser "Pendiente" por defecto

## Problema

El campo "Estado Facturacion" aparece vacio en el dialogo de edicion cuando un booking no tiene valor asignado (registros antiguos con `null`). Aunque la base de datos tiene `DEFAULT 'pendiente'`, los bookings creados antes de esa migracion pueden tener `null`.

## Solucion

Cambiar la logica en `src/components/booking-detail/EditBookingDialog.tsx` para que cuando `estado_facturacion` sea `null` o vacio, se muestre y use `'pendiente'` como valor por defecto.

## Detalle tecnico

**Archivo**: `src/components/booking-detail/EditBookingDialog.tsx` (linea ~683)

Cambiar:
```ts
value={formData.estado_facturacion || ''}
```
Por:
```ts
value={formData.estado_facturacion || 'pendiente'}
```

Es un cambio de una sola linea. No requiere migracion de base de datos ya que el DEFAULT ya existe en la columna.
