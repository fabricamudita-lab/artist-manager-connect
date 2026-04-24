import React, { useState, useMemo, useEffect } from 'react';
import { CreditedArtistRoles } from '@/components/releases/CreditedArtistRoles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRightsSplitsManager } from '@/components/releases/TrackRightsSplitsManager';
import { CreditNotesEditor } from '@/components/credits/CreditNotesEditor';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Users, Music, Pencil, Trash2, FileText, UserPlus, Copy, Check, AlertTriangle, GripVertical, FileDown, Loader2, Star, Disc3, Video, Sparkles, Captions, ArrowUpDown, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { useAlertHighlight } from '@/hooks/useAlertHighlight';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { exportLabelCopyPDF } from '@/utils/exportLabelCopyPDF';
import { exportSplitsPDF } from '@/utils/exportSplitsPDF';

const sortCreditsBySortOrder = (credits: TrackCredit[]) => {
  return [...credits].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
};

interface GroupedCredit {
  key: string;
  name: string;
  contact_id: string | null;
  credits: TrackCredit[];
}

function groupCreditsByPerson(credits: TrackCredit[]): GroupedCredit[] {
  const map = new Map<string, GroupedCredit>();
  for (const credit of credits) {
    const key = credit.contact_id || credit.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { key, name: credit.name, contact_id: credit.contact_id || null, credits: [] });
    }
    map.get(key)!.credits.push(credit);
  }
  return Array.from(map.values());
}

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
  const [isExportingSplits, setIsExportingSplits] = useState(false);
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

  const handleExportSplits = async () => {
    if (!tracks || tracks.length === 0 || !release) {
      toast.error('No hay canciones para exportar');
      return;
    }
    setIsExportingSplits(true);
    try {
      const trackIds = tracks.map((t) => t.id);
      const [creditsResult, notesResult] = await Promise.all([
        supabase
          .from('track_credits')
          .select('*, contact:contacts(ipi_number, pro_name)')
          .in('track_id', trackIds),
        supabase.from('credit_notes').select('track_id, scope, note').eq('release_id', release.id),
      ]);
      if (creditsResult.error) throw creditsResult.error;
      if (notesResult.error) throw notesResult.error;

      exportSplitsPDF(
        release,
        tracks,
        (creditsResult.data || []).map((c: any) => ({
          track_id: c.track_id,
          name: c.name,
          role: c.role,
          publishing_percentage: c.publishing_percentage,
          master_percentage: c.master_percentage,
          pro_society: c.pro_society || c.contact?.pro_name || null,
          notes: c.notes,
          ipi_number: c.contact?.ipi_number || null,
        })),
        (notesResult.data || []).map((n: any) => ({
          track_id: n.track_id,
          scope: n.scope,
          note: n.note,
        })),
      );
      toast.success('Splits de derechos descargado');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el PDF de splits');
    } finally {
      setIsExportingSplits(false);
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
    mutationFn: async (data: { id: string; title?: string; lyrics?: string; isrc?: string; explicit?: boolean; c_copyright_holder?: string | null; c_copyright_year?: number | null; p_copyright_holder?: string | null; p_production_year?: number | null; recording_fixation_date?: string | null }) => {
      const { id: trackId, ...updates } = data;

      // Strict server-bound validation (defense-in-depth alongside RLS).
      // Zod normalizes/sanitizes inputs and rejects malformed/oversized values
      // before they ever reach Supabase. PostgreSQL typed columns prevent SQL
      // injection by construction (no string concatenation) and React escapes
      // all rendered text (XSS-safe on display).
      const currentYear = new Date().getFullYear();
      const TrackUpdateSchema = z.object({
        title: z.string().trim().min(1, 'El título es obligatorio').max(255).optional(),
        lyrics: z.string().max(20000, 'La letra es demasiado larga').optional(),
        isrc: z
          .string()
          .trim()
          .max(15)
          .regex(/^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/i, 'ISRC con formato inválido')
          .optional()
          .or(z.literal(undefined)),
        explicit: z.boolean().optional(),
        c_copyright_holder: z.string().trim().max(255).nullable().optional(),
        p_copyright_holder: z.string().trim().max(255).nullable().optional(),
        c_copyright_year: z.number().int().min(1900).max(currentYear + 1).nullable().optional(),
        p_production_year: z.number().int().min(1900).max(currentYear + 1).nullable().optional(),
        recording_fixation_date: z
          .union([
            z.null(),
            z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato inválido')
              .refine((d) => {
                const dt = new Date(d + 'T00:00:00');
                if (isNaN(dt.getTime())) return false;
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                return dt <= today;
              }, 'La fecha de fijación no puede ser futura'),
          ])
          .optional(),
      });

      const parsed = TrackUpdateSchema.safeParse(updates);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        throw new Error(firstIssue?.message || 'Datos inválidos');
      }

      const { error } = await supabase.from('tracks').update(parsed.data as any).eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
      toast.success('Canción actualizada');
      setIsEditTrackOpen(false);
      setSelectedTrack(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Error al actualizar');
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

  const reorderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  const nextTrackNumber = tracks ? Math.max(0, ...tracks.map((t) => t.track_number)) + 1 : 1;

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
        <Button
          variant="outline"
          onClick={handleExportSplits}
          disabled={isExportingSplits || !tracks || tracks.length === 0}
        >
          {isExportingSplits ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Descargar Splits
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

      <Tabs defaultValue="credits" className="w-full">
        <TabsList>
          <TabsTrigger value="credits">Créditos</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
          <TabsTrigger value="master">Master</TabsTrigger>
        </TabsList>

        <TabsContent value="credits">
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
        </TabsContent>

        <TabsContent value="publishing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Derechos de Autor (Publishing)</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Define los porcentajes de autoría: compositores, letristas y editoriales.
                    </p>
                  </div>
                </div>
                {id && (
                  <CreditNotesEditor
                    releaseId={id}
                    scope="publishing"
                    trackId={null}
                    variant="banner"
                    label="Nota general (Publishing)"
                    placeholder="Notas sobre los derechos de autor de todo el lanzamiento…"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingTracks ? (
                <Skeleton className="h-32 w-full" />
              ) : tracks && tracks.length > 0 ? (
                <div className="space-y-3">
                  {tracks.map((track) => (
                    <TrackRightsSplitsManager key={track.id} track={track} type="publishing" releaseId={id} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
                  <p className="text-muted-foreground">Añade canciones primero para configurar sus derechos.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="master">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Royalties Master (Fonograma)</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Define los porcentajes de participación en la grabación: artistas, productores y sello.
                    </p>
                  </div>
                </div>
                {id && (
                  <CreditNotesEditor
                    releaseId={id}
                    scope="master"
                    trackId={null}
                    variant="banner"
                    label="Nota general (Master)"
                    placeholder="Notas sobre los derechos conexos de todo el lanzamiento…"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingTracks ? (
                <Skeleton className="h-32 w-full" />
              ) : tracks && tracks.length > 0 ? (
                <div className="space-y-3">
                  {tracks.map((track) => (
                    <TrackRightsSplitsManager key={track.id} track={track} type="master" releaseId={id} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
                  <p className="text-muted-foreground">Añade canciones primero para configurar sus royalties.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditTrackOpen} onOpenChange={setIsEditTrackOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Canción</DialogTitle>
          </DialogHeader>
          {selectedTrack && (
            <div className="space-y-6 overflow-y-auto flex-1 pr-1">
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

      if (!contactId && data.name) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cat5 = getRoleCategory5(data.role);
          const categoryMap: Record<string, string> = {
            compositor: 'compositor',
            autoria: 'letrista',
            produccion: 'tecnico',
            interprete: 'colaborador',
            contribuidor: 'artistico',
          };
          const contactCategory = categoryMap[cat5 || ''] || 'otro';
          const roleLabel = getRoleLabel(data.role);
          const teamCategory = categoryMap[cat5 || ''] || 'artistico';

          // Detectar si el nombre coincide con un artista del roster del usuario.
          // Si coincide, el contacto se vincula por FK (linked_artist_id) — la
          // ficha autoritativa vive en `artists`, este contacto sólo guarda el
          // rol funcional dentro del equipo.
          const norm = (s: string) =>
            (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const { data: candidateArtists } = await supabase
            .from('artists')
            .select('id, name, stage_name')
            .eq('created_by', user.id);
          const matchingArtist = (candidateArtists || []).find(
            (a) => norm(a.stage_name || '') === norm(data.name) || norm(a.name) === norm(data.name)
          );
          const linkedArtistId = matchingArtist?.id || null;

          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id, role, field_config, linked_artist_id')
            .eq('created_by', user.id)
            .ilike('name', data.name)
            .limit(1)
            .maybeSingle();

          if (existingContact) {
            contactId = existingContact.id;
            const currentConfig = (existingContact.field_config as Record<string, any>) || {};
            const currentCats: string[] = Array.isArray(currentConfig.team_categories) ? currentConfig.team_categories : [];
            const mergedCats = currentCats.includes(teamCategory) ? currentCats : [...currentCats, teamCategory];

            const existingRoles = (existingContact.role || '').split(',').map((r: string) => r.trim()).filter(Boolean);
            const mergedRoles = existingRoles.includes(roleLabel) ? existingRoles : [...existingRoles, roleLabel];

            await supabase
              .from('contacts')
              .update({
                field_config: {
                  ...currentConfig,
                  is_team_member: true,
                  team_categories: mergedCats,
                },
                role: mergedRoles.join(', '),
                // Backfill el vínculo si no estaba aún
                ...(existingContact.linked_artist_id ? {} : { linked_artist_id: linkedArtistId }),
              })
              .eq('id', existingContact.id);
          } else {
            const { data: newContact, error: contactError } = await supabase
              .from('contacts')
              .insert({
                name: data.name,
                category: contactCategory,
                role: roleLabel,
                created_by: user.id,
                linked_artist_id: linkedArtistId,
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
      }

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

        if (data.contact_id) {
          const cat5 = getRoleCategory5(data.role);
          const categoryMap: Record<string, string> = {
            compositor: 'compositor',
            autoria: 'letrista',
            produccion: 'produccion',
            interprete: 'colaborador',
            contribuidor: 'artistico',
          };
          const teamCat = categoryMap[cat5 || ''] || 'artistico';

          const { data: existing } = await supabase
            .from('contacts')
            .select('field_config')
            .eq('id', contactId)
            .single();

          const currentConfig = (existing?.field_config as Record<string, any>) || {};
          const currentCats: string[] = Array.isArray(currentConfig.team_categories) ? currentConfig.team_categories : [];
          const mergedCats = currentCats.includes(teamCat) ? currentCats : [...currentCats, teamCat];

          await supabase
            .from('contacts')
            .update({
              field_config: {
                ...currentConfig,
                is_team_member: true,
                team_categories: mergedCats,
              },
            })
            .eq('id', contactId);
        }
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
    const credit = credits.find(c => c.id === creditId);
    if (data.name && credit && data.name !== credit.name && releaseId) {
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
      const { error } = await supabase.from('track_credits').update(data).eq('id', creditId);
      if (error) throw error;

      if (updateAll) {
        const { error: bulkError } = await supabase
          .from('track_credits')
          .update({ name: data.name })
          .in('id', matchingIds);
        if (bulkError) throw bulkError;
        toast.success(`${matchingIds.length + 1} créditos actualizados`);
      } else {
        toast.success('Crédito actualizado');
      }

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
                  {new Set(credits.map((c: any) => (c.name || '').trim().toLowerCase()).filter(Boolean)).size}
                </Badge>
              )}
            </div>
          </div>
        </AccordionTrigger>
      <AccordionContent>
        <div className="pl-9 space-y-4">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {track.lyrics && (
            <LyricsPreview lyrics={track.lyrics} trackTitle={track.title} />
          )}

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
  const [editingPersonKey, setEditingPersonKey] = useState<string | null>(null);
  const [deletingPersonKey, setDeletingPersonKey] = useState<string | null>(null);
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
      grouped[cat || 'contribuidor'].push(credit);
    });
    return grouped;
  }, [sortedCredits]);

  const groupedByCategory = useMemo(() => {
    const result: Record<string, GroupedCredit[]> = {};
    for (const cat of CREDIT_CATEGORIES) {
      result[cat.id] = groupCreditsByPerson(creditsByCategory[cat.id] || []);
    }
    return result;
  }, [creditsByCategory]);

  const publishingTotal = credits.reduce((sum, c) => sum + (c.publishing_percentage ?? 0), 0);
  const masterTotal = credits.reduce((sum, c) => sum + (c.master_percentage ?? 0), 0);
  const hasPublishingCredits = credits.some(c => c.publishing_percentage != null && c.publishing_percentage > 0);
  const hasMasterCredits = credits.some(c => c.master_percentage != null && c.master_percentage > 0);
  const hasPublishingError = hasPublishingCredits && publishingTotal !== 100;
  const hasMasterError = hasMasterCredits && masterTotal !== 100;

  const personCategoryMap = useMemo(() => {
    const map = new Map<string, Set<CreditCategory>>();
    for (const credit of sortedCredits) {
      const key = credit.contact_id || credit.name.toLowerCase().trim();
      if (!map.has(key)) map.set(key, new Set());
      const cat = getRoleCategory5(credit.role);
      if (cat) map.get(key)!.add(cat);
    }
    return map;
  }, [sortedCredits]);

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

  const handleCategoryDragEnd = async (category: CreditCategory, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const catGroups = groupedByCategory[category] || [];
    const oldIndex = catGroups.findIndex(g => g.key === active.id);
    const newIndex = catGroups.findIndex(g => g.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedGroups = arrayMove(catGroups, oldIndex, newIndex);

    // Build new sort_order for credits in this category as consecutive blocks per person.
    // Use the minimum existing sort_order in this category as the starting offset to avoid
    // disturbing the relative position of other categories.
    const allCatCredits = catGroups.flatMap(g => g.credits);
    const baseOrder = allCatCredits.reduce(
      (min, c) => Math.min(min, c.sort_order ?? Number.MAX_SAFE_INTEGER),
      Number.MAX_SAFE_INTEGER,
    );
    const startOrder = baseOrder === Number.MAX_SAFE_INTEGER ? 1 : baseOrder;

    const updates: { id: string; sort_order: number }[] = [];
    let cursor = startOrder;
    for (const group of reorderedGroups) {
      for (const credit of group.credits) {
        updates.push({ id: credit.id, sort_order: cursor });
        cursor += 1;
      }
    }

    // Optimistic update of the cache
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    queryClient.setQueryData(['track-credits', trackId], (prev: TrackCredit[] | undefined) => {
      if (!prev) return prev;
      return prev.map(c => updateMap.has(c.id) ? { ...c, sort_order: updateMap.get(c.id)! } : c);
    });

    try {
      for (const u of updates) {
        const { error } = await supabase.from('track_credits').update({ sort_order: u.sort_order }).eq('id', u.id);
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

  const handleDeletePerson = (group: GroupedCredit) => {
    for (const credit of group.credits) {
      deleteCredit.mutate(credit.id);
    }
    setDeletingPersonKey(null);
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCredits} title="Copiar créditos">
              {copiedCredits ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => { setAddCategoryFilter(undefined); setIsAddCreditOpen(true); }}>
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
        <div className="space-y-3">
          {CREDIT_CATEGORIES.map((cat) => {
            const catGroups = groupedByCategory[cat.id] || [];
            return (
              <div key={cat.id} className={`rounded-lg border ${cat.borderClass} overflow-hidden`}>
                <div className={`flex items-center justify-between px-3 py-1.5 ${cat.bgClass}`}>
                  <span className={`text-xs font-semibold ${cat.textClass}`}>{cat.label}</span>
                  <Button variant="ghost" size="icon" className={`h-6 w-6 ${cat.textClass} hover:bg-background/50`} onClick={() => handleOpenAddForCategory(cat.id)} title={`Añadir ${cat.label}`}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {catGroups.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleCategoryDragEnd(cat.id, e)}>
                      <SortableContext items={catGroups.map(g => g.key)} strategy={verticalListSortingStrategy}>
                        {catGroups.map((group) => {
                          const otherCats = Array.from(personCategoryMap.get(group.key) || []).filter(c => c !== cat.id);
                          return (
                            <PersonRow
                              key={group.key}
                              group={group}
                              otherCategories={otherCats}
                              isEditing={editingPersonKey === `${cat.id}-${group.key}`}
                              onStartEdit={() => setEditingPersonKey(`${cat.id}-${group.key}`)}
                              onCancelEdit={() => setEditingPersonKey(null)}
                              onSaveCredit={(creditId, data) => updateCredit.mutate({ creditId, data })}
                              onDeleteCredit={(creditId) => deleteCredit.mutate(creditId)}
                              onDeleteAll={() => setDeletingPersonKey(group.key)}
                              isSaving={updateCredit.isPending}
                            />
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <p className="text-xs text-muted-foreground px-3 py-2 italic">{emptyLabels[cat.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isAddCreditOpen} onOpenChange={(open) => { setIsAddCreditOpen(open); if (!open) setAddCategoryFilter(undefined); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {addCategoryFilter ? `Añadir ${CREDIT_CATEGORIES.find(c => c.id === addCategoryFilter)?.label || 'Crédito'}` : 'Añadir Crédito'}
            </DialogTitle>
          </DialogHeader>
          <AddCreditWithProfileForm
            onSubmit={(data) => createCredit.mutate(data)}
            isLoading={createCredit.isPending}
            releaseArtistId={releaseArtistId}
            filterCategory={addCategoryFilter}
            existingCredits={credits}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPersonKey} onOpenChange={(open) => { if (!open) setDeletingPersonKey(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todos los créditos de esta persona?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán todos los roles asignados a esta persona en esta canción.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              for (const cat of CREDIT_CATEGORIES) {
                const group = (groupedByCategory[cat.id] || []).find(g => g.key === deletingPersonKey);
                if (group) { handleDeletePerson(group); break; }
              }
            }}>
              Eliminar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PersonRow({
  group,
  otherCategories,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveCredit,
  onDeleteCredit,
  onDeleteAll,
  isSaving,
}: {
  group: GroupedCredit;
  otherCategories: CreditCategory[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveCredit: (creditId: string, data: Partial<{ role: string; name: string; publishing_percentage: number | null; master_percentage: number | null }>) => void;
  onDeleteCredit: (creditId: string) => void;
  onDeleteAll: () => void;
  isSaving: boolean;
}) {
  const firstCredit = group.credits[0];
  const hasContact = !!group.contact_id;
  const [editStates, setEditStates] = useState<Record<string, { role: string; publishingPct: string; masterPct: string }>>({});
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.key });
  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleStartEdit = () => {
    const states: Record<string, { role: string; publishingPct: string; masterPct: string }> = {};
    for (const c of group.credits) {
      states[c.id] = {
        role: c.role,
        publishingPct: c.publishing_percentage != null ? String(c.publishing_percentage) : '',
        masterPct: c.master_percentage != null ? String(c.master_percentage) : '',
      };
    }
    setEditStates(states);
    onStartEdit();
  };

  const handleSaveAll = () => {
    for (const credit of group.credits) {
      const state = editStates[credit.id];
      if (!state) continue;
      const updates: Partial<{ role: string; publishing_percentage: number | null; master_percentage: number | null }> = {};
      if (state.role !== credit.role) updates.role = state.role;
      const newPub = state.publishingPct === '' ? null : Number(state.publishingPct);
      const newMas = state.masterPct === '' ? null : Number(state.masterPct);
      if (newPub !== credit.publishing_percentage) updates.publishing_percentage = newPub;
      if (newMas !== credit.master_percentage) updates.master_percentage = newMas;
      if (Object.keys(updates).length > 0) onSaveCredit(credit.id, updates);
    }
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={sortableStyle} className="p-3 bg-background space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{group.name}</p>
            {hasContact && <Check className="h-3 w-3 text-green-600" />}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="default" onClick={handleSaveAll} disabled={isSaving}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancelar</Button>
          </div>
        </div>
        {group.credits.map((credit) => {
          const state = editStates[credit.id];
          if (!state) return null;
          return (
            <div key={credit.id} className="flex items-center gap-2 flex-wrap pl-2 border-l-2 border-muted">
              <GroupedRoleSelect value={state.role} onValueChange={(v) => setEditStates(prev => ({ ...prev, [credit.id]: { ...prev[credit.id], role: v } }))} triggerClassName="w-[140px] h-8" />
              <div className="flex items-center gap-1">
                <Input type="number" min="0" max="100" step="0.01" value={state.publishingPct} onChange={(e) => setEditStates(prev => ({ ...prev, [credit.id]: { ...prev[credit.id], publishingPct: e.target.value } }))} className="w-[70px] h-8" placeholder="Auto." title="% Autoría" />
                <span className="text-xs text-amber-600">A</span>
              </div>
              <div className="flex items-center gap-1">
                <Input type="number" min="0" max="100" step="0.01" value={state.masterPct} onChange={(e) => setEditStates(prev => ({ ...prev, [credit.id]: { ...prev[credit.id], masterPct: e.target.value } }))} className="w-[70px] h-8" placeholder="Mast." title="% Master" />
                <span className="text-xs text-blue-600">M</span>
              </div>
              {group.credits.length > 1 && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeleteCredit(credit.id)}><Trash2 className="h-3 w-3" /></Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={sortableStyle} className="flex items-center justify-between p-2 bg-background rounded border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1 touch-none"
          aria-label="Arrastrar para reordenar"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="cursor-pointer min-w-0" onClick={handleStartEdit}>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{group.name}</p>
            {hasContact && <span title="Vinculado a perfil"><Check className="h-3 w-3 text-green-600 flex-shrink-0" /></span>}
          </div>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {group.credits.map((credit) => (
              <Badge key={credit.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {getRoleLabel(credit.role)}
              </Badge>
            ))}
            {otherCategories.length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                + {otherCategories.map(c => getCategoryMeta(c).label).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {group.credits.map((credit) => (
          <React.Fragment key={credit.id}>
            {credit.publishing_percentage != null && credit.publishing_percentage > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]" title={`${getRoleLabel(credit.role)} — % Autoría`}>
                {credit.publishing_percentage}% A
              </Badge>
            )}
            {credit.master_percentage != null && credit.master_percentage > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]" title={`${getRoleLabel(credit.role)} — % Master`}>
                {credit.master_percentage}% M
              </Badge>
            )}
          </React.Fragment>
        ))}
        <LinkCreditContactDialog credit={firstCredit} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
          e.stopPropagation();
          if (group.credits.length === 1) onDeleteCredit(group.credits[0].id);
          else onDeleteAll();
        }}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

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

function EditTrackForm({
  track,
  onSubmit,
  isLoading,
}: {
  track: Track;
  onSubmit: (data: { title?: string; lyrics?: string; isrc?: string; explicit?: boolean; c_copyright_holder?: string | null; c_copyright_year?: number | null; p_copyright_holder?: string | null; p_production_year?: number | null }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(track.title);
  const [lyrics, setLyrics] = useState(track.lyrics || '');
  const [isrc, setIsrc] = useState(track.isrc || '');
  const [explicit, setExplicit] = useState(track.explicit ?? false);
  const [cCopyrightHolder, setCCopyrightHolder] = useState(track.c_copyright_holder || '');
  const [cCopyrightYear, setCCopyrightYear] = useState<number | ''>(track.c_copyright_year ?? '');
  const [pCopyrightHolder, setPCopyrightHolder] = useState(track.p_copyright_holder || '');
  const [pProductionYear, setPProductionYear] = useState<number | ''>(track.p_production_year ?? '');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      lyrics: lyrics.trim() || undefined,
      isrc: isrc.trim() || undefined,
      explicit,
      c_copyright_holder: cCopyrightHolder.trim() || null,
      c_copyright_year: cCopyrightYear === '' ? null : cCopyrightYear,
      p_copyright_holder: pCopyrightHolder.trim() || null,
      p_production_year: pProductionYear === '' ? null : pProductionYear,
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

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label htmlFor="edit_explicit" className="text-sm cursor-pointer">¿Contiene letras explícitas?</Label>
        <Switch
          id="edit_explicit"
          checked={explicit}
          onCheckedChange={setExplicit}
        />
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium text-muted-foreground">Copyright & Producción</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit_c_holder" className="text-xs">© Copyright Holder</Label>
            <Input
              id="edit_c_holder"
              value={cCopyrightHolder}
              onChange={(e) => setCCopyrightHolder(e.target.value)}
              placeholder="Titular del copyright"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="edit_c_year" className="text-xs">Copyright Year</Label>
            <Select value={cCopyrightYear === '' ? '' : String(cCopyrightYear)} onValueChange={(v) => setCCopyrightYear(v ? Number(v) : '')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit_p_holder" className="text-xs">℗ Copyright Holder</Label>
            <Input
              id="edit_p_holder"
              value={pCopyrightHolder}
              onChange={(e) => setPCopyrightHolder(e.target.value)}
              placeholder="Titular del fonograma"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="edit_p_year" className="text-xs">Production Year</Label>
            <Select value={pProductionYear === '' ? '' : String(pProductionYear)} onValueChange={(v) => setPProductionYear(v ? Number(v) : '')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="edit_lyrics">Letra</Label>
        <Textarea
          id="edit_lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Escribe la letra de la canción..."
          rows={6}
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
