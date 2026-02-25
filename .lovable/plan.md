

## Cambiar botones del dialogo de orden cronologico

### Cambio en `src/components/roadmap-blocks/ScheduleBlock.tsx` (lineas 665-677)

Invertir la jerarquia visual de los botones:

- **"Mantener orden cronologico"** (boton principal/destacado, `AlertDialogAction`) - es la accion sugerida, aplica el auto-sort cronologico en vez de simplemente cancelar.
- **"Forzar este orden"** (boton secundario/outline, `AlertDialogCancel`) - permite mantener el orden manual no cronologico.

Logica:
- El boton principal ("Mantener orden cronologico") ejecuta `sortByTime` sobre los items del dia y guarda el resultado ordenado.
- El boton secundario ("Forzar este orden") aplica el reorden manual tal como el usuario lo arrastro.
- Esto invierte la logica actual: antes confirmar era "mantener desorden" y cancelar era "no hacer nada". Ahora confirmar es "corregir al orden cronologico" y la opcion secundaria es "forzar desorden".

