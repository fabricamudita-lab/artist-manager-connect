import React, { useState, useEffect } from 'react';
import { CreditedArtistRoles } from '@/components/releases/CreditedArtistRoles';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Music, AlertTriangle, FileDown, Loader2, ArrowUpDown, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRelease, useTracks, TrackCredit } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { getRoleLabel } from '@/lib/creditRoles';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useAlertHighlight } from '@/hooks/useAlertHighlight';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { exportLabelCopyPDF } from '@/utils/exportLabelCopyPDF';

// Extracted sub-components
import { TrackCreditsItem } from '@/components/credits/TrackCreditsItem';
import { SortableTrackRow, CreateTrackForm, EditTrackForm } from '@/components/credits/TrackForms';

export default function ReleaseCreditos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);
  const { alertId } = useAlertHighlight();

  const [isCreateTrackOpen, setIsCreateTrackOpen] = useState(false);
  const [isEditTrackOpen, setIsEditTrackOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [showCreditsBanner, setShowCreditsBanner] = useState(false);
  const [isExportingLabelCopy, setIsExportingLabelCopy] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isCreatingSolicitud, setIsCreatingSolicitud] = useState(false);

  const { data: allReleaseCredits = [] } = useQuery({
    queryKey: ['release-all-credits', id, tracks?.map(t => t.id)],
    queryFn: async () => {
      if (!tracks || tracks.length === 0) return [];
      const trackIds = tracks.map(t => t.id);
      const { data, error } = await supabase
        .from('track_credits')
        .select('*')
        .in('track_id', trackIds);
      if (error) throw error;
      return data as TrackCredit[];
    },
    enabled: !!tracks && tracks.length > 0,
  });

  const handleExportLabelCopy = async () => {
    if (!tracks || tracks.length === 0 || !release) {
      toast.error('No hay canciones para exportar');
      return;
    }
    setIsExportingLabelCopy(true);
    try {
      const trackIds = tracks.map((t) => t.id);
      const [creditsResult, trackArtistsResult] = await Promise.all([
        supabase.from('track_credits').select('*').in('track_id', trackIds),
        supabase.from('track_artists').select('*, artist:artists(name)').in('track_id', trackIds).order('sort_order'),
      ]);
      if (creditsResult.error) throw creditsResult.error;
      if (trackArtistsResult.error) throw trackArtistsResult.error;

      exportLabelCopyPDF(
        release,
        tracks,
        (creditsResult.data || []).map((c: any) => ({
          track_id: c.track_id,
          name: c.name,
          role: c.role,
          publishing_percentage: c.publishing_percentage,
          master_percentage: c.master_percentage,
        })),
        (trackArtistsResult.data || []).map((ta: any) => ({
          track_id: ta.track_id,
          role: ta.role,
          artist_name: ta.artist?.name || '',
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

  const handleRequestApproval = async () => {
    if (!tracks || tracks.length === 0 || !release) {
      toast.error('No hay canciones para solicitar aprobación');
      return;
    }
    setIsCreatingSolicitud(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const trackIds = tracks.map((t) => t.id);
      const { data: allCredits, error } = await supabase
        .from('track_credits')
        .select('*')
        .in('track_id', trackIds);
      if (error) throw error;

      const mainArtists = (release.release_artists || []).filter(ra => ra.role !== 'featuring');
      const featArtists = (release.release_artists || []).filter(ra => ra.role === 'featuring');
      const artistDisplay = [
        ...mainArtists.map(ra => ra.artist?.name).filter(Boolean),
      ].join(', ') + (featArtists.length > 0 ? ' feat. ' + featArtists.map(ra => ra.artist?.name).filter(Boolean).join(', ') : '');

      const labelCopyData = {
        type: 'label_copy',
        release: {
          title: release.title,
          artist: artistDisplay || release.artist?.name || 'Sin artista',
          type: release.type,
          upc: release.upc || null,
          mainArtists: mainArtists.map(ra => ra.artist?.name).filter(Boolean),
          featArtists: featArtists.map(ra => ra.artist?.name).filter(Boolean),
        },
        tracks: tracks.map((track) => {
          const trackCredits = (allCredits || []).filter((c: any) => c.track_id === track.id);
          return {
            number: track.track_number,
            title: track.title,
            isrc: track.isrc || null,
            credits: trackCredits.map((c: any) => ({
              role: getRoleLabel(c.role),
              name: c.name,
              percentage: c.publishing_percentage,
            })),
          };
        }),
      };

      const observaciones = `<!--LABEL_COPY_JSON-->${JSON.stringify(labelCopyData)}`;

      const { error: insertError } = await supabase
        .from('solicitudes')
        .insert({
          tipo: 'licencia' as const,
          nombre_solicitante: `Label Copy - ${release.title}`,
          artist_id: release.artist_id,
          project_id: release.project_id,
          observaciones,
          descripcion_libre: `Release ID: ${release.id}`,
          estado: 'pendiente' as const,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Solicitud de aprobación creada', {
        description: 'La artista/equipo puede revisarla en Solicitudes',
        action: {
          label: 'Ver solicitudes',
          onClick: () => navigate('/solicitudes'),
        },
      });
    } catch (err) {
      console.error(err);
      toast.error('Error al crear la solicitud');
    } finally {
      setIsCreatingSolicitud(false);
    }
  };

  useEffect(() => {
    if (alertId === 'credits-missing' && !loadingTracks) {
      setShowCreditsBanner(true);
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
          onClick={handleRequestApproval}
          disabled={isCreatingSolicitud || !tracks || tracks.length === 0}
        >
          {isCreatingSolicitud ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Solicitar aprobación
        </Button>
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
            <div className="space-y-6">
              <EditTrackForm
                track={selectedTrack}
                onSubmit={(data) => updateTrack.mutate({ id: selectedTrack.id, ...data })}
                isLoading={updateTrack.isPending}
              />
              <div className="border-t pt-4">
                <CreditedArtistRoles
                  trackId={selectedTrack.id}
                  releaseId={id!}
                  trackCredits={allReleaseCredits.filter(c => c.track_id === selectedTrack.id)}
                />
              </div>
            </div>
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
