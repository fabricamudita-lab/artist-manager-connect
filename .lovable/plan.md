

# Confirmacion al soltar una barra arrastrada en el Gantt

## Resumen

Al terminar de arrastrar una barra del Gantt (mouseup), en lugar de aplicar el cambio directamente, mostrar un pequeno dialogo de confirmacion preguntando si se desean guardar las nuevas fechas o cancelar el cambio.

## Comportamiento

1. El usuario arrastra una barra (mover o resize) -- funciona igual que ahora, con preview en tiempo real.
2. Al soltar el raton, si hubo movimiento real (drag activado), NO se aplica el cambio inmediatamente.
3. En su lugar, se muestra un dialogo compacto con:
   - Texto: "Nuevo rango: 14 dic - 20 dic. Guardar cambios?"
   - Boton "Sobreescribir" (aplica el cambio)
   - Boton "Cancelar" (descarta y vuelve a la posicion original)
4. La barra permanece en su posicion de preview hasta que el usuario confirme o cancele.

## Cambios tecnicos

| Archivo | Cambio |
|---|---|
| `src/components/lanzamientos/GanttChart.tsx` | 1. Nuevo estado `pendingDrag` que almacena `{ workflowId, taskId, startDate, days, isSubtask }` cuando el drag termina. 2. En `handleMouseUp`: en vez de llamar `onUpdateTaskDate` directamente, guardar los datos en `pendingDrag` y mantener `dragPreview` visible (la barra queda en su nueva posicion). 3. Renderizar un `AlertDialog` (o dialogo inline) cuando `pendingDrag` es truthy, mostrando el nuevo rango y los botones "Sobreescribir" y "Cancelar". 4. "Sobreescribir" llama a `onUpdateTaskDate` con los valores de `pendingDrag` y limpia ambos estados. 5. "Cancelar" simplemente limpia `pendingDrag` y `dragPreview` (la barra vuelve a su posicion original). |

## Flujo visual

```text
[Arrastrar barra]
       |
       v
  [Soltar raton]
       |
       v
  Dialogo:
  "Nuevo rango: 14 dic – 20 dic"
  [ Cancelar ]  [ Sobreescribir ]
       |              |
       v              v
  (vuelve a         (aplica
   original)        cambio)
```

## Detalles de implementacion

- Se usara `AlertDialog` de Radix ya existente en el proyecto para la confirmacion.
- El `dragPreview` se mantiene activo mientras el dialogo esta abierto, para que la barra siga mostrando la posicion propuesta.
- El dialogo mostrara las fechas formateadas con `format(date, 'dd MMM', { locale: es })`.

