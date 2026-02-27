

## Fix: Mover subtareas al desplazar un flujo entero

### Problema
Al arrastrar la barra de resumen de un workflow para moverlo en bloque, solo se actualizan las fechas de las tareas principales. Las subtareas mantienen sus fechas originales porque `handleShiftWorkflow` no las recorre.

### Solucion
Modificar `handleShiftWorkflow` en `src/pages/release-sections/ReleaseCronograma.tsx` (linea 1655-1658) para que, ademas de desplazar `t.startDate`, tambien desplace `startDate` de cada subtarea que tenga fecha.

### Cambio exacto

```tsx
// Antes (linea 1655-1658)
tasks: w.tasks.map(t => {
  if (!t.startDate) return t;
  return { ...t, startDate: addDays(t.startDate, daysDelta) };
}),

// Despues
tasks: w.tasks.map(t => {
  const updatedSubtasks = t.subtasks?.map(st => 
    st.startDate ? { ...st, startDate: addDays(st.startDate, daysDelta) } : st
  );
  if (!t.startDate) return updatedSubtasks ? { ...t, subtasks: updatedSubtasks } : t;
  return { 
    ...t, 
    startDate: addDays(t.startDate, daysDelta),
    ...(updatedSubtasks ? { subtasks: updatedSubtasks } : {}),
  };
}),
```

### Archivo modificado
| Archivo | Cambio |
|---|---|
| `src/pages/release-sections/ReleaseCronograma.tsx` | Propagar `daysDelta` a subtareas en `handleShiftWorkflow` |
