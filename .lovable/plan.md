
## Mover flujos en bloque arrastrando la barra de workflow

### Concepto

Permitir arrastrar la barra de resumen de cada workflow (Audio, Visual, Marketing, etc.) horizontalmente para desplazar **todas** las tareas del flujo en bloque. Solo se modifican las fechas; se preservan responsables, estados y anclas. Al soltar, se muestra un dialogo de confirmacion que incluye un aviso si hay tareas no completadas con fecha de vencimiento anterior o igual a hoy.

### Cambios tecnicos

**Archivo: `src/components/lanzamientos/GanttChart.tsx`**

1. **Nuevo estado para drag de workflow**: Anadir un estado `workflowDrag` separado del drag de tareas individuales, con estructura:
   - `workflowId`, `startX`, `containerWidth`, `origStart` (fecha inicio del workflow), `origEnd`, `activated`

2. **Handler `handleWorkflowBarMouseDown`**: Se activa al hacer mousedown en la barra de resumen del workflow (linea ~466). Captura la posicion inicial y el ancho del contenedor.

3. **Logica de mousemove para workflow drag**: Calcula `deltaDays` basado en el desplazamiento del raton. Muestra una preview visual del offset (ghost bar).

4. **Estado `pendingWorkflowShift`**: Al soltar el raton, se almacena:
   - `workflowId`, `daysDelta` (los dias de desplazamiento)
   - `tasksWithWarning`: lista de tareas no completadas cuya nueva fecha de vencimiento es <= hoy

5. **Dialogo de confirmacion para workflow shift**: Similar al existente para tareas individuales, pero:
   - Muestra "Mover [nombre flujo] X dias hacia adelante/atras"
   - Si hay tareas con warning, muestra un aviso tipo `Alert` con la lista de tareas que tendran fecha vencida

6. **Callback `onShiftWorkflow`**: Nueva prop del GanttChart que recibe `(workflowId: string, daysDelta: number) => void`

7. **Hacer la barra draggable**: En la barra del workflow (linea ~466), anadir:
   - `onMouseDown` que invoca el handler de drag
   - `cursor-ew-resize` para indicar que es arrastrable
   - Evitar que el click de colapso se active durante un drag
   - Preview visual: barra ghost en posicion original + barra en nueva posicion durante el drag

**Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`**

1. **Nuevo handler `handleShiftWorkflow`**: Recibe `workflowId` y `daysDelta`. Ejecuta `pushUndo()` y luego desplaza todas las `startDate` de las tareas del workflow en `daysDelta` dias, sin tocar `status`, `responsible`, `anchoredTo` ni `estimatedDays`.

2. **Pasar el handler al GanttChart**: Anadir `onShiftWorkflow={handleShiftWorkflow}` en la instancia del componente.

### Flujo de usuario

1. El usuario posiciona el cursor sobre la barra de resumen del workflow
2. El cursor cambia a `ew-resize`
3. Al arrastrar, la barra se mueve mostrando la nueva posicion, con una barra ghost en la posicion original
4. Al soltar, aparece un dialogo:
   - "Mover Audio 10 dias hacia adelante" (o "atras")
   - Si hay tareas vencidas: "Atencion: 3 tareas no completadas tendran fecha vencida (Grabacion, Mezcla, Mastering)"
   - Botones: Cancelar / Confirmar
5. Al confirmar, todas las tareas del workflow se desplazan manteniendo sus intervalos relativos

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | Anadir drag de workflow bar, nuevo estado, dialogo de confirmacion con warning, nueva prop `onShiftWorkflow` |
| `src/pages/release-sections/ReleaseCronograma.tsx` | Implementar `handleShiftWorkflow` que desplaza todas las fechas del workflow |
