
# Integrar deadlines del presupuesto con el cronograma existente

## Contexto

Actualmente, el formulario de presupuesto (`CreateReleaseBudgetDialog`) tiene un toggle "Auto-calcular deadlines desde fecha principal" que calcula 5 deadlines fijos (Masters, Arte, Pitch DSP, Anuncio, Pre Save) usando offsets simples. Estos deadlines son solo informativos y se guardan en el metadata del presupuesto, sin relacion con los milestones reales del cronograma (`release_milestones`).

El problema es que si ya existe un cronograma con fechas reales (posiblemente ajustadas manualmente), el presupuesto ignora esa informacion y muestra deadlines genericos que pueden contradecir lo real.

## Solucion

Al abrir el paso "Fechas" del wizard de presupuesto:

1. **Consultar milestones existentes** de `release_milestones` para ese `release_id`
2. **Si existen milestones**, mostrar una seccion comparativa con tres opciones:
   - **Usar fechas del cronograma**: toma las fechas reales del cronograma existente como referencia para el presupuesto
   - **Recalcular desde fecha de lanzamiento**: ignora el cronograma y calcula deadlines genericos (comportamiento actual)
   - **Mezclar**: usa las fechas del cronograma donde haya coincidencia, y rellena con auto-calculo donde no haya
3. **Si no existen milestones**, mantener el comportamiento actual (toggle auto-calcular)

Ademas, los deadlines mostrados se ampliaran para cubrir las mismas categorias que el cronograma (audio, visual, contenido, marketing, fabricacion) en vez de solo 5 offsets fijos.

## Cambios tecnicos

### Archivo: `src/components/releases/CreateReleaseBudgetDialog.tsx`

**1. Nuevo fetch de milestones al abrir:**
- Cuando el dialog se abre con un `release`, hacer query a `release_milestones` filtrado por `release_id`
- Almacenar en estado `existingMilestones: ReleaseMilestone[]`
- Determinar `hasCronograma: boolean` basado en si hay milestones

**2. Nuevo estado para la estrategia de deadlines:**
```
deadlineStrategy: 'cronograma' | 'autocalcular' | 'mezclar'
```
- Default: `'cronograma'` si hay milestones, `'autocalcular'` si no hay

**3. Nueva UI en el paso "Fechas":**
- Si `hasCronograma = true`:
  - Mostrar 3 botones/cards de seleccion de estrategia (como el dialog de regenerar del cronograma)
  - Mostrar tabla comparativa con columnas: Hito | Fecha cronograma | Fecha calculada | Fecha seleccionada
  - Los mapeos entre milestones y deadlines se hacen por nombre/categoria (ej: milestone "Mastering" en categoria "audio" = deadline "Masters")
- Si `hasCronograma = false`:
  - Mantener el toggle actual de auto-calcular

**4. Calculo de deadlines mejorado:**
- Ampliar `deadlineOffsets` para cubrir mas hitos (alineados con las tareas del cronograma):
  - Grabacion (-70d), Mezcla (-55d), Mastering (-45d), Artwork (-42d), Entrega Distribuidora (-42d), Pre-save (-28d), Pitch DSP (-28d), Anuncio (-14d), Salida Digital (0d)
- Cuando la estrategia es "cronograma", usar `due_date` de los milestones existentes
- Cuando es "mezclar", priorizar milestone existente y rellenar huecos con calculo

**5. Datos guardados en metadata:**
- Agregar `deadline_strategy: string` al metadata
- Agregar `deadlines: { name, date, source: 'cronograma' | 'calculado' }[]` con la lista completa de deadlines y su origen

### Mapeo milestones <-> deadlines

La correspondencia se hace por `title` del milestone (que coincide con los nombres de `releaseTimelineTemplates`):

```text
Milestone title        -> Deadline name
"Mastering"            -> Masters
"Artwork Final"        -> Arte
"Entrega a Distribuidora" -> Entrega DSP
"Pre-save Activo"      -> Pre Save
"Focus Track / Anuncios" -> Anuncio
"Salida Digital"       -> Salida
"Grabación"            -> Grabacion
"Mezcla"               -> Mezcla
```

### Sin cambios en base de datos

Todo se lee de `release_milestones` (ya existe) y se guarda en `metadata` JSONB del presupuesto.
