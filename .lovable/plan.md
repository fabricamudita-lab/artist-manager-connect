## Más detalle en los hitos del cronograma desde el calendario

El popover actual solo muestra estado, categoría, lanzamiento y responsable. Voy a enriquecerlo con todo lo que ya guardamos en `release_milestones` y derivar el "periodo" de la fase.

### Datos a mostrar
- **Inicio / fin / duración** del propio hito (de `metadata.customStartDate` + `metadata.estimatedDays`).
- **Periodo de la fase** (categoría): rango min/max de fechas de los hitos de la misma `category` y mismo `release_id`, p.ej. *"Fase Audio: 7 feb → 19 mar (5 hitos)"*.
- **Anclaje** (`metadata.anchoredTo`) si lo hay → "anclado a release / a otro hito".
- **Subtareas** (`metadata.subtasks`) → contador "X de Y completadas" + lista colapsable.
- **Cuenta atrás al lanzamiento**: días hasta `release.release_date` (negativos si ya pasó), con resaltado si está retrasado vs. estado.
- **Notas** (`notes`) si existen.

### Cambios técnicos
- `src/hooks/useCalendarReleases.ts`:
  - Ampliar `select` con `notes, metadata`.
  - Traer `release.release_date` en el join por release.
  - Calcular `phase_start / phase_end / phase_count` por `(release_id, category)` y exponerlo en cada `CalendarMilestone`.
- `src/components/calendar/MilestoneDayPopover.tsx`:
  - Sección "Detalles" con fechas + duración.
  - Sección "Fase" con rango y nº de hitos.
  - Sección "Subtareas" con `Checkbox` (solo lectura, sin persistir desde el calendario — el detalle sigue editándose en el cronograma).
  - "Faltan N días para el lanzamiento".
  - Mantener el botón "Ver cronograma" anclando al hito (`?milestone=ID`).

Sin migraciones BD ni nuevos índices: todos los datos ya existen en la tabla. No hay riesgos de XSS/SQLi (renderizado React, queries parametrizadas).