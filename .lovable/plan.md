
# Sincronizar hora del Show con el evento vinculado

## Que hara

Cuando edites la hora de una actividad de tipo **"Show"** en el cronograma de la Hoja de Ruta, y esa hoja de ruta tiene un booking vinculado, el sistema te preguntara:

> "Has cambiado la hora del show a XX:XX. Quieres actualizar tambien la hora del evento vinculado (Festival/Venue)?"

Con dos opciones:
- **Si, actualizar evento** (boton principal)
- **No, solo en la hoja de ruta** (boton secundario)

## Cambios tecnicos

### 1. `src/components/roadmap-blocks/ScheduleBlock.tsx`

- Agregar una nueva prop `onShowTimeChange?: (newTime: string) => void` al interface `ScheduleBlockProps`
- En la funcion `updateItem`, detectar cuando se cambia `startTime` de un item con `activityType === 'show'`
- Cuando se detecta ese caso, guardar el nuevo horario en un estado `pendingSyncTime` y abrir un dialogo de confirmacion
- El dialogo pregunta si desea sincronizar la hora con el evento vinculado
- Si el usuario acepta, se llama a `onShowTimeChange(newTime)`
- Si el usuario rechaza, solo se cierra el dialogo (el cambio local ya se aplico)

### 2. `src/pages/RoadmapDetail.tsx`

- Crear una funcion `handleShowTimeChange(newTime: string)` que actualice la hora del primer booking vinculado via Supabase:
  ```
  supabase.from('booking_offers').update({ hora: newTime }).eq('id', firstBooking.id)
  ```
- Invalidar la query del roadmap para refrescar los datos
- Pasar esta funcion como prop `onShowTimeChange` al `ScheduleBlock` dentro de `renderBlock`

Esto mantiene la logica de persistencia en `RoadmapDetail` (donde ya se gestionan los bookings) y la logica de deteccion/UI en `ScheduleBlock`.
