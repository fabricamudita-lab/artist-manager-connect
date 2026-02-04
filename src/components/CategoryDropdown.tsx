import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

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
  onCreateNew?: () => void;
}

export function CategoryDropdown({
  categories,
  selectedCategory,
  onCategoryChange,
  allLabel = 'Todas las categorías',
  allCount,
  onCreateNew,
}: CategoryDropdownProps) {
  const totalCount = allCount ?? categories.reduce((sum, cat) => sum + cat.count, 0);
  
  // Ordenar por cantidad de miembros (mayor a menor), filtrando categorías vacías
  const sortedCategories = [...categories]
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count);

  // Obtener el label de la categoría seleccionada
  const getSelectedLabel = () => {
    if (selectedCategory === 'all') {
      return `Todas (${totalCount})`;
    }
    const cat = categories.find(c => c.value === selectedCategory);
    return cat ? `${cat.label} (${cat.count})` : allLabel;
  };

  const handleValueChange = (value: string) => {
    if (value === '__new__') {
      onCreateNew?.();
    } else {
      onCategoryChange(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Categoría:
      </Label>
      <Select value={selectedCategory} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[220px] bg-background">
          <SelectValue placeholder={allLabel}>
            {getSelectedLabel()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>Todas</span>
              <span className="text-muted-foreground">({totalCount})</span>
            </div>
          </SelectItem>
          {sortedCategories.length > 0 && <SelectSeparator />}
          {sortedCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  <span>{cat.label}</span>
                  <span className="text-muted-foreground">({cat.count})</span>
                </div>
              </SelectItem>
            );
          })}
          
          {/* New Category Option */}
          {onCreateNew && (
            <>
              <SelectSeparator />
              <SelectItem value="__new__" className="text-primary">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Nueva Categoría</span>
                </div>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}