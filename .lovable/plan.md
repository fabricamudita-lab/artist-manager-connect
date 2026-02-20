
# Reorganización: Categorías ocultas dentro del panel "Gestión de Categorías"

## Objetivo

Consolidar la gestión de categorías en un único lugar. Las categorías ocultas dejan de aparecer al final del listado principal y pasan a estar dentro del panel "Gestión de Categorías", como una subsección colapsable justo debajo de las categorías activas.

## Estructura visual resultante

```text
┌─────────────────────────────────────────────────────┐
│  Gestión de Categorías                              │
├─────────────────────────────────────────────────────┤
│  ⠿  Producción         4 elementos  Selecc.  ✏ 🗑  │
│  ⠿  Grabación          5 elementos  Selecc.  ✏ 🗑  │
│  ⠿  Diseño             5 elementos  Selecc.  ✏ 🗑  │
│  ...                                                │
│  [+ Agregar Nueva Categoría]                        │
│                                                     │
│  ▼ CATEGORÍAS OCULTAS (11)  ─────────────────────── │
│    🎵 Artista Principal             [👁 Mostrar]    │
│    👥 Músicos                       [👁 Mostrar]    │
│    🔧 Equipo técnico                [👁 Mostrar]    │
└─────────────────────────────────────────────────────┘
```

## Cambios técnicos

### 1. Eliminar sección de categorías ocultas del listado principal
**Archivo:** `src/components/BudgetDetailsDialog.tsx`  
**Líneas 3816–3852** — Eliminar el bloque `{/* Hidden categories — always visible, one-click restore */}` completo. Ya no es necesario ahí porque se mueve dentro del panel de gestión.

### 2. Añadir subsección colapsable de ocultas dentro del panel de gestión
**Líneas 3075–3083** — Justo antes del botón "+ Agregar Nueva Categoría", insertar:

```tsx
{/* Hidden categories subsection inside the management panel */}
{hiddenCategories.size > 0 && (
  <Collapsible defaultOpen={false}>
    <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors text-xs font-semibold uppercase tracking-wider">
      <div className="flex items-center gap-2">
        <EyeOff className="w-3.5 h-3.5" />
        <span>Categorías ocultas ({hiddenCategories.size})</span>
      </div>
      <ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="mt-1 rounded-lg overflow-hidden border border-gray-700 divide-y divide-gray-700">
        {sortCategoriesWithPriority(budgetCategories)
          .filter(c => hiddenCategories.has(c.id))
          .map(category => {
            const IconComponent = iconMap[category.icon_name as keyof typeof iconMap] || DollarSign;
            return (
              <div key={category.id} className="flex items-center justify-between px-3 py-2 bg-gray-800">
                <div className="flex items-center gap-2 text-gray-400">
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm">{category.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-white/10 text-xs gap-1 h-7"
                  onClick={() => setHiddenCategories(prev => {
                    const next = new Set(prev); next.delete(category.id); return next;
                  })}
                >
                  <Eye className="w-3 h-3" /> Mostrar
                </Button>
              </div>
            );
          })}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

El componente `Collapsible` ya está instalado (`@radix-ui/react-collapsible`) y ya existe en el proyecto (`src/components/ui/collapsible.tsx`). Solo hay que importarlo en `BudgetDetailsDialog.tsx`.

## Archivos afectados

| Archivo | Líneas | Acción |
|---|---|---|
| `src/components/BudgetDetailsDialog.tsx` | 3816–3852 | Eliminar bloque de ocultas del listado principal |
| `src/components/BudgetDetailsDialog.tsx` | 3075 (antes del botón +) | Insertar subsección colapsable de ocultas |
| `src/components/BudgetDetailsDialog.tsx` | imports | Añadir `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` |

Sin cambios en base de datos. Sin nuevos archivos.
