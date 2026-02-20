
# Dos mejoras: Persistir categorías ocultas + mostrar contador de elementos

## Objetivo

1. **Persistencia**: Las categorías que el usuario oculta deben seguir ocultas la próxima vez que abra el presupuesto.
2. **Contador**: En la sección "Categorías ocultas" (dentro del panel de gestión), cada categoría debe mostrar cuántos elementos contiene.

---

## Solución técnica

### Persistencia — usar `metadata` (jsonb) de la tabla `budgets`

La tabla `budgets` ya tiene una columna `metadata` de tipo `jsonb`. Es el lugar ideal para guardar las preferencias de visualización sin necesidad de migraciones ni nuevas tablas.

La estructura que se guardará:
```json
{
  "hidden_categories": ["uuid-categoria-1", "uuid-categoria-2"]
}
```

**Flujo de datos:**

```text
Abrir presupuesto
  → fetchBudgetMetadata() lee budgets.metadata
  → extrae hidden_categories → inicializa hiddenCategories Set

Usuario oculta categoría (clic en 👁)
  → setHiddenCategories() actualiza estado local
  → saveHiddenCategoriesToDB() escribe budgets.metadata

Usuario restaura categoría (clic en Mostrar)
  → setHiddenCategories() actualiza estado local
  → saveHiddenCategoriesToDB() escribe budgets.metadata
```

### Cambios en `src/components/BudgetDetailsDialog.tsx`

**1. Carga al abrir** — dentro del `useEffect` existente (línea 372) que ya llama a `fetchBudgetCategories()`:

Añadir lectura de `budgets.metadata`:
```tsx
const { data: budgetMeta } = await supabase
  .from('budgets')
  .select('metadata')
  .eq('id', budget.id)
  .single();

const hidden = (budgetMeta?.metadata as any)?.hidden_categories ?? [];
setHiddenCategories(new Set(hidden));
```

**2. Nueva función `saveHiddenCategoriesToDB`**:
```tsx
const saveHiddenCategoriesToDB = async (newHidden: Set<string>) => {
  await supabase
    .from('budgets')
    .update({ 
      metadata: { 
        ...((budgetData as any).metadata || {}),
        hidden_categories: Array.from(newHidden) 
      } 
    })
    .eq('id', budget.id);
};
```

**3. Helper `toggleHideCategory`** que actualiza estado + persiste:
```tsx
const toggleHideCategory = (categoryId: string, hide: boolean) => {
  setHiddenCategories(prev => {
    const next = new Set(prev);
    if (hide) next.add(categoryId); else next.delete(categoryId);
    saveHiddenCategoriesToDB(next);
    return next;
  });
};
```

**4. Reemplazar los 2 lugares donde se usa `setHiddenCategories` directamente** para llamar a `toggleHideCategory` en su lugar:
- Línea 3283 (ocultar desde vista principal, icono ojo)
- Línea 3103 (restaurar desde panel de gestión, botón Mostrar)

### Contador de elementos en categorías ocultas

Actualmente (línea 3094-3097), cada fila de la lista de ocultas sólo muestra icono + nombre. Se añade el conteo usando la función `getCategoryItems()` que ya existe:

**Antes:**
```tsx
<div className="flex items-center gap-2 text-gray-400">
  <IconComponent className="w-4 h-4" />
  <span className="text-sm">{category.name}</span>
</div>
```

**Después:**
```tsx
<div className="flex items-center gap-2 text-gray-400">
  <IconComponent className="w-4 h-4" />
  <span className="text-sm">{category.name}</span>
  <span className="text-xs text-gray-500 ml-1">
    ({getCategoryItems(category.id).length})
  </span>
</div>
```

---

## Archivos afectados

| Archivo | Cambios |
|---|---|
| `src/components/BudgetDetailsDialog.tsx` | Carga de metadata al abrir, nueva función save, helper toggle, contador en lista de ocultas |

Sin migraciones. Sin nuevos archivos. La columna `metadata` (jsonb) ya existe en producción.
