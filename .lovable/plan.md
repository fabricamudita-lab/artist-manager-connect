
# Plan: Mostrar Categorías Personalizadas en "Categoría Principal"

## Problema

El selector de "Categoría principal" en `EditContactDialog` solo muestra las categorías del sistema (`TEAM_CATEGORIES`) y no incluye las categorías personalizadas creadas por el usuario (como "Test 2").

```text
┌─────────────────────────────────────────────────────────────┐
│ Flujo actual                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EditContactDialog                                          │
│    └── Solo importa TEAM_CATEGORIES (del sistema)          │
│    └── No recibe customCategories como prop                │
│    └── El Select solo itera sobre TEAM_CATEGORIES          │
│                                                             │
│  Teams.tsx                                                  │
│    └── Tiene customCategories en el estado                 │
│    └── NO pasa customCategories a EditContactDialog  ❌    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Solución

Modificar `EditContactDialog` para que acepte categorías personalizadas y las muestre en el selector.

## Cambios Requeridos

### 1. Actualizar interfaz de props en EditContactDialog

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `customCategories` | `TeamCategoryOption[]` | Categorías personalizadas (opcional) |

### 2. Combinar categorías en el Select

```tsx
// Antes (línea 548-554)
{TEAM_CATEGORIES.map(cat => (
  <SelectItem key={cat.value} value={cat.value}>
    {cat.label}
  </SelectItem>
))}

// Después
{[...TEAM_CATEGORIES, ...customCategories].map(cat => (
  <SelectItem key={cat.value} value={cat.value}>
    <div className="flex items-center gap-2">
      {cat.label}
      {cat.isCustom && (
        <span className="text-xs text-muted-foreground">(personalizada)</span>
      )}
    </div>
  </SelectItem>
))}
```

### 3. Pasar las props desde Teams.tsx y Agenda.tsx

```tsx
// Teams.tsx línea 1010
<EditContactDialog
  ...
  customCategories={customCategories}  // Añadir esta línea
/>
```

Para `Agenda.tsx`, también necesitará cargar las categorías personalizadas desde localStorage.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/EditContactDialog.tsx` | Añadir prop `customCategories`, combinar con `TEAM_CATEGORIES` en el selector |
| `src/pages/Teams.tsx` | Pasar `customCategories` al EditContactDialog |
| `src/pages/Agenda.tsx` | Cargar customCategories desde localStorage y pasarlas al EditContactDialog |

## Consistencia con otros componentes

Este cambio sigue el mismo patrón que ya usan:
- `AddTeamContactDialog` (ya recibe `customCategories`)
- `TeamCategorySelector` (ya recibe `customCategories`)
- `CategoryDropdown` (ya recibe todas las categorías)
