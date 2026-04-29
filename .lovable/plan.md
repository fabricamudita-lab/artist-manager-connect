## Problem

In `src/utils/exportCronogramaGanttPDF.ts`, task bars are currently colored by **workflow category** (audio=blue, visual=pink, fabricación=amarillo, contenido=morado, marketing=naranja, directo=verde), but the legend at the bottom of the PDF shows colors by **task status**:

- Pendiente → gris (#9CA3AF)
- En Proceso → azul (#3B82F6)
- Completado → verde (#22C55E)
- Retrasado → rojo (#EF4444)

This inconsistency makes the legend misleading.

## Solution

Color each task bar based on its `status`, matching the legend exactly. Workflow color is preserved only for the **workflow header row** (section title + left side bar) so users can still visually group tasks by category.

### Changes in `src/utils/exportCronogramaGanttPDF.ts`

1. **Add a `STATUS_COLORS` map** with the 4 RGB tuples shown in the legend.
2. **Remove the `STATUS_BAR_OPACITY` blending logic** for the bar fill — replace with a direct status color lookup.
3. **Task bar fill**: use `STATUS_COLORS[task.status]` instead of the workflow color blended with opacity.
4. **Retrasado border**: keep the existing red outline (already matches, but redundant when fill is also red — switch to a slightly darker red border or remove the extra border since the fill already conveys the status).
5. **Completado checkmark**: keep the white `✓` indicator on the green bar.
6. **Date label contrast**: when drawing the date text *inside* the bar, ensure it remains white/readable on all 4 status colors (currently fine; just verify against the lighter gray "Pendiente").
7. **Workflow header row**: keep using `WORKFLOW_COLORS` for the section banner background tint, left color stripe, and workflow name text. This keeps category context without polluting the status legend.
8. **Legend at the bottom**: no change needed — it already lists the correct 4 status colors and will now actually match the bars.

### Result

Each bar in the Gantt PDF will be:

- **Gris** if Pendiente
- **Azul** if En Proceso
- **Verde** if Completado
- **Rojo** if Retrasado

…exactly matching the legend, while workflow grouping is still visible via the colored section headers.

No other files need to change.
