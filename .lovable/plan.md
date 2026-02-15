
# Fix: Mostrar nombre del contacto en la vista general del booking

## Problema

El campo `contacto` ahora guarda un UUID (porque lo cambiamos al `ContactSelector`), pero `BookingOverviewTab.tsx` sigue buscando el contacto haciendo un `ilike` por nombre/stage_name con ese UUID -- por eso no encuentra nada y muestra el UUID directamente.

## Solucion

Modificar la logica de busqueda en `BookingOverviewTab.tsx` (linea ~85-92):

- Detectar si el valor de `booking.contacto` es un UUID (formato estandar)
- Si es UUID: buscar por `.eq('id', booking.contacto)` 
- Si no es UUID (datos antiguos): mantener la busqueda por nombre como fallback

## Cambio tecnico

### Archivo: `src/components/booking-detail/BookingOverviewTab.tsx`

Reemplazar el bloque de fetch del contacto (lineas 85-92):

```typescript
// Antes:
.or(`name.ilike.%${booking.contacto}%,stage_name.ilike.%${booking.contacto}%`)

// Despues:
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(booking.contacto);
if (isUUID) {
  const { data } = await supabase
    .from('contacts')
    .select('id, name, stage_name')
    .eq('id', booking.contacto)
    .maybeSingle();
  if (data) setContactoContact(data);
} else {
  const { data } = await supabase
    .from('contacts')
    .select('id, name, stage_name')
    .or(`name.ilike.%${booking.contacto}%,stage_name.ilike.%${booking.contacto}%`)
    .limit(1)
    .maybeSingle();
  if (data) setContactoContact(data);
}
```

Tambien se cambia `.single()` a `.maybeSingle()` para evitar errores 406 cuando no hay resultados.
