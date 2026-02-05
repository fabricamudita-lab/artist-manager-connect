

# Plan: Mostrar Categorías Vacías en el Dropdown

## Problema Identificado

La categoría "Test 2" sí existe en el sistema (está guardada en `localStorage` como `custom_team_categories`), pero el `CategoryDropdown` la oculta porque filtra solo las categorías con miembros (`count > 0`).

```text
┌─────────────────────────────────────────────────────────────┐
│ Flujo actual del problema                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario crea "Test 2" ──► Se guarda en localStorage ✓  │
│                                                             │
│  2. customCategories se actualiza ✓                        │
│                                                             │
│  3. allCategoriesForDisplay incluye "Test 2" ✓             │
│                                                             │
│  4. categoryPillsData incluye "Test 2" con count: 0 ✓      │
│                                                             │
│  5. CategoryDropdown recibe "Test 2" ✓                     │
│                                                             │
│  6. CategoryDropdown FILTRA categorías con count > 0 ❌    │
│     → "Test 2" (count: 0) es EXCLUIDA                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Línea problemática en `CategoryDropdown.tsx`:**
```tsx
// Línea 35 - filtra categorías vacías
const nonEmptyCategories = categories.filter(cat => cat.count > 0);
```

## Solución

Modificar `CategoryDropdown` para que NO filtre las categorías vacías. Si una categoría existe (ya sea del sistema o personalizada), debería mostrarse siempre en el dropdown para que los usuarios puedan:
1. Ver que existe
2. Asignar miembros a ella

## Cambio Específico

| Archivo | Cambio |
|---------|--------|
| `src/components/CategoryDropdown.tsx` | Eliminar el filtro de `count > 0` |

**Antes:**
```tsx
const sortedCategories = useMemo(() => {
  const savedOrder = localStorage.getItem('category_order');
  const nonEmptyCategories = categories.filter(cat => cat.count > 0);  // ❌ Problema
  
  if (savedOrder) {
    // ... ordenar nonEmptyCategories
  }
  return nonEmptyCategories;
}, [categories]);
```

**Después:**
```tsx
const sortedCategories = useMemo(() => {
  const savedOrder = localStorage.getItem('category_order');
  
  if (savedOrder) {
    try {
      const orderIds: string[] = JSON.parse(savedOrder);
      return [...categories].sort((a, b) => {  // ✓ Incluye todas
        const aIndex = orderIds.indexOf(a.value);
        const bIndex = orderIds.indexOf(b.value);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    } catch {
      return categories;
    }
  }
  return categories;  // ✓ Sin filtrar
}, [categories]);
```

## Resultado Esperado

Después del cambio, el dropdown mostrará:
- ✓ Management (2)
- ✓ Legal (1)
- ✓ Equipo Artístico (1)
- ✓ Banda (7)
- ✓ Equipo Técnico (2)
- ✓ Producción (1)
- ✓ Tour Manager (1)
- ✓ Booking (1)
- ✓ Productor (1)
- ✓ Otros (1)
- ✓ **Test 2 (0)** ← Ahora visible

