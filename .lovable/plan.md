
# Plan: Mejoras en Equipos - "Ver todo" y Reordenamiento

## Resumen de Cambios

Se implementarán tres mejoras principales en la sección de Equipos:

1. **Añadir opción "Ver todo"** en el dropdown de equipos para poder volver a ver todos los contactos
2. **Reordenamiento en Gestor de Equipos** - arrastrar y soltar para cambiar el orden de los equipos
3. **Reordenamiento en Gestor de Categorías** - arrastrar y soltar para cambiar el orden de las categorías

## Cambios por Archivo

| Archivo | Cambio |
|---------|--------|
| `src/components/TeamDropdown.tsx` | Añadir opción "Ver todo" como primera opción |
| `src/components/TeamManagerSheet.tsx` | Implementar drag & drop con @dnd-kit |
| `src/components/CategoryManagerSheet.tsx` | Implementar drag & drop con @dnd-kit |
| `src/pages/Teams.tsx` | Añadir callbacks para persistir el nuevo orden |

---

## 1. TeamDropdown - Opción "Ver todo"

Añadir una nueva opción al principio del dropdown que permita volver a ver todos los equipos:

```text
┌──────────────────────────────────┐
│ Equipo: [Seleccionar equipo ▼]   │
├──────────────────────────────────┤
│ 👁️  Ver todo                     │  <- NUEVO
│ ─────────────────────────────────│
│ 🏢 00 Management (3)             │
│ ─────────────────────────────────│
│ 🎵 Rita Payés (5)                │
│ 🎵 VIC (6)                       │
│ ─────────────────────────────────│
│ ⚙️  Editar Equipos               │
└──────────────────────────────────┘
```

### Implementación:

```tsx
// TeamDropdown.tsx - Añadir opción "all" al inicio
<SelectContent>
  {/* Ver todo - NUEVO */}
  <SelectItem value="all">
    <div className="flex items-center gap-2">
      <Eye className="h-4 w-4 text-muted-foreground" />
      <span>Ver todo</span>
    </div>
  </SelectItem>
  
  <SelectSeparator />
  
  {/* Management Team */}
  <SelectItem value="00-management">
    ...
  </SelectItem>
  ...
</SelectContent>
```

---

## 2. TeamManagerSheet - Reordenamiento con Drag & Drop

```text
┌────────────────────────────────────────┐
│ 👥 Gestor de Equipos                ✕  │
│ Administra, edita o elimina equipos    │
│                                        │
│ [+ Nuevo Equipo]                       │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ [EQ] Equipo Test           [⋮] │ │  <- Arrastrable
│ │       0 miembros                   │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ [RI] Rita Payés            [⋮] │ │  <- Arrastrable
│ │       5 miembros                   │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ [VI] VIC                   [⋮] │ │  <- Arrastrable
│ │       6 miembros                   │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Implementación:

```tsx
// TeamManagerSheet.tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Componente sortable para cada equipo
function SortableTeamCard({ team, onEdit, onDuplicate, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Handle de drag */}
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Avatar>...</Avatar>
          <div>
            <p className="font-medium">{team.stageName || team.name}</p>
            <p className="text-sm text-muted-foreground">
              {team.memberCount} miembros
            </p>
          </div>
        </div>
        <DropdownMenu>...</DropdownMenu>
      </CardContent>
    </Card>
  );
}

// Props actualizadas
interface TeamManagerSheetProps {
  // ... props existentes ...
  onReorder?: (orderedTeamIds: string[]) => void;
}

// En el componente principal
export function TeamManagerSheet({ ..., onReorder }: TeamManagerSheetProps) {
  const [localTeams, setLocalTeams] = useState(teams);
  
  useEffect(() => {
    setLocalTeams(teams);
  }, [teams]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = localTeams.findIndex(t => t.id === active.id);
      const newIndex = localTeams.findIndex(t => t.id === over.id);
      
      const reordered = arrayMove(localTeams, oldIndex, newIndex);
      setLocalTeams(reordered);
      onReorder?.(reordered.map(t => t.id));
    }
  };

  return (
    <Sheet>
      <SheetContent>
        ...
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={localTeams.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {localTeams.map((team) => (
              <SortableTeamCard
                key={team.id}
                team={team}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 3. CategoryManagerSheet - Reordenamiento con Drag & Drop

Similar al gestor de equipos, pero solo para las **categorías personalizadas** (las del sistema mantienen su orden fijo):

```text
┌────────────────────────────────────────┐
│ 🏷️ Gestor de Categorías             ✕  │
│ Administra las categorías de tu equipo │
│                                        │
│ [Nueva categoría...] [+]               │
│                                        │
│ 🔒 Categorías del sistema              │
│ ┌────────────────────────────────────┐ │
│ │ 👥 Banda                      [0] │ │
│ └────────────────────────────────────┘ │
│ ...                                    │
│                                        │
│ Categorías personalizadas              │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ Moda [0]         [✏️] [🗑️]    │ │  <- Arrastrable
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ⠿ Sponsors [2]     [✏️] [🗑️]    │ │  <- Arrastrable
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Implementación:

```tsx
// CategoryManagerSheet.tsx
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Componente sortable para cada categoría personalizada
function SortableCategoryCard({ category, count, isEditing, ... }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.value });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-3 flex items-center justify-between gap-2">
        {/* Handle de drag */}
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        ...
      </CardContent>
    </Card>
  );
}

// Props actualizadas
interface CategoryManagerSheetProps {
  // ... props existentes ...
  onReorder?: (orderedCategoryValues: string[]) => void;
}

// Lógica similar al TeamManagerSheet
```

---

## 4. Teams.tsx - Persistencia del Orden

```tsx
// Teams.tsx

// Para equipos - guardar orden en localStorage
const handleTeamReorder = (orderedIds: string[]) => {
  localStorage.setItem('team_order', JSON.stringify(orderedIds));
  // Reordenar el array de artists según el nuevo orden
  const orderedArtists = orderedIds
    .map(id => artists.find(a => a.id === id))
    .filter(Boolean);
  setArtists(orderedArtists);
};

// Para categorías personalizadas - ya se guardan en localStorage
const handleCategoryReorder = (orderedValues: string[]) => {
  const reorderedCustomCategories = orderedValues
    .map(value => customCategories.find(c => c.value === value))
    .filter(Boolean);
  setCustomCategories(reorderedCustomCategories);
  localStorage.setItem('custom_team_categories', JSON.stringify(
    reorderedCustomCategories.map(c => ({ value: c.value, label: c.label }))
  ));
};

// Pasar callbacks a los sheets
<TeamManagerSheet
  ...
  onReorder={handleTeamReorder}
/>

<CategoryManagerSheet
  ...
  onReorder={handleCategoryReorder}
/>
```

---

## Flujo de Usuario Final

1. **Ver todo**: Usuario selecciona un artista -> puede volver a "Ver todo" desde el dropdown
2. **Reordenar equipos**: Abre Gestor de Equipos -> arrastra un equipo -> suelta en nueva posición -> orden guardado
3. **Reordenar categorías**: Abre Gestor de Categorías -> arrastra categoría personalizada -> suelta -> orden guardado

## Dependencias

El proyecto ya tiene instalado `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities`, por lo que no se requieren nuevas dependencias.

## Resumen de Archivos a Modificar

1. `src/components/TeamDropdown.tsx` - Añadir opción "Ver todo"
2. `src/components/TeamManagerSheet.tsx` - Implementar drag & drop
3. `src/components/CategoryManagerSheet.tsx` - Implementar drag & drop
4. `src/pages/Teams.tsx` - Añadir handlers de reorden y persistencia
