

## Corregir: contactos creados no aparecen en otros selectores del mismo presupuesto

### Problema
Cada instancia de `BudgetContactSelector` en la tabla del presupuesto carga los contactos una sola vez al montarse (`useEffect` con array vacio `[]`). Cuando creas un contacto nuevo (ej: "La Turbina") desde el formulario inline de un selector, ese contacto se anade al estado local de ESA instancia, pero las demas instancias del mismo presupuesto siguen con la lista antigua. Por eso al abrir otro selector y buscar "La Turbina", no aparece.

### Solucion
Re-cargar la lista de contactos cada vez que el usuario abre el desplegable del selector. Esto garantiza que cualquier contacto creado recientemente (ya sea desde otro selector o desde otra parte de la app) aparezca inmediatamente.

### Cambio tecnico

**Archivo**: `src/components/BudgetContactSelector.tsx`

Agregar un `useEffect` que dispare `fetchData()` cuando `open` cambia a `true`:

```typescript
useEffect(() => {
  if (open) {
    void fetchData();
  }
}, [open]);
```

Esto reemplaza o complementa el `useEffect` actual de montaje (linea 84-86). Al abrir el popover, se re-consulta la tabla `contacts` y `artists`, asegurando que la lista este siempre actualizada.

El fetch existente en montaje se puede mantener para que el nombre del contacto seleccionado se muestre correctamente sin necesidad de abrir el desplegable.
