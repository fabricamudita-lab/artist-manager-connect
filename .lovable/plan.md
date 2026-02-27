

## Mejorar indicador visual de Provisional

### Problema
El icono de reloj de arena (hourglass) no cambia visualmente de forma clara entre activado y desactivado. Solo cambia ligeramente de color (gris vs ambar), lo cual no es intuitivo.

### Solucion
Reemplazar el boton con emoji por un **Switch** (toggle) compacto, que es universalmente entendido como on/off. El switch se mostrara en la columna de acciones junto al boton de editar.

**Cambios en `src/components/BudgetDetailsDialog.tsx`:**

1. **Reemplazar el boton hourglass** por un componente `Switch` de Radix (ya disponible en el proyecto como `@/components/ui/switch`):
   - Cuando esta ON: el switch se ve activo en color ambar, y aparece la etiqueta "Prov." al lado
   - Cuando esta OFF: el switch se ve inactivo (gris)
   - El tooltip/title sigue indicando "Marcar como provisional" / "Marcar como real"

2. **Mantener el badge junto al nombre** pero simplificarlo: en vez de ser clickable, solo es un indicador visual pasivo que dice "Provisional"

3. **Estilo del switch**: usar clases personalizadas para que el thumb sea ambar cuando esta activo (`data-[state=checked]:bg-amber-500`), haciendolo coherente con el badge

### Resultado
El usuario vera un toggle claro tipo on/off en cada fila. Es inmediatamente obvio si un elemento esta marcado como provisional o no.

