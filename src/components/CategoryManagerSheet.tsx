import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Pencil, Trash2, Tags, Check, X, Lock, GripVertical
} from 'lucide-react';
import { TeamCategoryOption } from '@/lib/teamCategories';
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

interface SortableCategoryCardProps {
  category: TeamCategoryOption;
  count: number;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onDelete: () => void;
}

function SortableCategoryCard({
  category,
  count,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="p-3 flex items-center justify-between gap-2">
        {isEditing ? (
          <>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onKeyDown={onEditKeyDown}
              className="h-8 flex-1"
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onSaveEdit}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onCancelEdit}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm">{category.label}</span>
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onStartEdit}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemCategories: TeamCategoryOption[];
  customCategories: TeamCategoryOption[];
  categoryCounts: Map<string, number>;
  onCreateNew: (name: string) => void;
  onRename: (categoryValue: string, newLabel: string) => void;
  onDelete: (categoryValue: string) => void;
  onReorder?: (orderedCategoryValues: string[]) => void;
}

export function CategoryManagerSheet({
  open,
  onOpenChange,
  systemCategories,
  customCategories,
  categoryCounts,
  onCreateNew,
  onRename,
  onDelete,
  onReorder,
}: CategoryManagerSheetProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localCustomCategories, setLocalCustomCategories] = useState<TeamCategoryOption[]>(customCategories);

  useEffect(() => {
    setLocalCustomCategories(customCategories);
  }, [customCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreate = () => {
    if (newCategoryName.trim()) {
      onCreateNew(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const handleStartEdit = (category: TeamCategoryOption) => {
    setEditingCategory(category.value);
    setEditValue(category.label);
  };

  const handleSaveEdit = () => {
    if (editingCategory && editValue.trim()) {
      onRename(editingCategory, editValue.trim());
      setEditingCategory(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = localCustomCategories.findIndex(c => c.value === active.id);
      const newIndex = localCustomCategories.findIndex(c => c.value === over.id);
      
      const reordered = arrayMove(localCustomCategories, oldIndex, newIndex);
      setLocalCustomCategories(reordered);
      onReorder?.(reordered.map(c => c.value));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Gestor de Categorías
          </SheetTitle>
          <SheetDescription>
            Administra las categorías de tu equipo. Arrastra para reordenar las personalizadas.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Create new category */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nueva categoría..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={!newCategoryName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* System Categories Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Categorías del sistema
            </div>
            <div className="space-y-2">
              {systemCategories.map((cat) => {
                const Icon = cat.icon;
                const count = categoryCounts.get(cat.value) || 0;
                return (
                  <Card key={cat.value} className="bg-muted/30">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom Categories Section with Drag & Drop */}
          {localCustomCategories.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">
                Categorías personalizadas
              </div>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={localCustomCategories.map(c => c.value)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {localCustomCategories.map((cat) => {
                      const count = categoryCounts.get(cat.value) || 0;
                      const isEditing = editingCategory === cat.value;

                      return (
                        <SortableCategoryCard
                          key={cat.value}
                          category={cat}
                          count={count}
                          isEditing={isEditing}
                          editValue={editValue}
                          onStartEdit={() => handleStartEdit(cat)}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                          onEditValueChange={setEditValue}
                          onEditKeyDown={handleEditKeyDown}
                          onDelete={() => onDelete(cat.value)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {localCustomCategories.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay categorías personalizadas</p>
              <p className="text-xs mt-1">Crea una nueva categoría arriba</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
