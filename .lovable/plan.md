

## Auto-ordenacion cronologica + confirmacion de reorden manual

### Problema
Actualmente las actividades del schedule se pueden reordenar libremente con drag-and-drop sin validacion. Esto permite situaciones incoherentes (ej: evento a las 20:30 seguido de otro a las 20:25).

### Solucion

**Archivo: `src/components/roadmap-blocks/ScheduleBlock.tsx`**

**1. Auto-ordenacion al cambiar hora**
- En `updateItem`, cuando `field === 'startTime'`, tras actualizar el valor, reordenar automaticamente los items del dia por `startTime` ascendente.
- Esto garantiza que al escribir/editar una hora, la lista se reordena sola.

**2. Confirmacion al hacer drag-and-drop manual**
- En `handleDragEnd`, antes de aplicar el `arrayMove`, comprobar si el resultado rompe el orden cronologico.
- Si lo rompe, en vez de aplicar directamente, guardar el movimiento pendiente en un nuevo estado `pendingReorder: { oldIndex, newIndex } | null`.
- Mostrar un `AlertDialog` de doble confirmacion: "Esta actividad quedara fuera de orden cronologico (XX:XX antes de YY:YY). Esto es correcto?"
- Si confirma: aplicar el reorden. Si cancela: no hacer nada.

**3. Auto-ordenacion al anadir actividad**
- En `addItem`, tras insertar la nueva actividad, ordenar los items por `startTime` (los vacios van al final).

### Detalles tecnicos

- Funcion helper `sortByTime(items: ScheduleItem[])`: ordena por `startTime`, items sin hora van al final.
- Funcion helper `isChronological(items: ScheduleItem[])`: verifica si estan en orden.
- Nuevo estado: `pendingReorder: { dayId: string; items: ScheduleItem[] } | null`
- Nuevo `AlertDialog` (importar de `@/components/ui/alert-dialog`) para la confirmacion.

### Estructura visual del dialogo

```text
[!] Orden no cronologico

La actividad "Soundcheck" (20:30) quedara despues de "Show" (20:25).
Esto rompe el orden cronologico. Estas seguro?

[Cancelar]  [Si, mantener este orden]
```

