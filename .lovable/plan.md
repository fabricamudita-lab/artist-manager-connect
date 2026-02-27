

## Marcar elementos como Provisional vs Real en presupuestos

### Concepto
Anadir un campo "Provisional" a cada elemento del presupuesto. Los costes provisionales (imprevistos, estimaciones) se distinguen visualmente de los costes reales confirmados. Esto permite tener una vision clara de cuanto es firme y cuanto es contingencia.

### Cambios

**1. Base de datos** -- Nueva columna en `budget_items`
- Columna `is_provisional` (boolean, default `false`)
- Migracion SQL sencilla

**2. Tipos TypeScript** -- `src/integrations/supabase/types.ts`
- Anadir `is_provisional` al tipo de `budget_items`

**3. UI en la tabla de elementos** -- `src/components/BudgetDetailsDialog.tsx`
- Junto al nombre del concepto, mostrar un badge pequeno "Provisional" en color ambar cuando `is_provisional = true`
- Al estar en modo edicion, anadir un toggle/checkbox "Provisional" debajo o junto al nombre
- En modo lectura, un click en el badge permite cambiar el estado directamente (toggle rapido)

**4. Indicadores en totales**
- En el resumen de cada categoria, mostrar entre parentesis cuanto del total es provisional: ej. "€795 (€150 provisional)"
- Opcional: en los KPIs del encabezado, separar "Coste confirmado" vs "Coste provisional"

**5. Estilo visual**
- Las filas provisionales tendran un fondo con lineas diagonales sutiles (patron "dashed") o una opacidad reducida para distinguirlas a simple vista
- Badge ambar con icono de reloj o signo de interrogacion

### Flujo de usuario
1. Agrega un elemento (ej: "Gasolina extra") normalmente
2. Hace click en el badge o toggle "Provisional" para marcarlo
3. El elemento aparece visualmente diferenciado
4. Los totales muestran el desglose confirmado vs provisional
5. Cuando el coste se confirma, desmarca "Provisional" y queda como gasto real

### Detalle tecnico

Migracion:
```sql
ALTER TABLE budget_items ADD COLUMN is_provisional boolean DEFAULT false;
```

En `addNewItem`, el campo se inserta como `false` por defecto. En la tabla, junto al nombre:
```tsx
{item.is_provisional && (
  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">
    Provisional
  </Badge>
)}
```

Toggle rapido sin entrar en modo edicion completo (similar al patron existente de contact_id):
```tsx
onClick={() => {
  supabase.from('budget_items')
    .update({ is_provisional: !item.is_provisional })
    .eq('id', item.id)
    .then(() => fetchBudgetItems());
}}
```
