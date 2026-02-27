

## IRPF 0% por defecto en Transporte, Hospedaje y Dietas

### Problema
Al agregar un nuevo elemento en las categorias Transporte, Hospedaje o Dietas, el IRPF se establece en 15% por defecto. Estas categorias corresponden a gastos suplidos que no llevan retencion, por lo que el valor correcto por defecto deberia ser 0%.

### Solucion

**Archivo**: `src/components/BudgetDetailsDialog.tsx`

En la funcion `addNewItem` (linea 1623), antes de insertar el nuevo item, consultar el nombre de la categoria usando `budgetCategories` y determinar si el IRPF debe ser 0% o 15%:

```typescript
const addNewItem = async (categoryId: string) => {
  // Categorias exentas de IRPF por defecto
  const category = budgetCategories.find(c => c.id === categoryId);
  const categoryName = (category?.name || '').toLowerCase().trim();
  const zeroIrpfCategories = ['transporte', 'hospedaje', 'dietas'];
  const defaultIrpf = zeroIrpfCategories.includes(categoryName) ? 0 : 15;

  // ... insert con irpf_percentage: defaultIrpf en vez de 15
};
```

Cambio minimo: 4 lineas nuevas y 1 linea editada en la funcion `addNewItem`. El usuario siempre puede modificar el IRPF manualmente despues.
