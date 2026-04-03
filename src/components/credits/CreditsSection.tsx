import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, UserPlus, Check, Copy, AlertTriangle, GripVertical, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrackCredit } from '@/hooks/useReleases';
import {
  getRoleLabel,
  getRoleCategory5,
  getCategoryMeta,
  CREDIT_CATEGORIES,
  type CreditCategory,
} from '@/lib/creditRoles';
import { GroupedRoleSelect } from '@/components/credits/GroupedRoleSelect';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkCreditContactDialog } from '@/components/credits/LinkCreditContactDialog';
import { AddCreditWithProfileForm } from '@/components/credits/AddCreditWithProfileForm';
import { toast } from 'sonner';

const sortCreditsBySortOrder = (credits: TrackCredit[]) => {
  return [...credits].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
};

interface CreditsSectionProps {
  credits: TrackCredit[];
  isLoading: boolean;
  isAddCreditOpen: boolean;
  setIsAddCreditOpen: (open: boolean) => void;
  createCredit: { mutate: (data: { name: string; role: string; contact_id?: string; publishing_percentage?: number; master_percentage?: number }) => void; isPending: boolean };
  editingCreditId: string | null;
  setEditingCreditId: (id: string | null) => void;
  updateCredit: { mutate: (args: { creditId: string; data: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null; sort_order: number }> }) => void; isPending: boolean };
  deleteCredit: { mutate: (id: string) => void };
  trackId: string;
  releaseArtistId?: string | null;
}

