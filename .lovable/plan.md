

## Duplicar elementos del presupuesto con Option+Drag

### Problema
Actualmente, arrastrar un elemento en la tabla de presupuesto solo lo reordena. El usuario quiere poder mantener pulsada la tecla Option (Alt) y arrastrar para duplicar el elemento automáticamente.

### Solución
Detectar si la tecla `altKey` está pulsada durante el drag en `BudgetDetailsDialog.tsx`. Si lo está, en lugar de reordenar, duplicar el elemento arrastrado e insertarlo en la posición de destino.

### Cambios en `src/components/BudgetDetailsDialog.tsx`

**1. Crear función `duplicateItemAtPosition`**
- Copia todos los campos del item original (nombre, precio, IVA, IRPF, contacto, etc.) excepto el `id`.
- Inserta en `budget_items` con el `sort_order` del destino, desplazando los demás hacia abajo.
- Añade sufijo " (copia)" al nombre para distinguirlo.
- Refresca la lista con `fetchBudgetItems()`.

**2. Modificar los handlers de drag**
- En `onDragStart`: guardar si `e.altKey` estaba pulsado en un estado `isDuplicateDrag`.
- Cambiar `effectAllowed` a `'copy'` cuando Alt está pulsado (el cursor mostrará un `+`).
- En `onDragOver`: cambiar `dropEffect` a `'copy'` cuando Alt está pulsado.
- En `onDrop`: si `isDuplicateDrag` es true, llamar a `duplicateItemAtPosition` en vez de `reorderElements`.

**3. Indicador visual**
- Cuando se arrastra con Alt, el indicador de drop cambia de color (verde en vez de azul) para distinguir visualmente "copiar" de "mover".

### Archivo modificado
- `src/components/BudgetDetailsDialog.tsx`

