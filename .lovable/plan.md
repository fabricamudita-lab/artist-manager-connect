

## Fix: permitir IRPF a 0% en la tabla de presupuesto

### Problema
El campo de IRPF en la tabla de items usa el operador `||` en tres sitios, lo que interpreta `0` como "falso" y lo reemplaza por `15`. Esto impide poner 0% de IRPF (necesario para Dietas, Hospedaje, Transporte, etc.).

### Cambios en `src/components/BudgetDetailsDialog.tsx`

Reemplazar `||` por `??` (nullish coalescing) en estos puntos:

1. **Linea ~3884** (valor del input en modo edicion):
   - `editingItemValues.irpf_percentage || item.irpf_percentage || 15` cambia a `editingItemValues.irpf_percentage ?? item.irpf_percentage ?? 15`

2. **Linea ~3885** (onChange del input):
   - `parseFloat(e.target.value) || 15` cambia a usar una logica que acepte 0: `const v = parseFloat(e.target.value); setEditingItemValues(prev => ({ ...prev, irpf_percentage: isNaN(v) ? 15 : v }))`

3. **Linea ~3893** (display en modo lectura):
   - `item.irpf_percentage || 15` cambia a `item.irpf_percentage ?? 15`

Son 3 cambios puntuales en el mismo archivo. Tras esto, el IRPF se podra poner a 0% sin problemas.

