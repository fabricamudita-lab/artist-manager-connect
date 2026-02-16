
# Auto-poblar venues en Produccion Tecnica desde bookings vinculados

## Problema

El bloque de Produccion Tecnica muestra "No hay venues configurados" aunque la hoja de ruta tiene eventos vinculados con informacion de lugar y ciudad.

## Solucion

Cuando el bloque de produccion se renderiza con `venues: []` (vacio) y hay bookings vinculados, auto-crear un venue por cada booking vinculado usando su `lugar` y `ciudad`.

## Cambios tecnicos

### 1. `src/pages/RoadmapDetail.tsx` (linea 317-318)

Pasar `linkedBookings` como prop al `ProductionBlock`:

```tsx
case 'production':
  return <ProductionBlock {...props} linkedBookings={allLinkedBookings} />;
```

Donde `allLinkedBookings` combina los bookings del junction table con el legacy booking.

### 2. `src/components/roadmap-blocks/ProductionBlock.tsx`

- Agregar prop `linkedBookings?: Array<{ id: string; lugar: string | null; ciudad: string | null }>`.
- En un `useEffect`, si `localVenues` esta vacio y hay `linkedBookings`, generar automaticamente un venue por cada booking con `venueName` = `lugar + " - " + ciudad` (o solo el que tenga valor).
- Esto solo ocurre una vez (cuando venues esta vacio). Despues el usuario puede editarlos libremente.
