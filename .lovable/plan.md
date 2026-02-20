
# Botón de escoba: ocultar categorías vacías de un clic

## Qué hace exactamente

En el panel "Gestión de Elementos y Categorías" dentro de `BudgetDetailsDialog`, al lado izquierdo del botón "Añadir equipo", se añade un botón con el icono de escoba (`Brush` / `Eraser` de lucide). Al hacer clic:

1. Recorre todas las categorías del presupuesto
2. Para cada categoría, llama a `getCategoryItems(category.id)`
3. Si esa categoría tiene **0 elementos**, la añade al set `hiddenCategories`
4. Llama a `saveHiddenCategoriesToDB` con el nuevo set completo para persistir el cambio

## Por qué es sencillo

La infraestructura ya existe al 100%:
- `getCategoryItems(id)` → devuelve los items de una categoría
- `hiddenCategories` → Set con las categorías ocultas
- `setHiddenCategories` → actualiza el estado
- `saveHiddenCategoriesToDB(newSet)` → persiste en `budgets.metadata.hidden_categories`
- `toggleHideCategory` → oculta/muestra una categoría individual

Solo falta una función nueva que las agrupe y un botón en la UI.

## Cambio técnico — solo `src/components/BudgetDetailsDialog.tsx`

### Nueva función `hideEmptyCategories()`

```ts
const hideEmptyCategories = () => {
  const emptyIds = budgetCategories
    .filter(cat => getCategoryItems(cat.id).length === 0)
    .map(cat => cat.id);
  
  if (emptyIds.length === 0) {
    toast({ title: "Sin categorías vacías", description: "Todas las categorías tienen al menos un elemento." });
    return;
  }
  
  const newHidden = new Set(hiddenCategories);
  emptyIds.forEach(id => newHidden.add(id));
  setHiddenCategories(newHidden);
  saveHiddenCategoriesToDB(newHidden);
  
  toast({
    title: "Listo",
    description: `${emptyIds.length} ${emptyIds.length === 1 ? 'categoría vacía ocultada' : 'categorías vacías ocultadas'}`
  });
};
```

### Botón añadido en el header del panel (línea ~2903)

Justo **antes** del botón "Añadir equipo":

```tsx
<Button
  onClick={hideEmptyCategories}
  size="sm"
  variant="outline"
  className="bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 border-gray-500/20 text-xs"
  title="Ocultar categorías vacías"
>
  <Eraser className="w-3 h-3" />
</Button>
```

- Icono: `Eraser` (borrador/escoba de lucide-react)  
- Sin texto para no ocupar espacio, solo el icono con tooltip `title`
- Color neutro (gris) para diferenciarlo del azul "Añadir equipo" y morado "Subir Factura"

### Import añadido

Añadir `Eraser` al import de `lucide-react` en la línea 1 del archivo.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/BudgetDetailsDialog.tsx` | Nueva función `hideEmptyCategories` + botón `Eraser` + import |

**Sin tocar**: base de datos, queries, otros componentes. El sistema de categorías ocultas ya existe y funciona correctamente.
