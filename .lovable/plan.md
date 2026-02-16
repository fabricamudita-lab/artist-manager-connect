
# Confirmar antes de desvincular evento

## Contexto

Actualmente, al pulsar "Desvincular" en un evento vinculado a una hoja de ruta, se ejecuta la accion inmediatamente sin pedir confirmacion. Los bloques (schedule, travel, hospitality, etc.) no se ven afectados porque su informacion esta almacenada en `tour_roadmap_blocks`, independientemente de los eventos vinculados.

## Cambio

En `src/pages/RoadmapDetail.tsx`:

1. Agregar un estado `unlinkingBookingId` para controlar que evento se quiere desvincular.
2. El boton "Desvincular" ya no ejecuta `removeBookingLink` directamente, sino que abre un dialogo de confirmacion guardando el `linkId`.
3. Agregar un `AlertDialog` con:
   - Titulo: "Desvincular evento?"
   - Descripcion: "El evento dejara de estar vinculado a esta hoja de ruta. La informacion de los bloques (horarios, viajes, hospitality, etc.) no se perdera."
   - Boton cancelar y boton confirmar "Desvincular".
4. Al confirmar, se ejecuta `removeBookingLink.mutate(unlinkingBookingId)`.

## Detalle tecnico

- Se reutiliza el patron de `AlertDialog` ya presente en el proyecto (mismo patron que `LinkedResourcesSection.tsx`).
- Solo se modifica `src/pages/RoadmapDetail.tsx`.
