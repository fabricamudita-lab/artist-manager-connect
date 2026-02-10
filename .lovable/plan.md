

# Mostrar rango anterior y nuevo en el dialogo de confirmacion

## Cambio

Modificar el dialogo de confirmacion del drag para que muestre ambos rangos: el anterior (original) y el nuevo (propuesto).

## Detalle visual

```text
  Guardar cambios?
  Anterior: 13 dic – 20 dic
  Nuevo:    20 dic – 27 dic
  [ Cancelar ]  [ Sobreescribir ]
```

## Implementacion

**Archivo:** `src/components/lanzamientos/GanttChart.tsx`

1. Ampliar el tipo de `pendingDrag` para incluir `origStartDate: Date` y `origDays: number` (las fechas originales de la tarea antes del drag).
2. En `handleMouseUp`, al crear `pendingDrag`, guardar tambien `ds.origStart` y `ds.origDays` (ya almacenados en el `dragRef`).
3. En el `AlertDialogDescription`, mostrar dos lineas:
   - `Anterior: **13 dic** - **20 dic**` (tachado o con color muted)
   - `Nuevo: **20 dic** - **27 dic**`

