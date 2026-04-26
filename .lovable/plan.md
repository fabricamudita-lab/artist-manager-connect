
## Diagnóstico

Tras revisar `ProjectDetail.tsx`, `ProjectPulseTab.tsx` y `ProjectChecklistManager.tsx`, encontré la causa raíz:

**El array `tasks` del proyecto está hardcoded** (7 tareas seed en líneas 207-280 de `ProjectDetail.tsx`). Eso explica todo lo que ves en tu captura:
- "Checklist 6" → 6 de las 7 tareas seed no completadas
- "1 tarea urgente", "1 bloqueada", "72% salud" → calculados sobre los seeds
- "Próximas acciones URGENTE 28 feb" → tarea seed #2

Pero `ProjectChecklistManager` (la pestaña Checklist) lee de la tabla **real** `project_checklists` / `project_checklist_items`, que para este proyecto está **vacía**. Por eso ves estado vacío "No hay checklists".

**Finanzas** usa `budgets` reales pero ignora cobros, gastos efectivos y pagos. **Notas** es un placeholder con texto "Próximamente". El bloque "Cobrado vs pendiente: 50%" en Pulso también está hardcoded.

## Plan

### 1. Unificar tareas: Pulso y badges leen de la tabla real

- Eliminar el array `tasks` seed en `ProjectDetail.tsx` (líneas 191-280).
- Cargar tareas reales desde `project_checklist_items` filtradas por los `project_checklists` del proyecto en un nuevo `useEffect`.
- Mapear los campos al shape que esperan Pulso y los badges:
  - `estado` ← derivado de `status` (`PENDING/IN_PROGRESS` → `pendiente`, `BLOCKED` → `bloqueada`, `COMPLETED` → `completada`, etc.)
  - `is_urgent` ← derivado de `priority === 'URGENT'` o flag equivalente
  - `fecha_vencimiento` ← `due_date`
  - `titulo` ← `title`
- Resultado: si el proyecto no tiene checklists, los KPIs de Pulso muestran 0 tareas reales (no datos falsos), y al crear una checklist en la pestaña Checklist, todo se actualiza automáticamente.

### 2. Pulso: completar datos económicos reales

- Reemplazar el "Cobrado vs pendiente: 50%" hardcoded por cálculo real:
  - Total facturado / cobrado desde `cobros` vinculados a los `budgets` del proyecto.
  - Mostrar `cobrado / confirmado` como porcentaje y monto.
- Añadir KPIs adicionales en Pulso: días hasta `end_date_estimada`, próximos hitos del cronograma.

### 3. Pestaña Finanzas: alinear con módulo Finanzas

Actualizar `TabsContent value="finanzas"` (líneas 2295-2418) para:

- **Ingresos**: separar confirmados / negociación / cobrado real (consultando `cobros`).
- **Gastos**: añadir gastos reales pagados desde `pagos` o `booking_expenses` vinculados a este proyecto, no solo partidas de presupuesto.
- **Balance**: `cobrado real − gastos pagados` y `proyectado`.
- **IRPF / IVA**: mostrar el neto a transferir como en el hub Finanzas para coherencia.
- Añadir un botón "Ver en Finanzas" que abra el hub filtrado por este proyecto/artista.

### 4. Activar Notas colaborativas

Reemplazar el placeholder por un editor funcional:

- Crear nueva tabla `project_notes` (id, project_id, content, created_by, updated_at) con RLS basada en pertenencia al proyecto.
- Componente `ProjectNotesTab`:
  - Editor de texto enriquecido (reutilizar el patrón de `Textarea` con autosave debounced ya usado en otras partes).
  - Lista de versiones / última edición + autor.
  - Realtime opcional: suscripción Supabase para que varios miembros vean cambios en vivo.
- Cargar y guardar usando el cliente Supabase con RLS.

### 5. Limpieza

- Eliminar imports y helpers asociados al seed de tareas que queden huérfanos.
- Verificar que la pestaña "Vista General" y "Cronograma" siguen funcionando con `tasks` reales (ajustar si esperaban el campo `etapa` del seed).

## Archivos a modificar

- `src/pages/ProjectDetail.tsx` (tareas reales, Finanzas mejorada, montaje de `ProjectNotesTab`)
- `src/components/project-detail/ProjectPulseTab.tsx` (cobrado real, KPIs de fechas)
- `src/components/project-detail/ProjectNotesTab.tsx` (nuevo)
- Migración SQL para tabla `project_notes` + políticas RLS

## Notas

- No se toca `ProjectChecklistManager`: ya funciona, solo necesita que el usuario cree una checklist (o que reutilicemos sus mismos datos para Pulso, que es lo que hace el plan).
- Si prefieres que la pestaña "Checklist" muestre directamente plantillas sugeridas en lugar del estado vacío actual, dímelo y lo añado.
