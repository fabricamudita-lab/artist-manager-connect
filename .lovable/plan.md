
# Sold Out y Progreso de Ventas en Bookings

## Resumen

Agregar dos campos nuevos a la tabla `booking_offers`:
- **is_sold_out** (boolean): checkbox para marcar el evento como Sold Out
- **tickets_sold** (integer): numero de entradas vendidas

Con la capacidad ya existente (`capacidad`), se mostrara automaticamente el progreso de venta en formato "12/450" y porcentaje.

## Cambios necesarios

### 1. Migracion SQL

Agregar dos columnas a `booking_offers`:

```sql
ALTER TABLE booking_offers ADD COLUMN is_sold_out boolean DEFAULT false;
ALTER TABLE booking_offers ADD COLUMN tickets_sold integer;
```

### 2. Modificar `src/components/booking-detail/EditBookingDialog.tsx`

En la pestana "Detalles", junto al campo "Invitaciones", agregar:

- **Checkbox "Sold Out"**: marca el evento como agotado. Al activarlo, se autocompleta `tickets_sold` con el valor de `capacidad` si esta disponible.
- **Campo "Entradas vendidas"**: input numerico para poner cuantas se han vendido (ej: 120).
- **Indicador visual**: si hay `capacidad` y `tickets_sold`, muestra una barra de progreso con el texto "120/350 (34%)" debajo del campo. Si es Sold Out, muestra un badge verde "SOLD OUT".

Agregar `is_sold_out` y `tickets_sold` a la interfaz `BookingOffer` y al `handleSave`.

### 3. Interfaz en la pestana "Detalles"

Despues de "Invitaciones":

```
[x] Sold Out                    Entradas vendidas: [120]
                                120 / 350 (34%) [====------]
```

- Si `is_sold_out` esta marcado, se muestra un badge "SOLD OUT" destacado
- Si hay `capacidad`, se calcula el porcentaje automaticamente
- La barra de progreso usa el componente `Progress` existente

### Archivos modificados
- Migracion SQL (nueva)
- `src/components/booking-detail/EditBookingDialog.tsx` - Agregar campos sold out y tickets vendidos
