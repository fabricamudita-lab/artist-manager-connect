

# Fix: Boton "Ocultar" no debe ser verde

## Problema

El boton "Ocultar" aparece en verde porque esta envuelto en `AlertDialogAction`, que aplica los estilos del boton primario (verde). Al usar `asChild`, las clases verdes de `AlertDialogAction` se mezclan con las del `Button variant="outline"`, resultando en un boton que sigue viendose verde.

## Solucion

Reemplazar `AlertDialogAction asChild` por un `Button variant="outline"` normal (sin envolver en AlertDialogAction). Esto requiere cerrar el AlertDialog manualmente despues de la accion, lo cual ya se maneja al poner `pendingPreset` a `null`.

### Resultado visual

- **Cancelar**: borde gris (outline) - sin cambios
- **Ocultar**: borde gris (outline) - sin verde
- **Mantener**: verde solido (primario) - unico boton destacado

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/CreateContactDialog.tsx` | Reemplazar `AlertDialogAction asChild > Button variant="outline"` por un `Button variant="outline"` directo |
| `src/components/EditContactDialog.tsx` | Mismo cambio |

Cambio de 3 lineas a 1 linea en cada archivo.
