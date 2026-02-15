
# Mostrar los formatos del artista en el editor de booking

## Problema

El editor de eventos de booking (`EditBookingDialog`) usa una lista estatica de formatos (Solista, Duo, Trio, etc.) en lugar de mostrar los formatos configurados para el artista seleccionado (como "PLAYGRXVND" que has configurado para Klaus Stroink).

## Solucion

Modificar el selector de "Formato" en `EditBookingDialog` para que:

1. Cuando hay un artista seleccionado (`artist_id`), cargue sus `booking_products` desde la base de datos
2. Muestre esos formatos del artista como opciones prioritarias
3. Mantenga los formatos genericos como opciones adicionales por si no hay formatos del artista o se quiere usar uno generico

## Cambios tecnicos

### Archivo: `src/components/booking-detail/EditBookingDialog.tsx`

1. Agregar un `useEffect` que, cuando cambia `formData.artist_id`, consulte `booking_products` del artista:
   ```sql
   SELECT name FROM booking_products WHERE artist_id = ? AND is_active = true
   ```

2. Guardar los formatos del artista en un estado local (`artistFormats`)

3. Modificar el `Select` de formato para mostrar dos grupos:
   - **Formatos del artista** (si existen): los nombres de sus `booking_products`
   - **Formatos generales**: la lista estatica actual como fallback

4. Si el artista tiene formatos configurados, se mostraran primero con una etiqueta de grupo para distinguirlos

### Resultado esperado

Al editar un booking de PLAYGRXVND/Klaus Stroink, el dropdown de formato mostrara "PLAYGRXVND" (y cualquier otro formato configurado) ademas de los formatos generales.
