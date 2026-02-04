
# Plan: Permitir Reordenar Todas las Categorías

## Problema Actual

El Gestor de Categorías actualmente divide las categorías en dos grupos:
1. **Categorías del sistema** - NO reordenables (con candado 🔒)
2. **Categorías personalizadas** - SÍ reordenables

El usuario quiere poder reordenar TODAS las categorías igual que puede reordenar los equipos.

## Solución Propuesta

Unificar todas las categorías en una sola lista reordenable, manteniendo la distinción visual pero permitiendo arrastrar todas:

```text
ANTES:                              DESPUES:
┌───────────────────────────┐      ┌───────────────────────────┐
│ 🔒 Categorías del sistema │      │ Categorías                │
│ ┌───────────────────────┐ │      │ ┌───────────────────────┐ │
│ │ 👥 Banda          [7] │ │      │ │ ⠿ 👥 Banda       [7] │ │ <- Arrastrable
│ └───────────────────────┘ │      │ └───────────────────────┘ │
│ ┌───────────────────────┐ │      │ ┌───────────────────────┐ │
│ │ 👥 Equipo Artístico[1]│ │      │ │ ⠿ 👥 Eq. Artístico[1]│ │ <- Arrastrable
│ └───────────────────────┘ │      │ └───────────────────────┘ │
│ ...                       │      │ ...                       │
│                           │      │ ┌───────────────────────┐ │
│ Categorías personalizadas │      │ │ ⠿ 🏷️ Mi Categoría[0] │ │ <- Arrastrable
│ ┌───────────────────────┐ │      │ │           [✏️] [🗑️]  │ │    + Editable
│ │ ⠿ Mi Categoría [0]    │ │      │ └───────────────────────┘ │
│ └───────────────────────┘ │      │                           │
└───────────────────────────┘      └───────────────────────────┘
```

## Cambios por Archivo

| Archivo | Cambio |
|---------|--------|
| `src/components/CategoryManagerSheet.tsx` | Unificar lista + drag & drop para todas |
| `src/pages/Teams.tsx` | Actualizar handler para persistir orden de todas las categorías |

---

## 1. Modificar CategoryManagerSheet.tsx

### Nuevas Props

```tsx
interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemCategories: TeamCategoryOption[];
  customCategories: TeamCategoryOption[];
  categoryCounts: Map<string, number>;
  onCreateNew: (name: string) => void;
  onRename: (categoryValue: string, newLabel: string) => void;
  onDelete: (categoryValue: string) => void;
  onReorder?: (orderedCategoryValues: string[]) => void;  // Ahora incluye TODAS
}
```

### Nuevo Componente SortableCard (unificado)

Crear un componente que muestre:
- Handle de arrastre (⠿) para TODAS las categorías
- Icono de la categoría
- Nombre + contador
- Botones editar/eliminar solo para personalizadas

```tsx
function SortableCategoryCard({
  category,
  count,
  isCustom,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onEditKeyDown,
  onDelete,
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.value });

  const Icon = category.icon || Tag;

  return (
    <Card ref={setNodeRef} style={...}>
      <CardContent className="p-3 flex items-center justify-between gap-2">
        {/* Handle de drag - SIEMPRE visible */}
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Icono + Nombre */}
        <div className="flex items-center gap-3 flex-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {isEditing ? (
            <Input value={editValue} ... />
          ) : (
            <span className="text-sm">{category.label}</span>
          )}
        </div>

        {/* Badge del sistema */}
        {!isCustom && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Sistema
          </Badge>
        )}

        {/* Contador */}
        <Badge variant="secondary">{count}</Badge>

        {/* Botones editar/eliminar - solo para personalizadas */}
        {isCustom && !isEditing && (
          <div className="flex gap-1">
            <Button ... onClick={onStartEdit}><Pencil /></Button>
            <Button ... onClick={onDelete}><Trash2 /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Lista Unificada

```tsx
// Combinar todas las categorías
const allCategories = [...systemCategories, ...customCategories];
const [localCategories, setLocalCategories] = useState(allCategories);

useEffect(() => {
  // Cargar orden guardado o usar orden por defecto
  const savedOrder = localStorage.getItem('category_order');
  if (savedOrder) {
    const orderIds = JSON.parse(savedOrder);
    const ordered = orderIds
      .map(id => allCategories.find(c => c.value === id))
      .filter(Boolean);
    // Añadir nuevas categorías al final
    const newCats = allCategories.filter(c => !orderIds.includes(c.value));
    setLocalCategories([...ordered, ...newCats]);
  } else {
    setLocalCategories(allCategories);
  }
}, [systemCategories, customCategories]);

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIndex = localCategories.findIndex(c => c.value === active.id);
    const newIndex = localCategories.findIndex(c => c.value === over.id);
    const reordered = arrayMove(localCategories, oldIndex, newIndex);
    setLocalCategories(reordered);
    onReorder?.(reordered.map(c => c.value));
  }
};

return (
  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <SortableContext items={localCategories.map(c => c.value)}>
      {localCategories.map((cat) => (
        <SortableCategoryCard
          key={cat.value}
          category={cat}
          count={categoryCounts.get(cat.value) || 0}
          isCustom={cat.isCustom || false}
          // ... otros props
        />
      ))}
    </SortableContext>
  </DndContext>
);
```

---

## 2. Modificar Teams.tsx

### Actualizar Handler de Reorden

```tsx
// Guardar orden de TODAS las categorías (sistema + personalizadas)
const handleCategoryReorder = (orderedValues: string[]) => {
  localStorage.setItem('category_order', JSON.stringify(orderedValues));
  
  // Reordenar customCategories según el nuevo orden
  const reorderedCustom = orderedValues
    .filter(v => customCategories.some(c => c.value === v))
    .map(v => customCategories.find(c => c.value === v)!)
    .filter(Boolean);
  setCustomCategories(reorderedCustom);
};
```

### Aplicar Orden al Renderizar

Al mostrar las categorías en el dropdown o en el grid, respetar el orden guardado:

```tsx
const getCategoriesInOrder = () => {
  const savedOrder = localStorage.getItem('category_order');
  const allCats = [...TEAM_CATEGORIES, ...customCategories];
  
  if (savedOrder) {
    const orderIds = JSON.parse(savedOrder);
    return orderIds
      .map(id => allCats.find(c => c.value === id))
      .filter(Boolean);
  }
  return allCats;
};
```

---

## Resumen Visual

```text
┌────────────────────────────────────────┐
│ 🏷️ Gestor de Categorías             ✕  │
│ Arrastra para cambiar el orden         │
│                                        │
│ [Nueva categoría...] [+]               │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ 👥 Banda        [Sistema] [7]   │ │ <- Arrastrable
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ 👥 Eq. Artístico [Sistema] [1]  │ │ <- Arrastrable
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ 🔧 Eq. Técnico   [Sistema] [2]  │ │ <- Arrastrable
│ └────────────────────────────────────┘ │
│ ...                                    │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ 🏷️ Moda   [0]   [✏️] [🗑️]     │ │ <- Arrastrable + Editable
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

## Diferencias Visuales

- **Categorías del sistema**: Tienen badge "Sistema", NO tienen botones editar/eliminar
- **Categorías personalizadas**: Tienen botones editar/eliminar, sin badge "Sistema"
- **Ambas**: Tienen handle de arrastre (⠿) y son reordenables

## Archivos a Modificar

1. `src/components/CategoryManagerSheet.tsx` - Unificar lista con drag & drop para todas
2. `src/pages/Teams.tsx` - Actualizar handler para persistir orden completo
