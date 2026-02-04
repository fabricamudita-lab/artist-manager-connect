
# Plan: Sincronizar Orden de Categorías entre Gestor y Dropdown

## Problema Detectado

| Componente | ¿Aplica orden guardado? | Resultado |
|------------|------------------------|-----------|
| CategoryManagerSheet | SÍ (línea 196-214) | "Test" aparece primero |
| CategoryDropdown | SÍ (línea 33-54) | **Pero recibe datos desordenados** |
| Teams.tsx (`allCategoriesForDisplay`) | **NO** | Origen del problema |

El `CategoryDropdown` tiene el código correcto para ordenar, pero recibe `categoryPillsData` que ya viene del array `allCategoriesForDisplay` que **no respeta el orden guardado**.

## Solución

Modificar `Teams.tsx` para que `allCategoriesForDisplay` aplique el orden guardado en `localStorage`:

```tsx
// ANTES (línea 180 de Teams.tsx):
const allCategoriesForDisplay = [...TEAM_CATEGORIES, ...customCategories];

// DESPUÉS:
const allCategoriesForDisplay = useMemo(() => {
  const allCategories = [...TEAM_CATEGORIES, ...customCategories];
  const savedOrder = localStorage.getItem('category_order');
  
  if (savedOrder) {
    try {
      const orderIds: string[] = JSON.parse(savedOrder);
      return [...allCategories].sort((a, b) => {
        const aIndex = orderIds.indexOf(a.value);
        const bIndex = orderIds.indexOf(b.value);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    } catch {
      return allCategories;
    }
  }
  return allCategories;
}, [customCategories]);
```

## Actualización Inmediata

Además, necesitamos que cuando el usuario reordene en el gestor, el orden se refleje inmediatamente sin recargar la página. Para esto, añadiremos un estado que fuerce la recalculación:

```tsx
// Nuevo estado para disparar recálculo
const [categoryOrderVersion, setCategoryOrderVersion] = useState(0);

// En handleCategoryReorder, incrementar versión
const handleCategoryReorder = (orderedValues: string[]) => {
  localStorage.setItem('category_order', JSON.stringify(orderedValues));
  // ... resto del código ...
  setCategoryOrderVersion(v => v + 1); // Forzar recálculo
};

// Añadir a dependencias de useMemo
const allCategoriesForDisplay = useMemo(() => {
  // ... lógica de ordenación ...
}, [customCategories, categoryOrderVersion]);
```

## Archivo a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/Teams.tsx` | Convertir `allCategoriesForDisplay` a `useMemo` con orden guardado + añadir `categoryOrderVersion` |

## Flujo Final

```text
Usuario arrastra categoría en Gestor
         ↓
handleCategoryReorder guarda en localStorage
         ↓
setCategoryOrderVersion(v + 1)
         ↓
allCategoriesForDisplay se recalcula con nuevo orden
         ↓
categoryPillsData hereda el orden
         ↓
CategoryDropdown muestra el orden correcto
```

## Resumen

- **1 archivo a modificar**: `src/pages/Teams.tsx`
- **Cambio principal**: Convertir `allCategoriesForDisplay` de variable simple a `useMemo` que lea el orden desde `localStorage`
- **Cambio secundario**: Añadir `categoryOrderVersion` para forzar actualización inmediata al reordenar
