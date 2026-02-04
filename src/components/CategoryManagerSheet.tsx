import { useState } from 'react';
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
  Plus, Pencil, Trash2, Tags, Check, X, Lock
} from 'lucide-react';
import { TeamCategoryOption } from '@/lib/teamCategories';

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemCategories: TeamCategoryOption[];
  customCategories: TeamCategoryOption[];
  categoryCounts: Map<string, number>;
  onCreateNew: (name: string) => void;
  onRename: (categoryValue: string, newLabel: string) => void;
  onDelete: (categoryValue: string) => void;
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
}: CategoryManagerSheetProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  // Filter system categories that have members
  const activeSystemCategories = systemCategories.filter(
    cat => (categoryCounts.get(cat.value) || 0) > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Gestor de Categorías
          </SheetTitle>
          <SheetDescription>
            Administra las categorías de tu equipo
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

          {/* Custom Categories Section */}
          {customCategories.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">
                Categorías personalizadas
              </div>
              <div className="space-y-2">
                {customCategories.map((cat) => {
                  const count = categoryCounts.get(cat.value) || 0;
                  const isEditing = editingCategory === cat.value;

                  return (
                    <Card key={cat.value}>
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        {isEditing ? (
                          <>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="h-8 flex-1"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-sm">{cat.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {count}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleStartEdit(cat)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onDelete(cat.value)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {customCategories.length === 0 && (
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
