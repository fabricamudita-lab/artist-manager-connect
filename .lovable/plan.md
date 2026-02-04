

# Plan: Simplificar Categorías con Menú Desplegable

## Problema Actual

La vista de equipos muestra demasiadas etiquetas de categorías como pills individuales:
- Muchas categorías repetidas (Booking x3, Tour Manager x2, etc.)
- Ocupan mucho espacio horizontal
- Dificultan encontrar la categoría deseada
- Visualmente desordenado

## Solución Propuesta

Reemplazar las pills de categorías por un sistema más ordenado con menú desplegable:

```text
+----------------------------------------------------------+
| EQUIPO: M00DITA      [5 miembros]   [Añadir] [Invitar]   |
|                                                          |
|  Categoría: [Todas ▼]  [Grid] [List]                     |
|                                                          |
|  Al hacer clic en el dropdown:                           |
|  +---------------------+                                 |
|  | ✓ Todas (15)        |                                 |
|  +---------------------+                                 |
|  | Banda (7)           |                                 |
|  | Equipo Técnico (3)  |                                 |
|  | Management (2)      |                                 |
|  | Booking (2)         |                                 |
|  | Tour Manager (1)    |                                 |
|  +---------------------+                                 |
+----------------------------------------------------------+
```

### Cambios Visuales

| Antes | Después |
|-------|---------|
| 12+ pills ocupando 3 filas | 1 dropdown compacto |
| Pills repetidas | Categorías únicas agrupadas |
| Desorden visual | Interfaz limpia |

## Implementación Técnica

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/CategoryDropdown.tsx` | Nuevo componente con Select de categorías |
| `src/pages/Teams.tsx` | Reemplazar CategoryPills por CategoryDropdown |

### Código del Nuevo Componente

```tsx
// CategoryDropdown.tsx
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Category {
  value: string;
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  allLabel?: string;
  allCount?: number;
}

export function CategoryDropdown({
  categories,
  selectedCategory,
  onCategoryChange,
  allLabel = 'Todas las categorías',
  allCount,
}: CategoryDropdownProps) {
  const totalCount = allCount ?? categories.reduce((sum, cat) => sum + cat.count, 0);
  
  // Ordenar por cantidad de miembros (mayor a menor)
  const sortedCategories = [...categories].sort((a, b) => b.count - a.count);

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Categoría:
      </Label>
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            Todas ({totalCount})
          </SelectItem>
          <SelectSeparator />
          {sortedCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2 w-full">
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  <span>{cat.label}</span>
                  <span className="ml-auto text-muted-foreground">
                    ({cat.count})
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
```

### Cambios en Teams.tsx

```tsx
// Antes
<CategoryPills
  categories={uniqueCategories}
  selectedCategory={selectedCategory}
  onCategoryChange={setSelectedCategory}
  allLabel="Todos"
  allCount={members.length}
/>

// Después
<CategoryDropdown
  categories={uniqueCategories}
  selectedCategory={selectedCategory}
  onCategoryChange={setSelectedCategory}
  allLabel="Todas las categorías"
  allCount={members.length}
/>
```

### Layout Final del Header de Miembros

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-4">
    <h2 className="text-lg font-semibold">
      Equipo: {selectedTeam?.name}
    </h2>
    <Badge variant="secondary">{members.length} miembros</Badge>
  </div>
  
  <div className="flex items-center gap-3">
    <CategoryDropdown
      categories={uniqueCategories}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
    />
    
    {/* Toggle Vista Grid/Lista */}
    <div className="flex gap-1 border rounded-md p-1">
      <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon">
        <Grid className="h-4 w-4" />
      </Button>
      <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon">
        <List className="h-4 w-4" />
      </Button>
    </div>
    
    <Button>+ Añadir</Button>
    <Button variant="outline">Invitar</Button>
  </div>
</div>
```

## Resultado Esperado

1. **Interfaz limpia**: Un solo dropdown en lugar de muchas pills
2. **Fácil navegación**: Menú ordenado con todas las categorías disponibles
3. **Menos ruido visual**: Solo se ve la categoría actualmente seleccionada
4. **Mejor organización**: Categorías agrupadas y ordenadas por cantidad de miembros (las más pobladas primero)

