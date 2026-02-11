
# Boton Deshacer (Undo) en el Cronograma

## Resumen

Agregar un boton con icono de flecha hacia atras en la barra superior del cronograma que permita revertir el ultimo cambio realizado sobre las tareas (cambio de estado, fecha, responsable, ancla, etc.).

## Comportamiento

- Se mantiene un historial de estados previos del array `workflows` (stack de undo)
- Cada vez que se llama a `updateTask`, `addTask`, `deleteTask` o `handleTaskDateUpdate`, se guarda una copia del estado anterior en el stack
- Al hacer clic en el boton de deshacer, se restaura el ultimo estado guardado
- El boton aparece deshabilitado cuando no hay cambios que revertir
- Limite razonable del historial: ultimos 20 cambios

## Ubicacion visual

El boton se colocara en la barra de acciones superior, junto a "Regenerar fechas", con un icono `Undo2` de lucide-react y un tooltip "Deshacer".

## Detalle tecnico

### Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`

1. **Nuevo estado**: Agregar `const [undoStack, setUndoStack] = useState<WorkflowWithTasks[][]>([])` para almacenar los estados anteriores

2. **Funcion helper `pushUndo`**: Antes de cada mutacion del estado `workflows`, guardar una copia profunda del estado actual en el stack (limitado a 20 entradas)

3. **Modificar `updateTask`**: Llamar a `pushUndo()` antes de `setWorkflows(...)`

4. **Modificar `addTask`**: Llamar a `pushUndo()` antes de `setWorkflows(...)`

5. **Modificar logica de eliminacion**: Llamar a `pushUndo()` antes de eliminar

6. **Modificar `handleTaskDateUpdate`**: Llamar a `pushUndo()` antes del cambio

7. **Funcion `undo`**: Hacer pop del ultimo estado del stack y aplicarlo con `setWorkflows(lastState)`

8. **Boton en la UI**: Junto al boton "Regenerar fechas", agregar:
   ```
   <Button variant="outline" size="sm" disabled={undoStack.length === 0} onClick={undo}>
     <Undo2 className="w-4 h-4 mr-2" />
     Deshacer
   </Button>
   ```

9. **Atajo de teclado** (opcional): Ctrl+Z / Cmd+Z para deshacer
