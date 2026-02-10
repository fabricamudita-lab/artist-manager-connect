
# Dialogo de confirmacion al regenerar fechas

## Contexto

Actualmente, al pulsar "Regenerar fechas" se abre directamente el wizard y al confirmar se sobreescriben todas las tareas del cronograma, perdiendo cualquier cambio manual (subtareas, notas, comentarios, responsables asignados, anclajes, etc.).

## Solucion

Interceptar el clic en "Regenerar fechas" con un dialogo de confirmacion que ofrezca dos opciones antes de abrir el wizard:

1. **Mantener datos existentes**: Solo recalcula las fechas de inicio/fin de las tareas existentes segun la nueva configuracion del wizard, pero conserva subtareas, notas, comentarios, responsables y estados.
2. **Sobreescribir todo**: Comportamiento actual -- genera un cronograma limpio desde cero, eliminando todos los cambios anteriores.

### Flujo del usuario

```text
[Clic "Regenerar fechas"]
        |
        v
  Dialogo de confirmacion
  "Ya tienes tareas configuradas. Que deseas hacer?"
  ┌─────────────────────────────────┐
  │  Opcion A: Mantener datos       │
  │  "Solo actualiza las fechas     │
  │   segun la nueva configuracion. │
  │   Tus subtareas, notas y        │
  │   responsables se conservan."   │
  ├─────────────────────────────────┤
  │  Opcion B: Sobreescribir todo   │
  │  "Genera un cronograma nuevo    │
  │   desde cero. Se eliminaran     │
  │   todos los cambios anteriores."│
  └─────────────────────────────────┘
        |
        v
  [Se abre el wizard normalmente]
        |
        v
  [Genera segun la opcion elegida]
```

## Cambios tecnicos

| Archivo | Cambio |
|---|---|
| `src/pages/release-sections/ReleaseCronograma.tsx` | 1. Nuevo estado `regenerateMode: 'keep' | 'overwrite' | null`. 2. Nuevo estado `showRegenerateConfirm: boolean`. 3. El boton "Regenerar fechas" ahora abre el dialogo de confirmacion (no el wizard directamente). 4. Al elegir opcion, se guarda el modo y se abre el wizard. 5. En `handleGenerateFromWizard`, si el modo es `'keep'`, se hace un merge: para cada tarea generada, si existe una tarea con el mismo nombre en el mismo workflow, se conservan sus subtareas, notas, responsable, estado y anclajes, actualizando solo `startDate` y `estimatedDays`. Si el modo es `'overwrite'`, comportamiento actual sin cambios. |

### Logica de merge (modo "mantener")

Para cada workflow:
- Se generan las tareas nuevas desde el wizard.
- Para cada tarea generada, se busca una tarea existente con el mismo `name` en el mismo workflow.
- Si se encuentra coincidencia: se toma la tarea existente y solo se actualizan `startDate` y `estimatedDays` con los valores generados. Se conservan `subtasks`, `status`, `responsible`, `responsible_ref`, `anchoredTo`, `customStartDate`.
- Si no hay coincidencia (tarea nueva): se agrega tal cual desde la generacion.
- Tareas existentes sin coincidencia en la generacion: se mantienen al final del workflow (no se eliminan).

### Dialogo

Se usara el componente `AlertDialog` existente (similar al patron de `ConfirmationDialog`) con dos botones principales y un boton cancelar. No se necesita un componente nuevo, se puede hacer inline en ReleaseCronograma.
