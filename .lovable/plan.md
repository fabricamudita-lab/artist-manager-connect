

## Wizard de Cronograma Enriquecido con Vinculacion de Singles a Tracks

### Objetivo
Transformar el wizard actual (que solo tiene 6 campos basicos) en un formulario multi-paso mas completo que permita configurar informacion adicional opcional y, crucialmente, vincular cada single a una cancion existente del release (tabla `tracks`).

### Arquitectura: Wizard Multi-Paso

El dialog pasara de un formulario plano a un wizard con **3 pasos** navegables con botones Anterior/Siguiente:

**Paso 1 - Fechas y Formato** (lo que ya existe)
- Fecha de Lanzamiento Digital (obligatorio)
- Fecha de Venta Fisica (opcional)
- Fabricacion fisica toggle
- Incluir videoclip toggle

**Paso 2 - Canciones y Singles**
- Numero de canciones (selector actual)
- Numero de singles (selector actual)
- **Nuevo**: Por cada single seleccionado, mostrar una fila donde el usuario puede:
  - Vincular el single a una cancion existente del release (combobox con los tracks cargados via `useTracks`)
  - O escribir un nombre libre si la cancion aun no existe en el tracklist
  - Opcionalmente asignar una fecha especifica para ese single (date picker inline)
- Se pre-populan los nombres de los tracks existentes en el combobox

**Paso 3 - Opciones Adicionales** (todo opcional)
- Distribuidor (input texto, ej: "DistroKid", "TuneCore", "The Orchard")
- Sello discografico (input texto)
- Territorio principal (select: Mundial, Espana, LATAM, USA, Europa)
- Prioridad de pitching editorial (toggle: si/no, genera una tarea extra de pitching con mas margen)
- Notas adicionales para el cronograma (textarea)

### Cambios en la interfaz `ReleaseConfig`

Ampliar el tipo en `releaseTimelineTemplates.ts`:

```text
interface ReleaseConfig {
  releaseDate: Date;
  physicalDate?: Date | null;
  numSongs: number;
  numSingles: number;
  hasVideo: boolean;
  hasPhysical: boolean;
  singleDates?: SingleConfig[];    // ya existe
  // Nuevos campos opcionales:
  distributor?: string;
  label?: string;
  territory?: string;
  priorityPitching?: boolean;
  notes?: string;
}

interface SingleConfig {
  name?: string;
  date: Date;
  trackId?: string;   // NUEVO: vinculo al track existente
}
```

### Vinculacion Singles a Tracks

- El wizard recibira una nueva prop `tracks` con los tracks del release (ya se cargan con `useTracks` en ReleaseCronograma)
- En el paso 2, al seleccionar N singles, aparecen N filas con un combobox que lista los tracks disponibles
- Al seleccionar un track, se usa su titulo como nombre del single y se guarda el `trackId`
- Si el track tiene ISRC, se muestra como referencia visual
- La vinculacion fluye hasta `generateTimelineFromConfig` que ya soporta `singleDates[].name`

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/releases/CronogramaSetupWizard.tsx` | Refactorizar en wizard de 3 pasos con estado por paso, anadir combobox de tracks para singles, campos opcionales |
| `src/lib/releaseTimelineTemplates.ts` | Ampliar `ReleaseConfig` y `SingleConfig` con campos opcionales (`distributor`, `label`, `territory`, `trackId`) |
| `src/pages/release-sections/ReleaseCronograma.tsx` | Pasar `tracks` como prop al wizard (2 instancias) |

### Detalles de UI

- El dialog crece a `sm:max-w-2xl` para acomodar el contenido adicional
- Indicador de pasos en la parte superior (3 circulos con lineas, paso activo resaltado)
- Boton "Anterior" aparece desde el paso 2
- Boton "Generar Cronograma" solo aparece en el paso 3
- Cada paso tiene scroll independiente con `max-h-[60vh] overflow-y-auto`
- Los campos opcionales del paso 3 usan un estilo mas sutil (labels en `text-muted-foreground`) para que quede claro que son opcionales

### Lo que NO cambia
- La logica de generacion de tareas (`generateTimelineFromConfig`, `taskApplies`, etc.) no se modifica en su nucleo
- Los IDs de tareas, `estimatedDays`, y el orden de workflows se mantienen
- `handleGenerateFromWizard` sigue funcionando igual, solo recibe un `ReleaseConfig` con mas campos opcionales
