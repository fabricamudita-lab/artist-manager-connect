
# Fix: El presupuesto debe generar el cronograma completo automáticamente

## ¿Qué está pasando?

Cuando creas un presupuesto, el sistema intenta crear hitos en el cronograma — pero hay dos problemas:

**Problema 1 — Estructura incompleta:** El presupuesto crea sólo 8 "fechas clave" (Grabación, Mezcla, Masters...) pero todos con `category: 'marketing'`. El cronograma organiza las tareas por flujos (`audio`, `visual`, `contenido`, `fabricacion`, `marketing`) y necesita el campo `metadata.estimatedDays` para mostrarlas correctamente. Sin esa estructura, el cronograma no reconoce los datos y muestra la pantalla vacía.

**Problema 2 — Aprovechamiento nulo de la info del presupuesto:** El presupuesto ya sabe cuántas canciones hay, si hay videoclip, si hay fabricación física, si hay singles... exactamente la misma información que pide el wizard del cronograma. Pero esa información nunca se usa para generar el cronograma completo.

## La solución: Al guardar el presupuesto, generar el cronograma completo

Usar la misma función `generateTimelineFromConfig()` que ya existe (la usa el wizard del cronograma) para generar automáticamente el cronograma completo cuando se crea el presupuesto. Los datos del presupuesto mapean directamente a los parámetros del config:

```
releaseDate       ← el campo "Fecha de lanzamiento digital" del presupuesto
hasVideo          ← si el presupuesto incluye videoclip (nVideoclips > 0)
hasPhysical       ← si el presupuesto incluye fabricación física (fisico === true)
numSongs          ← el campo nTracks del presupuesto
numSingles        ← el número de singles definidos en el presupuesto
physicalDate      ← el campo "Fecha de venta física" del presupuesto
```

### Comportamiento

Si el cronograma ya existe (tiene milestones): **no tocar nada** — respetar el trabajo existente del usuario.

Si el cronograma está vacío: **generarlo completo** — todas las tareas organizadas por flujo, con fechas calculadas a partir de la fecha de lanzamiento, usando la misma lógica del wizard.

### Nuevo mensaje de éxito

Cuando el presupuesto se crea y genera el cronograma automáticamente:
> ✓ Presupuesto creado con 5 categorías
> ✓ Cronograma generado automáticamente (18 tareas en 4 flujos)
> ✓ 2 canciones añadidas en Créditos & Audio

## Cambios técnicos

### `src/components/releases/CreateReleaseBudgetDialog.tsx`

**1. Importar la función de generación de timeline** (ya existe):
```ts
import { generateTimelineFromConfig, groupTasksByWorkflow, type ReleaseConfig } from '@/lib/releaseTimelineTemplates';
```

**2. Reemplazar la sección "4. Sync Milestones" (~líneas 602-646):**

Lógica actual (solo crea 8 milestones simples con `category: 'marketing'`):
```ts
// efectua 'autocalcular' pero con estructura incompleta
await supabase.from('release_milestones').insert({ title, due_date, category: 'marketing' })
```

Nueva lógica:

```ts
// ─── 4. Sync Milestones / Generate Cronograma ─────────────────
let milestonesCreated = 0;

// Check if cronograma already has data
const { data: existingMilestones } = await supabase
  .from('release_milestones')
  .select('id')
  .eq('release_id', release.id)
  .limit(1);

const cronogramaYaExiste = (existingMilestones?.length || 0) > 0;

if (!cronogramaYaExiste && releaseDate) {
  // Build ReleaseConfig from budget data
  const config: ReleaseConfig = {
    releaseDate,
    physicalDate: physicalDate || null,
    numSongs: nTracks || 1,
    numSingles: singles.length,
    hasVideo: nVideoclips > 0,
    hasPhysical: fisico === true,
  };

  // Generate full timeline using the same function as the wizard
  const generatedTasks = generateTimelineFromConfig(config);
  const groupedTasks = groupTasksByWorkflow(generatedTasks);

  // Build milestones in the same format that ReleaseCronograma.tsx expects
  const milestonesToInsert = generatedTasks.map((task, index) => ({
    release_id: release.id,
    title: task.name,
    due_date: format(task.startDate, 'yyyy-MM-dd'),
    status: 'pending',
    category: task.workflowId,          // ← 'audio', 'visual', 'marketing', etc.
    sort_order: index,
    metadata: {
      estimatedDays: task.estimatedDays,  // ← Needed by ReleaseCronograma
      anchoredTo: task.anchoredTo || null,
      customStartDate: null,
      subtasks: null,
      responsible_ref: null,
    },
  }));

  if (milestonesToInsert.length > 0) {
    const { error } = await supabase
      .from('release_milestones')
      .insert(milestonesToInsert as any);
    if (!error) milestonesCreated = milestonesToInsert.length;
  }
}
```

**3. Actualizar el mensaje de éxito** para reflejar la generación del cronograma:
```ts
if (milestonesCreated > 0)
  summaryLines.push(`✓ Cronograma generado automáticamente (${milestonesCreated} tareas)`);
```

### `src/components/releases/CronogramaSetupWizard.tsx`

Sin cambios — el wizard sigue funcionando igual para cuando el usuario quiere regenerar el cronograma manualmente.

### `src/pages/release-sections/ReleaseCronograma.tsx`

Sin cambios — ya sabe leer milestones con `category` = workflow ID y `metadata.estimatedDays`. Al recargar la página después de crear el presupuesto, verá los milestones y mostrará el cronograma completo.

## Resumen de archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/releases/CreateReleaseBudgetDialog.tsx` | Reemplazar la sección "Sync Milestones" (~líneas 602-646) con la generación completa del cronograma usando `generateTimelineFromConfig` |

Sin cambios en base de datos, sin nuevos archivos, sin cambios en el cronograma.