export function CreditsSection({
  credits,
  isLoading,
  isAddCreditOpen,
  setIsAddCreditOpen,
  createCredit,
  editingCreditId,
  setEditingCreditId,
  updateCredit,
  deleteCredit,
  trackId,
  releaseArtistId,
}: CreditsSectionProps) {
  const [copiedCredits, setCopiedCredits] = useState(false);
  const [addCategoryFilter, setAddCategoryFilter] = useState<CreditCategory | undefined>(undefined);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const sortedCredits = useMemo(() => sortCreditsBySortOrder(credits), [credits]);

  const creditsByCategory = useMemo(() => {
    const grouped: Record<string, TrackCredit[]> = {};
    CREDIT_CATEGORIES.forEach(cat => { grouped[cat.id] = []; });
    sortedCredits.forEach(credit => {
      const cat = getRoleCategory5(credit.role);
      if (cat) {
        grouped[cat].push(credit);
      } else {
        grouped['contribuidor'].push(credit);
      }
    });
    return grouped;
  }, [sortedCredits]);

  const publishingTotal = credits.reduce((sum, c) => sum + (c.publishing_percentage ?? 0), 0);
  const masterTotal = credits.reduce((sum, c) => sum + (c.master_percentage ?? 0), 0);
  const hasPublishingCredits = credits.some(c => c.publishing_percentage != null && c.publishing_percentage > 0);
  const hasMasterCredits = credits.some(c => c.master_percentage != null && c.master_percentage > 0);
  const hasPublishingError = hasPublishingCredits && publishingTotal !== 100;
  const hasMasterError = hasMasterCredits && masterTotal !== 100;

  const handleCopyCredits = () => {
    if (credits.length === 0) return;
    const groupedByRole: Record<string, string[]> = {};
    sortedCredits.forEach((credit) => {
      const role = credit.role || 'Otro';
      if (!groupedByRole[role]) groupedByRole[role] = [];
      groupedByRole[role].push(credit.name);
    });
    const formattedCredits = Object.entries(groupedByRole)
      .map(([role, names]) => `${getRoleLabel(role)}: ${names.join(' & ')}`)
      .join('\n');
    navigator.clipboard.writeText(formattedCredits);
    setCopiedCredits(true);
    toast.success('Créditos copiados');
    setTimeout(() => setCopiedCredits(false), 2000);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedCredits.findIndex(c => c.id === active.id);
    const newIndex = sortedCredits.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedCredits = arrayMove(sortedCredits, oldIndex, newIndex).map((credit, index) => ({
      ...credit,
      sort_order: index + 1,
    }));
    queryClient.setQueryData(['track-credits', trackId], reorderedCredits);
    try {
      for (const credit of reorderedCredits) {
        const { error } = await supabase
          .from('track_credits')
          .update({ sort_order: credit.sort_order })
          .eq('id', credit.id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['track-credits', trackId] });
    } catch (error) {
      console.error('Error updating credit order:', error);
      toast.error('Error al reordenar los créditos');
      queryClient.invalidateQueries({ queryKey: ['track-credits', trackId] });
    }
  };

  const handleOpenAddForCategory = (category: CreditCategory) => {
    setAddCategoryFilter(category);
    setIsAddCreditOpen(true);
  };

  const handleOpenAddGlobal = () => {
    setAddCategoryFilter(undefined);
    setIsAddCreditOpen(true);
  };

  const emptyLabels: Record<CreditCategory, string> = {
    compositor: 'Sin compositor registrado',
    autoria: 'Sin autoría registrada',
    produccion: 'Sin producción registrada',
    interprete: 'Sin intérprete registrado',
    contribuidor: 'Sin contribuidores',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Créditos y Autoría</Label>
          {credits.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopyCredits}
              title="Copiar créditos"
            >
              {copiedCredits ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenAddGlobal}>
          <UserPlus className="w-3 h-3 mr-1" />
          Añadir Crédito
        </Button>
      </div>

      {hasPublishingError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Autoría suma {publishingTotal.toFixed(1)}% — debe sumar 100%</span>
        </div>
      )}
      {hasMasterError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Master suma {masterTotal.toFixed(1)}% — debe sumar 100%</span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedCredits.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {CREDIT_CATEGORIES.map((cat) => {
                const catCredits = creditsByCategory[cat.id] || [];
                return (
                  <div key={cat.id} className={`rounded-lg border ${cat.borderClass} overflow-hidden`}>
                    <div className={`flex items-center justify-between px-3 py-1.5 ${cat.bgClass}`}>
                      <span className={`text-xs font-semibold ${cat.textClass}`}>{cat.label}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 ${cat.textClass} hover:bg-background/50`}
                        onClick={() => handleOpenAddForCategory(cat.id)}
                        title={`Añadir ${cat.label}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="divide-y divide-border">
                      {catCredits.length > 0 ? (
                        catCredits.map((credit) => (
                          <SortableCreditRow
                            key={credit.id}
                            credit={credit}
                            isEditing={editingCreditId === credit.id}
                            onStartEdit={() => setEditingCreditId(credit.id)}
                            onCancelEdit={() => setEditingCreditId(null)}
                            onSave={(data) => updateCredit.mutate({ creditId: credit.id, data })}
                            onDelete={() => deleteCredit.mutate(credit.id)}
                            isSaving={updateCredit.isPending}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground px-3 py-2 italic">
                          {emptyLabels[cat.id]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={isAddCreditOpen} onOpenChange={(open) => {
        setIsAddCreditOpen(open);
        if (!open) setAddCategoryFilter(undefined);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {addCategoryFilter 
                ? `Añadir ${CREDIT_CATEGORIES.find(c => c.id === addCategoryFilter)?.label || 'Crédito'}`
                : 'Añadir Crédito'
              }
            </DialogTitle>
          </DialogHeader>
          <AddCreditWithProfileForm
            onSubmit={(data) => createCredit.mutate(data)}
            isLoading={createCredit.isPending}
            releaseArtistId={releaseArtistId}
            filterCategory={addCategoryFilter}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sortable Credit Row
function SortableCreditRow({
  credit,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
}: {
  credit: TrackCredit;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null }>) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: credit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editRole, setEditRole] = useState(credit.role);
  const [editName, setEditName] = useState(credit.name);
  const [editPublishingPct, setEditPublishingPct] = useState<string>(
    credit.publishing_percentage != null ? String(credit.publishing_percentage) : ''
  );
  const [editMasterPct, setEditMasterPct] = useState<string>(
    credit.master_percentage != null ? String(credit.master_percentage) : ''
  );
  const hasContact = !!credit.contact_id;

  const handleSave = () => {
    const updates: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null }> = {};
    if (editRole !== credit.role) updates.role = editRole;
    if (editName !== credit.name) updates.name = editName;
    const newPublishing = editPublishingPct === '' ? null : Number(editPublishingPct);
    const newMaster = editMasterPct === '' ? null : Number(editMasterPct);
    if (newPublishing !== credit.publishing_percentage) updates.publishing_percentage = newPublishing;
    if (newMaster !== credit.master_percentage) updates.master_percentage = newMaster;
    if (Object.keys(updates).length > 0) {
      onSave(updates);
    } else {
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-background rounded border flex-wrap">
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-8 min-w-[120px]" placeholder="Nombre" />
        {hasContact && <span title="Vinculado a contacto"><Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /></span>}
        <GroupedRoleSelect value={editRole} onValueChange={setEditRole} triggerClassName="w-[140px] h-8" />
        <div className="flex items-center gap-1">
          <Input type="number" min="0" max="100" step="0.01" value={editPublishingPct} onChange={(e) => setEditPublishingPct(e.target.value)} className="w-[70px] h-8" placeholder="Auto." title="% Autoría (Publishing)" />
          <span className="text-xs text-amber-600">A</span>
        </div>
        <div className="flex items-center gap-1">
          <Input type="number" min="0" max="100" step="0.01" value={editMasterPct} onChange={(e) => setEditMasterPct(e.target.value)} className="w-[70px] h-8" placeholder="Mast." title="% Master (Royalties)" />
          <span className="text-xs text-blue-600">M</span>
        </div>
        <Button size="sm" variant="default" onClick={handleSave} disabled={isSaving}>Guardar</Button>
        <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancelar</Button>
      </div>
    );
  }

  const cat5 = getRoleCategory5(credit.role);
  const catMeta = cat5 ? getCategoryMeta(cat5) : null;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 bg-background rounded border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="cursor-pointer" onClick={onStartEdit}>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm">{credit.name}</p>
            {credit.contact_id && <span title="Vinculado a perfil"><Check className="h-3 w-3 text-green-600" /></span>}
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground">{getRoleLabel(credit.role)}</p>
            {catMeta && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${catMeta.bgClass} ${catMeta.textClass} ${catMeta.borderClass}`}>
                {catMeta.label}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {credit.publishing_percentage != null && credit.publishing_percentage > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20" title="% Autoría">
            {credit.publishing_percentage}% A
          </Badge>
        )}
        {credit.master_percentage != null && credit.master_percentage > 0 && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20" title="% Master">
            {credit.master_percentage}% M
          </Badge>
        )}
        <LinkCreditContactDialog credit={credit} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
