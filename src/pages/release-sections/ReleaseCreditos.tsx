import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Users, Music, Pencil, Trash2, FileText, UserPlus, Copy, Check, AlertTriangle, GripVertical } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useRelease, useTracks, useTrackCredits, Track, TrackCredit } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  ALL_CREDIT_ROLES, 
  getRoleLabel, 
  getRoleCategory, 
  sortByRoleOrder,
  isPublishingRole,
  isMasterRole 
} from '@/lib/creditRoles';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const sortCreditsBySortOrder = (credits: TrackCredit[]) => {
  return [...credits].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
};

export default function ReleaseCreditos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);

  const [isCreateTrackOpen, setIsCreateTrackOpen] = useState(false);
  const [isEditTrackOpen, setIsEditTrackOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);

  // Create track mutation
  const createTrack = useMutation({
    mutationFn: async (data: { title: string; track_number: number; lyrics?: string; isrc?: string }) => {
      const { data: track, error } = await supabase
        .from('tracks')
        .insert({ ...data, release_id: id })
        .select()
        .single();
      if (error) throw error;
      return track;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
      toast.success('Canción creada');
      setIsCreateTrackOpen(false);
    },
    onError: () => {
      toast.error('Error al crear la canción');
    },
  });

  // Update track mutation
  const updateTrack = useMutation({
    mutationFn: async (data: { id: string; title?: string; lyrics?: string; isrc?: string }) => {
      const { id: trackId, ...updates } = data;
      const { error } = await supabase.from('tracks').update(updates).eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
      toast.success('Canción actualizada');
      setIsEditTrackOpen(false);
      setSelectedTrack(null);
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  // Delete track mutation
  const deleteTrack = useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase.from('tracks').delete().eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
      toast.success('Canción eliminada');
      setDeleteTrackId(null);
    },
    onError: () => {
      toast.error('Error al eliminar');
    },
  });

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  const nextTrackNumber = tracks ? Math.max(0, ...tracks.map((t) => t.track_number)) + 1 : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{release?.title}</p>
          <h1 className="text-2xl font-bold">Créditos y Autoría</h1>
        </div>
        <Dialog open={isCreateTrackOpen} onOpenChange={setIsCreateTrackOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Canción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Añadir Canción</DialogTitle>
            </DialogHeader>
            <CreateTrackForm
              nextTrackNumber={nextTrackNumber}
              onSubmit={(data) => createTrack.mutate(data)}
              isLoading={createTrack.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canciones y Autoría</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTracks ? (
            <Skeleton className="h-32 w-full" />
          ) : tracks && tracks.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {tracks.map((track) => (
                <TrackCreditsItem
                  key={track.id}
                  track={track}
                  onEdit={() => {
                    setSelectedTrack(track);
                    setIsEditTrackOpen(true);
                  }}
                  onDelete={() => setDeleteTrackId(track.id)}
                />
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
              <p className="text-muted-foreground mb-4">
                Crea las canciones para añadir letra y créditos
              </p>
              <Button onClick={() => setIsCreateTrackOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Canción
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Track Dialog */}
      <Dialog open={isEditTrackOpen} onOpenChange={setIsEditTrackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Canción</DialogTitle>
          </DialogHeader>
          {selectedTrack && (
            <EditTrackForm
              track={selectedTrack}
              onSubmit={(data) => updateTrack.mutate({ id: selectedTrack.id, ...data })}
              isLoading={updateTrack.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTrackId} onOpenChange={() => setDeleteTrackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar canción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la canción y todos sus créditos. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTrackId && deleteTrack.mutate(deleteTrackId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Track Credits Item Component
function TrackCreditsItem({
  track,
  onEdit,
  onDelete,
}: {
  track: Track;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: credits = [], isLoading } = useTrackCredits(track.id);
  const queryClient = useQueryClient();
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);

  const createCredit = useMutation({
    mutationFn: async (data: { name: string; role: string; publishing_percentage?: number; master_percentage?: number }) => {
      const { error } = await supabase.from('track_credits').insert({
        track_id: track.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito añadido');
      setIsAddCreditOpen(false);
    },
    onError: () => {
      toast.error('Error al añadir crédito');
    },
  });

  const updateCredit = useMutation({
    mutationFn: async ({ creditId, data }: { creditId: string; data: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null }> }) => {
      const { error } = await supabase.from('track_credits').update(data).eq('id', creditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito actualizado');
      setEditingCreditId(null);
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  const deleteCredit = useMutation({
    mutationFn: async (creditId: string) => {
      const { error } = await supabase.from('track_credits').delete().eq('id', creditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito eliminado');
    },
  });

  return (
    <AccordionItem value={track.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-muted-foreground w-6">{track.track_number}.</span>
          <span className="font-medium">{track.title}</span>
          <div className="flex gap-1 ml-auto mr-4">
            {track.lyrics && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Letra
              </Badge>
            )}
            {credits.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {credits.length}
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-9 space-y-4">
          {/* Track Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3 h-3 mr-1" />
              Editar Canción
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="w-3 h-3 mr-1" />
              Eliminar
            </Button>
          </div>

          {/* Lyrics Preview */}
          {track.lyrics && (
            <LyricsPreview lyrics={track.lyrics} trackTitle={track.title} />
          )}

          {/* Credits Section */}
          <CreditsSection
            credits={credits}
            isLoading={isLoading}
            isAddCreditOpen={isAddCreditOpen}
            setIsAddCreditOpen={setIsAddCreditOpen}
            createCredit={createCredit}
            editingCreditId={editingCreditId}
            setEditingCreditId={setEditingCreditId}
            updateCredit={updateCredit}
            deleteCredit={deleteCredit}
            trackId={track.id}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// Credits Section Component with copy button, percentage validation and drag-and-drop
function CreditsSection({
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
}: {
  credits: TrackCredit[];
  isLoading: boolean;
  isAddCreditOpen: boolean;
  setIsAddCreditOpen: (open: boolean) => void;
  createCredit: { mutate: (data: { name: string; role: string; publishing_percentage?: number; master_percentage?: number }) => void; isPending: boolean };
  editingCreditId: string | null;
  setEditingCreditId: (id: string | null) => void;
  updateCredit: { mutate: (args: { creditId: string; data: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null; sort_order: number }> }) => void; isPending: boolean };
  deleteCredit: { mutate: (id: string) => void };
  trackId: string;
}) {
  const [copiedCredits, setCopiedCredits] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const sortedCredits = useMemo(() => sortCreditsBySortOrder(credits), [credits]);

  // Calculate total percentages for publishing and master separately
  const publishingTotal = credits.reduce((sum, c) => sum + (c.publishing_percentage ?? 0), 0);
  const masterTotal = credits.reduce((sum, c) => sum + (c.master_percentage ?? 0), 0);
  const hasPublishingCredits = credits.some(c => c.publishing_percentage != null && c.publishing_percentage > 0);
  const hasMasterCredits = credits.some(c => c.master_percentage != null && c.master_percentage > 0);
  const hasPublishingError = hasPublishingCredits && publishingTotal !== 100;
  const hasMasterError = hasMasterCredits && masterTotal !== 100;

  const handleCopyCredits = () => {
    if (credits.length === 0) return;
    
    // Group credits by role
    const groupedByRole: Record<string, string[]> = {};
    sortedCredits.forEach((credit) => {
      const role = credit.role || 'Otro';
      if (!groupedByRole[role]) {
        groupedByRole[role] = [];
      }
      groupedByRole[role].push(credit.name);
    });
    
    // Format: "Rol: Name1 & Name2"
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
    
    // Optimistically update the UI with new sort_order values
    queryClient.setQueryData(['track-credits', trackId], reorderedCredits);

    try {
      // Update sort_order in database for all items
      for (const credit of reorderedCredits) {
        const { error } = await supabase
          .from('track_credits')
          .update({ sort_order: credit.sort_order })
          .eq('id', credit.id);
        
        if (error) throw error;
      }
      
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['track-credits', trackId] });
    } catch (error) {
      console.error('Error updating credit order:', error);
      toast.error('Error al reordenar los créditos');
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['track-credits', trackId] });
    }
  };

  return (
    <div className="space-y-2">
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
        <Dialog open={isAddCreditOpen} onOpenChange={setIsAddCreditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="w-3 h-3 mr-1" />
              Añadir Crédito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Crédito</DialogTitle>
            </DialogHeader>
            <AddCreditForm
              onSubmit={(data) => createCredit.mutate(data)}
              isLoading={createCredit.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Percentage validation warnings */}
      {hasPublishingError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Autoría suma {publishingTotal.toFixed(1)}% — debe sumar 100%
          </span>
        </div>
      )}
      {hasMasterError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Master suma {masterTotal.toFixed(1)}% — debe sumar 100%
          </span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : credits.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedCredits.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedCredits.map((credit) => (
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
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sin créditos ni autorías registrados para esta canción.
        </p>
      )}
    </div>
  );
}

// Sortable Credit Row wrapper for drag-and-drop
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: credit.id });

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
    if (!hasContact && editName !== credit.name) updates.name = editName;
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
        {!hasContact && (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 h-8 min-w-[120px]"
            placeholder="Nombre"
          />
        )}
        {hasContact && (
          <span className="font-medium text-sm flex-1">{credit.name}</span>
        )}
        <Select value={editRole} onValueChange={setEditRole}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_CREDIT_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={editPublishingPct}
            onChange={(e) => setEditPublishingPct(e.target.value)}
            className="w-[70px] h-8"
            placeholder="Auto."
            title="% Autoría (Publishing)"
          />
          <span className="text-xs text-amber-600">A</span>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={editMasterPct}
            onChange={(e) => setEditMasterPct(e.target.value)}
            className="w-[70px] h-8"
            placeholder="Mast."
            title="% Master (Royalties)"
          />
          <span className="text-xs text-blue-600">M</span>
        </div>
        <Button size="sm" variant="default" onClick={handleSave} disabled={isSaving}>
          Guardar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelEdit}>
          Cancelar
        </Button>
      </div>
    );
  }

  const category = getRoleCategory(credit.role);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 bg-background rounded border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="cursor-pointer" onClick={onStartEdit}>
          <p className="font-medium text-sm">{credit.name}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground">{getRoleLabel(credit.role)}</p>
            {category === 'publishing' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                Autoría
              </Badge>
            )}
            {category === 'master' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 border-blue-500/20">
                Master
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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Lyrics Preview with Dialog
function LyricsPreview({ lyrics, trackTitle }: { lyrics: string; trackTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Letra</Label>
          <CopyButton 
            text={lyrics} 
            successMessage="Letra copiada al portapapeles"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
          {lyrics}
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Letra - {trackTitle}</DialogTitle>
              <CopyButton 
                text={lyrics} 
                successMessage="Letra copiada al portapapeles"
                size="sm"
                variant="outline"
                showText
              />
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <p className="text-sm whitespace-pre-line leading-relaxed">
              {lyrics}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Create Track Form
function CreateTrackForm({
  nextTrackNumber,
  onSubmit,
  isLoading,
}: {
  nextTrackNumber: number;
  onSubmit: (data: { title: string; track_number: number; lyrics?: string; isrc?: string }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [trackNumber, setTrackNumber] = useState(nextTrackNumber);
  const [lyrics, setLyrics] = useState('');
  const [isrc, setIsrc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      track_number: trackNumber,
      lyrics: lyrics.trim() || undefined,
      isrc: isrc.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Label htmlFor="track_number">N°</Label>
          <Input
            id="track_number"
            type="number"
            min={1}
            value={trackNumber}
            onChange={(e) => setTrackNumber(parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="col-span-3">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre de la canción"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="isrc">ISRC</Label>
        <Input
          id="isrc"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
          placeholder="XX-XXX-00-00000"
        />
      </div>

      <div>
        <Label htmlFor="lyrics">Letra</Label>
        <Textarea
          id="lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Escribe la letra de la canción..."
          rows={6}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? 'Guardando...' : 'Crear Canción'}
        </Button>
      </div>
    </form>
  );
}

// Edit Track Form
function EditTrackForm({
  track,
  onSubmit,
  isLoading,
}: {
  track: Track;
  onSubmit: (data: { title?: string; lyrics?: string; isrc?: string }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(track.title);
  const [lyrics, setLyrics] = useState(track.lyrics || '');
  const [isrc, setIsrc] = useState(track.isrc || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      lyrics: lyrics.trim() || undefined,
      isrc: isrc.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit_title">Título *</Label>
        <Input
          id="edit_title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre de la canción"
          required
        />
      </div>

      <div>
        <Label htmlFor="edit_isrc">ISRC</Label>
        <Input
          id="edit_isrc"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
          placeholder="XX-XXX-00-00000"
        />
      </div>

      <div>
        <Label htmlFor="edit_lyrics">Letra</Label>
        <Textarea
          id="edit_lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Escribe la letra de la canción..."
          rows={8}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}

// Add Credit Form
function AddCreditForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: { name: string; role: string; publishing_percentage?: number; master_percentage?: number }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [publishingPct, setPublishingPct] = useState('');
  const [masterPct, setMasterPct] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role) return;
    onSubmit({
      name: name.trim(),
      role,
      publishing_percentage: publishingPct ? parseFloat(publishingPct) : undefined,
      master_percentage: masterPct ? parseFloat(masterPct) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="credit_name">Nombre *</Label>
        <Input
          id="credit_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del colaborador"
          required
        />
      </div>

      <div>
        <Label htmlFor="credit_role">Rol *</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            {ALL_CREDIT_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="credit_publishing">% Autoría</Label>
          <Input
            id="credit_publishing"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={publishingPct}
            onChange={(e) => setPublishingPct(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <Label htmlFor="credit_master">% Master</Label>
          <Input
            id="credit_master"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={masterPct}
            onChange={(e) => setMasterPct(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !name.trim() || !role}>
          {isLoading ? 'Guardando...' : 'Añadir Crédito'}
        </Button>
      </div>
    </form>
  );
}
