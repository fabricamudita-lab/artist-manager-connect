import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Check, Plus, X, Users, UserCheck, Building, Mail, Shield, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TeamCategoryOption {
  value: string;
  label: string;
  icon?: any;
  isCustom?: boolean;
}

const DEFAULT_CATEGORIES: TeamCategoryOption[] = [
  { value: 'banda', label: 'Banda', icon: Users },
  { value: 'artistico', label: 'Equipo Artístico', icon: Users },
  { value: 'tecnico', label: 'Equipo Técnico', icon: UserCheck },
  { value: 'management', label: 'Management', icon: Building },
  { value: 'comunicacion', label: 'Comunicación', icon: Mail },
  { value: 'legal', label: 'Legal', icon: Shield },
  { value: 'produccion', label: 'Producción', icon: Users },
];

interface TeamCategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  customCategories?: TeamCategoryOption[];
  onAddCustomCategory?: (category: TeamCategoryOption) => void;
  placeholder?: string;
}

export function TeamCategorySelector({
  selectedCategories,
  onCategoriesChange,
  customCategories = [],
  onAddCustomCategory,
  placeholder = "Seleccionar etiquetas...",
}: TeamCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const toggleCategory = (value: string) => {
    if (selectedCategories.includes(value)) {
      onCategoriesChange(selectedCategories.filter(c => c !== value));
    } else {
      onCategoriesChange([...selectedCategories, value]);
    }
  };

  const removeCategory = (value: string) => {
    onCategoriesChange(selectedCategories.filter(c => c !== value));
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const value = newCategoryName.toLowerCase().replace(/\s+/g, '_');
    const newCategory: TeamCategoryOption = {
      value,
      label: newCategoryName.trim(),
      icon: Tag,
      isCustom: true,
    };

    onAddCustomCategory?.(newCategory);
    onCategoriesChange([...selectedCategories, value]);
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  const getCategoryLabel = (value: string) => {
    return allCategories.find(c => c.value === value)?.label || value;
  };

  const getCategoryIcon = (value: string) => {
    return allCategories.find(c => c.value === value)?.icon || Tag;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal h-auto min-h-10"
          >
            {selectedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat);
                  return (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="mr-1 mb-1"
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {getCategoryLabel(cat)}
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCategory(cat);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar etiqueta..." />
            <CommandList>
              <CommandEmpty>No se encontró ninguna etiqueta.</CommandEmpty>
              <CommandGroup heading="Etiquetas">
                {allCategories.map((category) => {
                  const Icon = category.icon || Tag;
                  const isSelected = selectedCategories.includes(category.value);
                  return (
                    <CommandItem
                      key={category.value}
                      value={category.value}
                      onSelect={() => toggleCategory(category.value)}
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{category.label}</span>
                      {category.isCustom && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          Personalizada
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                {showNewCategory ? (
                  <div className="p-2 space-y-2">
                    <Input
                      placeholder="Nombre de la etiqueta..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleAddNewCategory}
                        disabled={!newCategoryName.trim()}
                      >
                        Crear
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategoryName('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CommandItem onSelect={() => setShowNewCategory(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear nueva etiqueta...
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DEFAULT_CATEGORIES };
