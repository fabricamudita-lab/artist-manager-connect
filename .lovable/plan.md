
# Fix: El cronograma debe usar las fechas reales de los singles del presupuesto

## Causa raíz

Cuando el presupuesto crea el cronograma, pasa solo `numSingles: singles.length` a `generateTimelineFromConfig`. Esta función ignora las fechas concretas y calcula los singles a partir de offsets genéricos (ej. "8 semanas antes del release"). Pero el usuario ya ha introducido fechas exactas para cada single — esa información se pierde completamente.

El flujo actual:
```
Singles con fechas reales → generateTimelineFromConfig(numSingles: 2) → offsets genéricos
                                                                       ↓
                                              "Single 1: 8 semanas antes" (ignorando la fecha real)
```

El flujo correcto:
```
Singles con fechas reales → generateTimelineFromConfig({ singles: [{name, date}] }) → fechas exactas
                                                                       ↓
                                              "Single 1: 17 abr 2026" (la fecha del presupuesto)
```

## Cambios necesarios

### 1. `src/lib/releaseTimelineTemplates.ts`

Ampliar la interfaz `ReleaseConfig` para aceptar fechas individuales de singles:

```ts
export interface SingleConfig {
  name?: string;   // Ej: "Single 1" o el título de la canción
  date: Date;      // La fecha exacta de lanzamiento del single
}

export interface ReleaseConfig {
  releaseDate: Date;
  physicalDate?: Date | null;
  numSongs: number;
  numSingles: number;        // Mantener por compatibilidad con el wizard
  hasVideo: boolean;
  hasPhysical: boolean;
  singleDates?: SingleConfig[];  // NUEVO: fechas reales de cada single
}
```

Modificar `generateTimelineFromConfig` para que, cuando se reciban `singleDates`, genere los hitos de single usando las fechas exactas en lugar de los offsets calculados:

```ts
export function generateTimelineFromConfig(config: ReleaseConfig): GeneratedTask[] {
  const { releaseDate, numSingles, singleDates } = config;

  // Si tenemos fechas reales de singles, generamos esas tareas con fecha fija
  // en lugar de calcularlas desde el release date
  const adjustedTemplates = adjustSingleOffsets(TIMELINE_TEMPLATES, numSingles);
  const applicableTemplates = adjustedTemplates.filter(t => taskApplies(t, config));

  const tasks: GeneratedTask[] = applicableTemplates.map((template, idx) => {
    // Detectar si es un single (id: 'mkt-single1', 'mkt-single2', etc.)
    const singleMatch = template.id.match(/^mkt-single(\d+)$/);
    if (singleMatch && singleDates && singleDates.length > 0) {
      const singleIndex = parseInt(singleMatch[1]) - 1;
      const singleConfig = singleDates[singleIndex];
      if (singleConfig?.date) {
        // Usar la fecha exacta del single
        return {
          id: template.id,
          workflowId: template.workflowId,
          name: singleConfig.name 
            ? `Single: ${singleConfig.name}` 
            : template.name,
          startDate: singleConfig.date, // Fecha exacta, no calculada
          estimatedDays: 1,
          status: 'pendiente' as const,
          responsible: '',
          responsible_ref: null,
        };
      }
    }
    // Resto de tareas: cálculo normal por offset
    const deadline = addDays(releaseDate, template.offsetDays);
    const startDate = addDays(deadline, -template.estimatedDays);
    return {
      id: template.id,
      workflowId: template.workflowId,
      name: template.name,
      startDate,
      estimatedDays: template.estimatedDays,
      status: 'pendiente' as const,
      responsible: '',
      responsible_ref: null,
    };
  });

  return tasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
```

### 2. `src/components/releases/CreateReleaseBudgetDialog.tsx`

En la sección "4. Sync Milestones" (~línea 617), pasar las fechas reales de singles al config:

```ts
// ANTES:
const config: ReleaseConfig = {
  releaseDate,
  physicalDate: physicalDate || null,
  numSongs: nTracks || 1,
  numSingles: singles.length,
  hasVideo: nVideoclips > 0,
  hasPhysical: fisico === true,
};

// DESPUÉS:
const config: ReleaseConfig = {
  releaseDate,
  physicalDate: physicalDate || null,
  numSongs: nTracks || 1,
  numSingles: singles.length,
  hasVideo: nVideoclips > 0,
  hasPhysical: fisico === true,
  singleDates: singles
    .filter(s => s.date)
    .map(s => ({
      name: s.title || s.isNew ? s.title : undefined,
      date: s.date!,
    })),
};
```

Con este cambio, si el usuario ha definido "Single 1 · Arbres · 17 abr 2026", el hito en el cronograma se creará con exactamente esa fecha, y el nombre del single incluirá el título de la canción si está disponible.

## Compatibilidad con el Wizard del Cronograma

El wizard de cronograma (`CronogramaSetupWizard.tsx`) llama a `generateTimelineFromConfig` sin `singleDates`, por lo que el nuevo campo es opcional — el comportamiento actual del wizard no cambia en absoluto.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/releaseTimelineTemplates.ts` | Añadir `SingleConfig` y `singleDates` a `ReleaseConfig`; actualizar `generateTimelineFromConfig` para usar fechas exactas cuando están disponibles |
| `src/components/releases/CreateReleaseBudgetDialog.tsx` | Pasar `singleDates` mapeadas desde el array `singles` al llamar a `generateTimelineFromConfig` |

Sin cambios en base de datos, sin nuevos archivos.
