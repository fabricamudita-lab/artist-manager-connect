
# Plan: Editor de Categorias en Panel Lateral

## Cambio Propuesto

Similar al Gestor de Equipos, el dropdown de categorias tendra una opcion "Editar Categorias" al final que abrira un panel lateral para gestionar las categorias (crear, renombrar, eliminar).

```text
ANTES:                          DESPUES:
┌────────────────────┐          ┌────────────────────┐
│ ✓ Todas (10)       │          │ ✓ Todas (10)       │
│─────────────────── │          │─────────────────── │
│   Banda (4)        │          │   Banda (4)        │
│   Equipo Tecnico   │          │   Equipo Tecnico   │
│   Management (1)   │          │   Management (1)   │
│   Legal (1)        │          │   Legal (1)        │
│─────────────────── │          │─────────────────── │
│ + Nueva Categoria  │          │ ⚙️ Editar Categorias│
└────────────────────┘          └────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │ Gestor de Categorias [X] │
                              │─────────────────────────-│
                              │ Administra tus categorias│
                              │                          │
                              │ [+ Nueva Categoria]      │
                              │                          │
                              │ ┌ CATEGORIAS DEL SISTEMA │
                              │ │ Banda           (4)    │
                              │ │ Equipo Tecnico  (1)    │
                              │ │ Management      (1)    │
                              │ │ Legal           (1)    │
                              │ └────────────────────────┘
                              │                          │
                              │ ┌ CATEGORIAS CUSTOM ─────│
                              │ │ [Mi Categoria]  [🗑️]   │
                              │ └────────────────────────┘
                              └──────────────────────────┘
```

## Notas de Diseño

- Las categorias del sistema (TEAM_CATEGORIES) son de solo lectura, no se pueden eliminar
- Las categorias personalizadas (custom) se pueden renombrar y eliminar
- Al eliminar una categoria custom, los contactos que la tenian quedaran sin categoria (o se asignan a "otro")

## Implementacion Tecnica

### Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `src/components/CategoryManagerSheet.tsx` | Crear | Panel lateral con lista de categorias y acciones |
| `src/components/CategoryDropdown.tsx` | Modificar | Cambiar "Nueva Categoria" por "Editar Categorias" |
| `src/pages/Teams.tsx` | Modificar | Conectar el nuevo panel y handlers |

### 1. Nuevo Componente: CategoryManagerSheet

```tsx
// src/components/CategoryManagerSheet.tsx
interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemCategories: TeamCategoryOption[];  // TEAM_CATEGORIES
  customCategories: TeamCategoryOption[];  // Categorias del usuario
  categoryCounts: Map<string, number>;     // Conteo de miembros por categoria
  onCreateNew: (name: string) => void;
  onRename: (categoryValue: string, newLabel: string) => void;
  onDelete: (categoryValue: string) => void;
}

// Estructura del panel:
// - Header con titulo "Gestor de Categorias"
// - Input + boton para crear nueva categoria
// - Seccion "Categorias del sistema" (solo lectura, con conteo)
// - Seccion "Categorias personalizadas" (con acciones editar/eliminar)
```

### 2. Modificar CategoryDropdown

```tsx
// Cambios en la interfaz:
interface CategoryDropdownProps {
  // ... props existentes ...
  onCreateNew?: () => void;        // ELIMINAR
  onManageCategories?: () => void;  // NUEVO
}

// Cambiar el item del footer:
{onManageCategories && (
  <SelectItem value="__manage__" className="text-primary">
    <div className="flex items-center gap-2">
      <Settings className="h-4 w-4" />
      <span>Editar Categorias</span>
    </div>
  </SelectItem>
)}
```

### 3. Modificar Teams.tsx

```tsx
// Nuevo estado
const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

// Nuevos handlers
const handleRenameCategory = (value: string, newLabel: string) => {
  setCustomCategories(prev => {
    const updated = prev.map(c => 
      c.value === value ? { ...c, label: newLabel } : c
    );
    localStorage.setItem('custom_team_categories', JSON.stringify(
      updated.map(c => ({ value: c.value, label: c.label }))
    ));
    return updated;
  });
};

const handleDeleteCategory = (value: string) => {
  setCustomCategories(prev => {
    const updated = prev.filter(c => c.value !== value);
    localStorage.setItem('custom_team_categories', JSON.stringify(
      updated.map(c => ({ value: c.value, label: c.label }))
    ));
    return updated;
  });
  toast.success('Categoria eliminada');
};

// Calcular conteos por categoria
const categoryCounts = useMemo(() => {
  const counts = new Map<string, number>();
  // Contar miembros por cada categoria...
  return counts;
}, [teamMembers, teamContacts]);

// Cambiar props de CategoryDropdown
<CategoryDropdown
  categories={categoryPillsData}
  selectedCategory={selectedCategoryFilter}
  onCategoryChange={setSelectedCategoryFilter}
  allCount={...}
  onManageCategories={() => setCategoryManagerOpen(true)}
/>

// Añadir el Sheet
<CategoryManagerSheet
  open={categoryManagerOpen}
  onOpenChange={setCategoryManagerOpen}
  systemCategories={TEAM_CATEGORIES}
  customCategories={customCategories}
  categoryCounts={categoryCounts}
  onCreateNew={(name) => {
    handleAddCustomCategory({ value: name.toLowerCase().replace(/\s+/g, '_'), label: name });
  }}
  onRename={handleRenameCategory}
  onDelete={handleDeleteCategory}
/>
```

## Resumen

1. **Dropdown simplificado**: Solo muestra "Editar Categorias" en lugar de "Nueva Categoria"
2. **Panel centralizado**: Todas las operaciones de gestion en un panel lateral
3. **Categorias protegidas**: Las del sistema no se pueden eliminar, solo las custom
4. **Coherencia visual**: Mismo estilo que el Gestor de Equipos
