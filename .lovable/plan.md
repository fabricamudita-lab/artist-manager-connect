
# Dos mejoras para las categorías ocultas

## Pregunta 1: ¿Las ocultas suman en los totales?

**SÍ, actualmente siguen sumando.** `calculateGrandTotals()` reduce sobre `items` completos, sin filtrar por `hiddenCategories`. Esto es un problema real: el usuario ve una categoría "oculta" pero su coste impacta los totales sin que se sepa por qué.

### Comportamiento propuesto (2 opciones, elige):

**Opción A (recomendada): Incluir en totales, pero indicarlo visualmente**
- Las ocultas siguen sumando (el dinero existe aunque no lo veas)
- En el resumen financiero aparece un desglose: "Categorías visibles: €X · Ocultas: €Y"
- Un pequeño aviso tipo chip ámbar: "⚠ €Y en categorías ocultas"

**Opción B: Excluir de totales**
- Los totales solo cuentan categorías visibles
- Hay un aviso claro: "Excluidas €Y de categorías ocultas"

El plan implementa **la Opción A** por defecto (más transparente y seguro). Es trivial cambiar a B si se prefiere.

---

## Pregunta 2: Alerta cuando un elemento nuevo cae en una categoría oculta

### Cuándo puede ocurrir

Hay 3 puntos de inserción en el código:

1. **`addNewItem(categoryId)`** — usuario añade elemento manual desde una categoría específica. Si la categoría estaba oculta en la gestión, el item se crea pero no se ve.
2. **Carga masiva desde formato** (línea 1471) — `loadCrewFromFormat()` inserta ítems en categorías que pueden estar ocultas.
3. **Inserción de equipo** (línea 1153) — similar al anterior.

### Nuevo mecanismo: `HiddenCategoryAlert`

Cuando cualquiera de los 3 puntos inserta un ítem cuya `category_id` está en `hiddenCategories`, se dispara un estado nuevo:

```ts
const [hiddenCategoryAlert, setHiddenCategoryAlert] = useState<{
  categoryId: string;
  categoryName: string;
  itemCount: number;
} | null>(null);
```

### El aviso visual

Un `Dialog` (o `toast` enriquecido, pero preferimos `Dialog` para que el usuario no lo pierda):

```
┌────────────────────────────────────────────────────────┐
│  👁 Elementos creados en una categoría oculta           │
│                                                         │
│  Se han añadido 3 elementos nuevos a la categoría       │
│  "Músicos", que actualmente está oculta.                │
│                                                         │
│  Los elementos existen y se incluyen en los totales,    │
│  pero no son visibles en el presupuesto.                │
│                                                         │
│  [Mostrar "Músicos" ahora]    [Mantener oculta]         │
└────────────────────────────────────────────────────────┘
```

- **"Mostrar ahora"** → llama a `toggleHideCategory(categoryId, false)` y cierra el alert
- **"Mantener oculta"** → solo cierra el alert

---

## Cambios técnicos — solo `src/components/BudgetDetailsDialog.tsx`

### 1. Nuevo estado

```ts
const [hiddenCategoryAlert, setHiddenCategoryAlert] = useState<{
  categoryId: string;
  categoryName: string;
  itemCount: number;
} | null>(null);
```

### 2. Helper: detectar si una categoría destino está oculta

```ts
const checkAndAlertHiddenCategory = (categoryId: string, itemCount = 1) => {
  if (hiddenCategories.has(categoryId)) {
    const cat = budgetCategories.find(c => c.id === categoryId);
    if (cat) {
      setHiddenCategoryAlert({ categoryId, categoryName: cat.name, itemCount });
    }
  }
};
```

### 3. Llamar al helper en los 3 puntos de inserción

- **`addNewItem`** (línea ~1547, después de `fetchBudgetItems()`):
  ```ts
  checkAndAlertHiddenCategory(categoryId, 1);
  ```
- **`loadCrewFromFormat`** (línea ~1475, después del insert masivo): agrupar por `category_id` del batch e iterar
- **`loadFromFormat`** (línea ~1153): ídem

### 4. Total con desglose de ocultas

Modificar el bloque de resumen financiero (línea ~2676):

```ts
const totals = calculateGrandTotals(); // sigue sin cambiar — incluye todo

// Nuevo: subtotal solo de ítems en categorías ocultas
const hiddenTotal = items
  .filter(item => hiddenCategories.has(item.category_id ?? ''))
  .reduce((sum, item) => {
    const sub = item.unit_price * (item.quantity || 1);
    return sum + sub + sub * (item.iva_percentage / 100);
  }, 0);
```

Si `hiddenTotal > 0`, mostrar chip ámbar junto al total:
```tsx
{hiddenTotal > 0 && (
  <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
    <EyeOff className="w-3 h-3" />
    €{hiddenTotal.toFixed(2)} en categorías ocultas incluidas
  </div>
)}
```

### 5. El `Dialog` de alerta

Añadir al final del JSX (antes del cierre del componente):

```tsx
<Dialog open={!!hiddenCategoryAlert} onOpenChange={() => setHiddenCategoryAlert(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <EyeOff className="w-5 h-5 text-amber-400" />
        Elementos en categoría oculta
      </DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground">
      Se {hiddenCategoryAlert?.itemCount === 1 ? 'ha añadido 1 elemento' : `han añadido ${hiddenCategoryAlert?.itemCount} elementos`} a la categoría{' '}
      <strong>"{hiddenCategoryAlert?.categoryName}"</strong>, que actualmente está oculta.
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Los elementos existen y se incluyen en los totales del presupuesto, pero no son visibles en la vista principal.
    </p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setHiddenCategoryAlert(null)}>
        Mantener oculta
      </Button>
      <Button onClick={() => {
        toggleHideCategory(hiddenCategoryAlert!.categoryId, false);
        setHiddenCategoryAlert(null);
      }}>
        Mostrar "{hiddenCategoryAlert?.categoryName}"
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/BudgetDetailsDialog.tsx` | Estado `hiddenCategoryAlert` + helper `checkAndAlertHiddenCategory` + 3 llamadas en los puntos de inserción + chip ámbar en totales + Dialog de alerta |

Sin tocar: base de datos, migraciones, otros componentes.
