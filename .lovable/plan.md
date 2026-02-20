
# Feature: Diálogo de estado para tareas ancladas cuando se marca "Retrasado"

## Contexto del sistema actual

El flujo actual tiene dos caminos diferenciados:
- **Cambio de fecha** → detecta dependencias → abre `AnchorDependencyDialog` → el usuario elige qué tareas mover (con cascada de fechas)
- **Cambio de estado** → `updateTask(workflowId, taskId, { status })` → se aplica directamente sin ningún diálogo ni cascada

Lo que se pide es un tercer comportamiento: cuando una tarea cambia su estado a `retrasado`, buscar todas las tareas que estén ancladas a ella y preguntar al usuario qué estado aplicarles.

## Flujo propuesto

```text
Usuario cambia estado a "retrasado"
        │
        ▼
¿Hay tareas ancladas a esta tarea?
        │
      SÍ ──────────────────────────────────────────────────────────────────┐
        │                                                                  │
        ▼                                                                  │
Abre diálogo "AnchoredStatusDialog"                                       │
  "Envío a Fábrica está retrasada.                                         │
   ¿Qué hacemos con las tareas ancladas?"                                  │
                                                                          │
  Lista de tareas ancladas (Test Pressing, Recepción Stock...)             │
  Con su estado actual y una acción a aplicar                              │
                                                                          │
  ┌──────────────────────────────────────────┐                            │
  │  Opciones (radio/selector por tarea):    │                            │
  │  ○ Marcar como "Retrasada"               │                            │
  │  ○ Mantener estado actual                │                            │
  │  ○ Marcar como "Pendiente"               │                            │
  └──────────────────────────────────────────┘                            │
                                                                          │
  [Cancelar]   [Aplicar]                                                  │
        │                                                                  │
      NO ──────────────────────────────────────────────────────────────────┘
        │
        ▼
Aplica el estado directamente (comportamiento actual)
```

## Implementación técnica

### Archivo nuevo: `src/components/lanzamientos/AnchoredStatusDialog.tsx`

Nuevo componente de diálogo con las siguientes props:

```tsx
interface AnchoredStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;         // "Envío a Fábrica"
  newStatus: TaskStatus;      // 'retrasado'
  dependentTasks: {
    id: string;
    name: string;
    workflowId: string;
    workflowName: string;
    currentStatus: TaskStatus;
  }[];
  onConfirm: (decisions: Record<string, TaskStatus | 'keep'>) => void;
}
```

El diálogo mostrará para cada tarea dependiente una fila con 3 opciones (radio group):
- **Marcar como Retrasada** (seleccionada por defecto)
- **Mantener estado actual** (ej. "En Proceso")
- **Marcar como Pendiente**

### Modificación en `src/pages/release-sections/ReleaseCronograma.tsx`

**1. Nuevos estados locales** (junto a `anchorDialogOpen` y `pendingDateChange`):
```ts
const [statusAnchorDialogOpen, setStatusAnchorDialogOpen] = useState(false);
const [pendingStatusChange, setPendingStatusChange] = useState<{
  workflowId: string;
  taskId: string;
  newStatus: TaskStatus;
  sourceName: string;
  dependentTasks: { id: string; name: string; workflowId: string; workflowName: string; currentStatus: TaskStatus }[];
} | null>(null);
```

**2. Nueva función `handleTaskStatusUpdate`** que reemplaza la llamada directa a `updateTask` para cambios de estado:

```ts
const handleTaskStatusUpdate = useCallback((workflowId: string, taskId: string, status: TaskStatus) => {
  // Solo actuar si el nuevo estado es 'retrasado'
  if (status !== 'retrasado') {
    updateTask(workflowId, taskId, { status });
    return;
  }

  // Buscar tareas ancladas a esta tarea
  const dependents = [];
  for (const w of workflows) {
    for (const t of w.tasks) {
      if (t.anchoredTo?.includes(taskId)) {
        dependents.push({
          id: t.id,
          name: t.name,
          workflowId: w.id,
          workflowName: w.name,
          currentStatus: t.status,
        });
      }
    }
  }

  if (dependents.length === 0) {
    updateTask(workflowId, taskId, { status });
    return;
  }

  const sourceName = getTaskName(taskId);
  setPendingStatusChange({ workflowId, taskId, newStatus: status, sourceName, dependentTasks: dependents });
  setStatusAnchorDialogOpen(true);
}, [workflows, updateTask, getTaskName]);
```

**3. Handler de confirmación**:

```ts
const handleStatusAnchorConfirm = useCallback((decisions: Record<string, TaskStatus | 'keep'>) => {
  if (!pendingStatusChange) return;
  const { workflowId, taskId, newStatus } = pendingStatusChange;
  pushUndo();
  setWorkflows(prev => prev.map(w => ({
    ...w,
    tasks: w.tasks.map(t => {
      if (t.id === taskId && w.id === workflowId) return { ...t, status: newStatus };
      const decision = decisions[t.id];
      if (decision && decision !== 'keep') return { ...t, status: decision };
      return t;
    }),
  })));
  setStatusAnchorDialogOpen(false);
  setPendingStatusChange(null);
}, [pendingStatusChange, pushUndo]);
```

**4. Conectar la prop `onUpdateTaskStatus`** en el `<GanttChart>` (línea ~1957) para que use `handleTaskStatusUpdate` en vez de llamar directamente a `updateTask`:

```tsx
onUpdateTaskStatus={(workflowId, taskId, status) => {
  handleTaskStatusUpdate(workflowId, taskId, status);
}}
```

Y también conectarlo en la vista de lista (donde también se cambia el estado de la tarea en el componente `SortableWorkflowCard`).

**5. Montar el diálogo en el JSX** junto al `AnchorDependencyDialog` existente:

```tsx
<AnchoredStatusDialog
  open={statusAnchorDialogOpen}
  onOpenChange={setStatusAnchorDialogOpen}
  sourceName={pendingStatusChange?.sourceName ?? ''}
  newStatus={pendingStatusChange?.newStatus ?? 'retrasado'}
  dependentTasks={pendingStatusChange?.dependentTasks ?? []}
  onConfirm={handleStatusAnchorConfirm}
/>
```

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/components/lanzamientos/AnchoredStatusDialog.tsx` | Crear nuevo |
| `src/pages/release-sections/ReleaseCronograma.tsx` | Añadir estados, handler, y montar diálogo |

Sin cambios en base de datos. El estado de las tareas dependientes se persiste automáticamente por el auto-save existente (debounce de 1.5s).

## Comportamiento solo para estado "retrasado"

El diálogo solo se activa cuando el nuevo estado es `retrasado`. Cambios a `completado`, `en_proceso` o `pendiente` siguen aplicándose directamente sin diálogo (el comportamiento actual). Esto evita interrupciones innecesarias en el flujo normal de trabajo.
