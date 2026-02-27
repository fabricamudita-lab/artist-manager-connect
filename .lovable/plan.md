

## Crear canciones nuevas desde el Wizard de Cronograma

### Problema
Actualmente el combobox de "Vincular a cancion" solo muestra tracks existentes. Si el usuario escribe un nombre libre, no se crea nada en la base de datos -- el nombre queda como texto suelto sin vinculacion real con autoria, presupuestos ni creditos.

### Solucion
Anadir una opcion "+ Crear cancion" en el combobox que inserte el track en la tabla `tracks` de la base de datos y actualice la lista local en tiempo real. Asi la cancion queda disponible inmediatamente en autoria, presupuestos y creditos.

### Cambios

**1. `src/components/releases/CronogramaSetupWizard.tsx`**

- Anadir nueva prop `releaseId: string` al componente
- En `SingleRowEditor`, anadir un estado `isCreating` y un campo inline para crear un track nuevo
- En el `CommandEmpty` (cuando no hay resultados), mostrar un boton "+ Crear [nombre escrito]" que:
  1. Inserte el track en la tabla `tracks` con `release_id`, `title` y el siguiente `track_number`
  2. Al completar, llame a un callback `onTrackCreated` que actualice la lista de tracks del wizard
  3. Seleccione automaticamente el track recien creado en la fila del single
- El boton de crear mostrara un spinner mientras inserta

**2. Props y callbacks**

- Anadir prop `onTrackCreated?: (track: TrackOption) => void` para notificar al padre que se creo un track nuevo
- El padre (`ReleaseCronograma.tsx`) invalidara la query de tracks para que se actualice globalmente

**3. `src/pages/release-sections/ReleaseCronograma.tsx`**

- Pasar `releaseId` (el `id` del release) como nueva prop al wizard
- Anadir callback `onTrackCreated` que invalide `queryClient.invalidateQueries({ queryKey: ['tracks', id] })` para sincronizar con autoria, creditos y presupuestos
- Actualizar ambas instancias del wizard (lineas ~2120 y ~2411)

### Flujo del usuario

1. El usuario abre el wizard de cronograma, paso 2
2. Selecciona que quiere 2 singles
3. En la fila del single 1, abre el combobox y escribe "Mi Nueva Cancion"
4. Como no existe, aparece: `+ Crear "Mi Nueva Cancion"`
5. Hace clic -> se inserta en `tracks` con el siguiente `track_number`
6. El track aparece seleccionado automaticamente en la fila
7. La cancion ya esta disponible en Creditos, Autoria y Presupuestos del release

### Detalle tecnico de la insercion

```text
supabase.from('tracks').insert({
  release_id: releaseId,
  title: nombre,
  track_number: tracks.length + 1
}).select().single()
```

Se usa `supabase` directamente dentro del componente (patron ya usado en `ReleaseCreditos.tsx` con `createTrack`). Se importa el cliente desde `@/integrations/supabase/client`.

### Lo que NO cambia
- La logica de generacion de cronograma
- Los campos existentes del wizard
- La estructura de la tabla `tracks`
- Los IDs ni el orden de tareas

