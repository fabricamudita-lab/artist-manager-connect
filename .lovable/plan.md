
# Fix: Duplicar desde menu contextual no funciona

## Problema

Al duplicar una oferta desde el menu contextual del Kanban, el error es:

```
Could not find the 'availability_status' column of 'booking_offers' in the schema cache
```

El campo `availability_status` se agrega en el cliente (no existe en la base de datos). Al hacer spread del objeto para duplicarlo, ese campo se incluye en el INSERT y Supabase lo rechaza.

La barra inferior (BulkActionsBar) funciona porque hace un `select('*')` fresco desde la base de datos, que solo trae columnas reales.

## Solucion

En `src/components/BookingKanban.tsx`, en la funcion `duplicateOffer` (linea ~525), agregar `availability_status` a la lista de campos que se excluyen antes de insertar:

```ts
// Antes (falla):
const { id, created_at, updated_at, artist, ...offerData } = originalOffer as any;

// Despues (corregido):
const { id, created_at, updated_at, artist, availability_status, ...offerData } = originalOffer as any;
```

Es un cambio de una sola linea.
