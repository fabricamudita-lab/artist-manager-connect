import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, Trash2, FileText, Users, Copy, Star, Disc3, Video, Sparkles, Captions } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { useTrackCredits, Track, TrackCredit } from '@/hooks/useReleases';
import { getRoleLabel, getRoleCategory5 } from '@/lib/creditRoles';
import { undoableDelete } from '@/utils/undoableDelete';
import { toast } from 'sonner';
import { CreditsSection } from './CreditsSection';
import { LyricsPreview } from './TrackForms';

interface TrackCreditsItemProps {
  track: Track;
  releaseArtistId?: string | null;
  releaseId: string;
  allTracks: Track[];
  onEdit: () => void;
  onDelete: () => void;
}

export function TrackCreditsItem({
  track,
  releaseArtistId,
  releaseId,
  allTracks,
  onEdit,
  onDelete,
}: TrackCreditsItemProps) {
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
            interprete: 'banda',
            contribuidor: 'artistico',
          };
          const contactCategory = categoryMap[cat5 || ''] || 'otro';
          const roleLabel = getRoleLabel(data.role);
          const teamCategory = categoryMap[cat5 || ''] || 'artistico';

          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id, role, field_config')
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
                field_config: { ...currentConfig, is_team_member: true, team_categories: mergedCats },
                role: mergedRoles.join(', '),
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
                field_config: { is_team_member: true, team_categories: [teamCategory] },
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
            interprete: 'banda',
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
              field_config: { ...currentConfig, is_team_member: true, team_categories: mergedCats },
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
                  {credits.length}
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
