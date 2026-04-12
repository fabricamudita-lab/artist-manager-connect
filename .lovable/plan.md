

## Plan: Instrumentos dinámicos según tipo de pitch y track seleccionado

### Cambio

Actualmente la sugerencia de instrumentos consulta **todos** los tracks del release. Debe ser contextual:

- **Single**: solo los créditos del track seleccionado (`trackId`)
- **EP / Album**: todos los tracks del release (comportamiento actual)

### Implementación

**Archivo: `src/pages/release-sections/ReleasePitch.tsx`** (~líneas 308-331)

1. Modificar la consulta de `track_credits` en el `useEffect` de sugerencias:
   - Si `pitchType === 'single'` y hay `trackId` → consultar solo `.eq('track_id', trackId)`
   - Si no → consultar `.in('track_id', trackIds)` (todos los tracks, como ahora)

2. Agregar `trackId` y `pitchType` (derivado de `localData.pitch_type`) a las dependencias del `useEffect`

3. Quitar la condición `if (!localData.instruments)` para que al cambiar de track/tipo se recalcule la sugerencia (solo si el usuario no ha editado manualmente el campo — se puede usar un flag o simplemente re-sugerir siempre que cambie el track)

### Un archivo afectado
- `src/pages/release-sections/ReleasePitch.tsx`

