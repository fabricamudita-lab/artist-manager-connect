import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Users, Music, Pencil, Trash2, FileText, UserPlus, Copy, Check, AlertTriangle, GripVertical, Link2, FileDown, Loader2, Star, Disc3, Video, Sparkles, Captions, ArrowUpDown } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
import { undoableDelete } from '@/utils/undoableDelete';
import { 
  ALL_CREDIT_ROLES, 
  getRoleLabel, 
  getRoleCategory,
  getRoleCategory5,
  getCategoryMeta,
  sortByRoleOrder,
  isPublishingRole,
  isMasterRole,
  CREDIT_CATEGORIES,
  type CreditCategory,
} from '@/lib/creditRoles';
import { GroupedRoleSelect } from '@/components/credits/GroupedRoleSelect';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkCreditContactDialog } from '@/components/credits/LinkCreditContactDialog';
import { AddCreditWithProfileForm } from '@/components/credits/AddCreditWithProfileForm';
import { useAlertHighlight } from '@/hooks/useAlertHighlight';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { exportLabelCopyPDF } from '@/utils/exportLabelCopyPDF';

const sortCreditsBySortOrder = (credits: TrackCredit[]) => {
  return [...credits].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
};

export default function ReleaseCreditos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);
  const { alertId } = useAlertHighlight();

  const [isCreateTrackOpen, setIsCreateTrackOpen] = useState(false);
  const [isEditTrackOpen, setIsEditTrackOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [showCreditsBanner, setShowCreditsBanner] = useState(false);
  const [isExportingLabelCopy, setIsExportingLabelCopy] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);

  const handleExportLabelCopy = async () => {
    if (!tracks || tracks.length === 0 || !release) {
      toast.error('No hay canciones para exportar');
      return;
    }
    setIsExportingLabelCopy(true);
    try {
      const trackIds = tracks.map((t) => t.id);
      const { data: allCredits, error } = await supabase
        .from('track_credits')
        .select('*')
        .in('track_id', trackIds);
      if (error) throw error;

      exportLabelCopyPDF(
        release,
        tracks,
        (allCredits || []).map((c: any) => ({
          track_id: c.track_id,
          name: c.name,
          role: c.role,
          publishing_percentage: c.publishing_percentage,
          master_percentage: c.master_percentage,
        })),
      );
      toast.success('Label Copy descargado');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el Label Copy');
    } finally {
      setIsExportingLabelCopy(false);
    }
  };

  useEffect(() => {
    if (alertId === 'credits-missing' && !loadingTracks) {
      setShowCreditsBanner(true);
      // Highlight tracks without credits after render
      setTimeout(() => {
        const items = document.querySelectorAll<HTMLElement>('[data-no-credits="true"]');
        if (items.length > 0) {
          items[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          items.forEach((el) => {
            el.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2', 'transition-all', 'duration-300');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2', 'transition-all', 'duration-300');
            }, 3000);
          });
        }
      }, 600);
    }
  }, [alertId, loadingTracks]);

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
      await undoableDelete({
        table: 'tracks',
        id: trackId,
        successMessage: 'Canción eliminada',
        onComplete: () => {
          queryClient.invalidateQueries({ queryKey: ['tracks', id] });
        },
      });
    },
    onSuccess: () => {
      setDeleteTrackId(null);
    },
  });

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  const nextTrackNumber = tracks ? Math.max(0, ...tracks.map((t) => t.track_number)) + 1 : 1;

  const reorderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !tracks) return;
    const oldIndex = tracks.findIndex((t) => t.id === active.id);
    const newIndex = tracks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove([...tracks], oldIndex, newIndex);
    // Update all track_numbers
    try {
      await Promise.all(
        reordered.map((t, i) =>
          supabase.from('tracks').update({ track_number: i + 1 } as any).eq('id', t.id)
        )
      );
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
    } catch {
      toast.error('Error al reordenar');
    }
  };

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
        <Button
          variant="outline"
          onClick={handleExportLabelCopy}
          disabled={isExportingLabelCopy || !tracks || tracks.length === 0}
        >
          {isExportingLabelCopy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Descargar Label Copy
        </Button>
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Canciones y Autoría</CardTitle>
          {tracks && tracks.length > 1 && release?.status !== 'released' && (
            <Button
              variant={isReorderMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsReorderMode(!isReorderMode)}
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
              {isReorderMode ? 'Listo' : 'Cambiar orden'}
            </Button>
          )}
        </CardHeader>
        {showCreditsBanner && (
          <div className="mx-4 mb-2">
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Hay canciones pendientes de inscribir créditos. Las canciones sin créditos están resaltadas abajo.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <CardContent>
          {loadingTracks ? (
            <Skeleton className="h-32 w-full" />
          ) : tracks && tracks.length > 0 ? (
            isReorderMode ? (
              <DndContext sensors={reorderSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {tracks.map((track) => (
                      <SortableTrackRow key={track.id} track={track} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <Accordion type="multiple" className="w-full">
                {tracks.map((track) => (
                  <TrackCreditsItem
                    key={track.id}
                    track={track}
                    releaseArtistId={release?.artist_id}
                    releaseId={id!}
                    allTracks={tracks}
                    onEdit={() => {
                      setSelectedTrack(track);
                      setIsEditTrackOpen(true);
                    }}
                    onDelete={() => setDeleteTrackId(track.id)}
                  />
                ))}
              </Accordion>
            )
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

// Sortable Track Row for reorder mode
function SortableTrackRow({ track }: { track: Track }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-6">{track.track_number}.</span>
      <span className="font-medium">{track.title}</span>
    </div>
  );
}

// Track Credits Item Component
function TrackCreditsItem({
  track,
  releaseArtistId,
  releaseId,
  allTracks,
  onEdit,
  onDelete,
}: {
  track: Track;
  releaseArtistId?: string | null;
  releaseId: string;
  allTracks: Track[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: credits = [], isLoading } = useTrackCredits(track.id);
  const queryClient = useQueryClient();
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);

  const createCredit = useMutation({
    mutationFn: async (data: { name: string; role: string; contact_id?: string; publishing_percentage?: number; master_percentage?: number }) => {
      let contactId = data.contact_id;

      // Auto-create contact if no existing profile was selected
      if (!contactId && data.name) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cat5 = getRoleCategory5(data.role);
          const categoryMap: Record<string, string> = {
            compositor: 'compositor',
            autoria: 'letrista',
            produccion: 'tecnico',
            interprete: 'banda',
            contribuidor: 'artistico',
          };
          const contactCategory = categoryMap[cat5 || ''] || 'otro';
          const roleLabel = getRoleLabel(data.role);

          const teamCategory = categoryMap[cat5 || ''] || 'artistico';
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              name: data.name,
              category: contactCategory,
              role: roleLabel,
              created_by: user.id,
              field_config: {
                is_team_member: true,
                team_categories: [teamCategory],
              },
            })
            .select('id')
            .single();

          if (contactError) {
            console.error('Error creating contact:', contactError);
          } else if (newContact) {
            contactId = newContact.id;
          }
        }
      }

      // Always link contact to artist (idempotent upsert)
      if (contactId && releaseArtistId) {
        await supabase
          .from('contact_artist_assignments')
          .upsert(
            { contact_id: contactId, artist_id: releaseArtistId },
            { onConflict: 'contact_id,artist_id' }
          )
          .then(({ error }) => {
            if (error) console.error('Error linking contact to artist:', error);
          });
      }

      const { error } = await supabase.from('track_credits').insert({
        track_id: track.id,
        name: data.name,
        role: data.role,
        contact_id: contactId || undefined,
        publishing_percentage: data.publishing_percentage,
        master_percentage: data.master_percentage,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Crédito añadido');
      setIsAddCreditOpen(false);
    },
    onError: () => {
      toast.error('Error al añadir crédito');
    },
  });

  const [pendingBulkUpdate, setPendingBulkUpdate] = useState<{
    oldName: string;
    newName: string;
    matchingIds: string[];
    creditId: string;
    data: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null }>;
  } | null>(null);

  const updateCreditDirect = useMutation({
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

  const handleUpdateCredit = async ({ creditId, data }: { creditId: string; data: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null }> }) => {
    // Check if name changed
    const credit = credits.find(c => c.id === creditId);
    if (data.name && credit && data.name !== credit.name && releaseId) {
      // Search for other credits with the same old name in this release
      const trackIds = allTracks.map(t => t.id);
      if (trackIds.length > 0) {
        const { data: matchingCredits } = await supabase
          .from('track_credits')
          .select('id')
          .in('track_id', trackIds)
          .eq('name', credit.name)
          .neq('id', creditId);

        if (matchingCredits && matchingCredits.length > 0) {
          setPendingBulkUpdate({
            oldName: credit.name,
            newName: data.name,
            matchingIds: matchingCredits.map(c => c.id),
            creditId,
            data,
          });
          return;
        }
      }
    }
    updateCreditDirect.mutate({ creditId, data });
  };

  const handleBulkUpdateConfirm = async (updateAll: boolean) => {
    if (!pendingBulkUpdate) return;
    const { creditId, data, matchingIds } = pendingBulkUpdate;

    try {
      // Update the current credit
      const { error } = await supabase.from('track_credits').update(data).eq('id', creditId);
      if (error) throw error;

      if (updateAll) {
        // Update all matching credits' name
        const { error: bulkError } = await supabase
          .from('track_credits')
          .update({ name: data.name })
          .in('id', matchingIds);
        if (bulkError) throw bulkError;
        toast.success(`${matchingIds.length + 1} créditos actualizados`);
      } else {
        toast.success('Crédito actualizado');
      }

      // Invalidate all track credits in this release
      allTracks.forEach(t => {
        queryClient.invalidateQueries({ queryKey: ['track-credits', t.id] });
      });
      setEditingCreditId(null);
    } catch {
      toast.error('Error al actualizar');
    }
    setPendingBulkUpdate(null);
  };

  const updateCredit = {
    mutate: handleUpdateCredit,
    isPending: updateCreditDirect.isPending,
  };

  const deleteCredit = useMutation({
    mutationFn: async (creditId: string) => {
      await undoableDelete({
        table: 'track_credits',
        id: creditId,
        successMessage: 'Crédito eliminado',
        onComplete: () => {
          queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
        },
      });
    },
  });

  const videoIcon = track.video_type === 'videoclip' ? Video
    : track.video_type === 'visualiser' ? Sparkles
    : track.video_type === 'videolyric' ? Captions
    : null;

  return (
    <>
    <AccordionItem value={track.id} data-no-credits={credits.length === 0 ? 'true' : undefined}>
      <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-muted-foreground w-6">{track.track_number}.</span>
            <span className="font-medium">{track.title}</span>
            {track.isrc && (
              <Popover>
                <span className="text-xs text-muted-foreground ml-2 inline-flex items-center gap-1">
                  ISRC:
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-foreground cursor-pointer transition-colors underline-offset-2 hover:underline"
                    >
                      {track.isrc}
                    </button>
                  </PopoverTrigger>
                </span>
                <PopoverContent className="w-auto p-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(track.isrc!).then(() => {
                        toast.success('ISRC copiado al portapapeles');
                      });
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar ISRC
                  </Button>
                </PopoverContent>
              </Popover>
            )}
            <div className="flex gap-1 ml-auto mr-4">
              {track.is_focus_track && (
                <Badge variant="default" className="text-xs bg-primary/80">
                  <Star className="w-3 h-3 mr-1" />
                  Focus
                </Badge>
              )}
              {track.is_single && (
                <Badge variant="accent" className="text-xs">
                  <Disc3 className="w-3 h-3 mr-1" />
                  Single
                </Badge>
              )}
              {videoIcon && (
                <Badge variant="outline" className="text-xs">
                  {React.createElement(videoIcon, { className: 'w-3 h-3 mr-1' })}
                  {track.video_type === 'videoclip' ? 'Videoclip' : track.video_type === 'visualiser' ? 'Visualiser' : 'Videolyric'}
                </Badge>
              )}
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
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive">
              <Trash2 className="w-4 h-4" />
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
            releaseArtistId={releaseArtistId}
          />
        </div>
      </AccordionContent>
    </AccordionItem>

      {/* Bulk name update dialog */}
      <AlertDialog open={!!pendingBulkUpdate} onOpenChange={(open) => { if (!open) setPendingBulkUpdate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Actualizar nombre en otros créditos</AlertDialogTitle>
            <AlertDialogDescription>
              Se encontraron {pendingBulkUpdate?.matchingIds.length} créditos más con el nombre "{pendingBulkUpdate?.oldName}" en este disco. ¿Quieres actualizarlos todos a "{pendingBulkUpdate?.newName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleBulkUpdateConfirm(false)}>
              Solo este
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBulkUpdateConfirm(true)}>
              Actualizar todos ({(pendingBulkUpdate?.matchingIds.length ?? 0) + 1})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Credits Section Component — grouped by category (distributor-style)
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
  releaseArtistId,
}: {
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
}) {
  const [copiedCredits, setCopiedCredits] = useState(false);
  const [addCategoryFilter, setAddCategoryFilter] = useState<CreditCategory | undefined>(undefined);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const sortedCredits = useMemo(() => sortCreditsBySortOrder(credits), [credits]);

  // Group credits by 5-category
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

  // Calculate total percentages for publishing and master separately
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

      {/* Percentage validation warnings */}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedCredits.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {CREDIT_CATEGORIES.map((cat) => {
                const catCredits = creditsByCategory[cat.id] || [];
                return (
                  <div key={cat.id} className={`rounded-lg border ${cat.borderClass} overflow-hidden`}>
                    {/* Category header */}
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
                    {/* Credits in this category */}
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

      {/* Add Credit Dialog */}
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
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 h-8 min-w-[120px]"
          placeholder="Nombre"
        />
        {hasContact && (
          <span title="Vinculado a contacto"><Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /></span>
        )}
        <GroupedRoleSelect value={editRole} onValueChange={setEditRole} triggerClassName="w-[140px] h-8" />
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

  const cat5 = getRoleCategory5(credit.role);
  const catMeta = cat5 ? getCategoryMeta(cat5) : null;

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
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm">{credit.name}</p>
            {credit.contact_id && (
              <span title="Vinculado a perfil"><Check className="h-3 w-3 text-green-600" /></span>
            )}
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

// AddCreditForm has been replaced by AddCreditWithProfileForm component
