

## Eliminar las lineas horizontales entre subtareas

### Causa
El componente `TableRow` de la UI tiene `border-b` por defecto. Cada subtarea se renderiza dentro de un `SortableSubtaskRow` que usa `TableRow`, por lo que aparecen lineas separadoras entre cada subtarea.

### Solucion
Agregar `border-0` al className del `TableRow` dentro de `SortableSubtaskRow` para eliminar el borde inferior por defecto.

### Archivo a modificar
- `src/pages/release-sections/ReleaseCronograma.tsx` (linea 259)

### Cambio exacto
```tsx
// Antes
<TableRow ref={setNodeRef} style={style} className="group/subtask-drag">

// Despues
<TableRow ref={setNodeRef} style={style} className="group/subtask-drag border-0">
```

Resultado: las subtareas se muestran sin lineas separadoras entre ellas, manteniendo un aspecto limpio y continuo.

