import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Pitch {
  id: string;
  release_id: string;
  created_by: string;
  name: string;
  synopsis: string | null;
  mood: string | null;
  country: string | null;
  spotify_strategy: string | null;
  spotify_monthly_listeners: number | null;
  spotify_followers: number | null;
  spotify_milestones: string | null;
  general_strategy: string | null;
  social_links: string | null;
  pitch_status: string;
  pitch_deadline: string | null;
  pitch_token: string | null;
  pitch_config: Record<string, { visible: boolean; editable: boolean }>;
  pitch_type: string;
  track_id: string | null;
  audio_link: string | null;
  instruments: string | null;
  artist_photos_link: string | null;
  video_link: string | null;
  spotify_photos_link: string | null;
  additional_info: string | null;
  artist_bio: string | null;
  created_at: string;
  updated_at: string;
}

export function usePitchesByRelease(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['pitches', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('pitches')
        .select('*')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Pitch[];
    },
    enabled: !!releaseId,
  });
}

export function useCreatePitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { release_id: string; created_by: string; name?: string; pitch_type?: string; track_id?: string | null }) => {
      const { data, error } = await supabase
        .from('pitches')
        .insert({
          release_id: params.release_id,
          created_by: params.created_by,
          name: params.name || 'Nuevo Pitch',
          pitch_type: params.pitch_type || 'full_album',
          track_id: params.track_id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Pitch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pitches', data.release_id] });
      toast.success('Pitch creado');
    },
    onError: () => toast.error('Error al crear el pitch'),
  });
}

export function useUpdatePitch(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; release_id: string; [key: string]: any }) => {
      const { id, release_id, ...updates } = params;
      const { error } = await supabase
        .from('pitches')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      return { id, release_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pitches', data.release_id] });
    },
    onError: () => {
      if (!options?.silent) toast.error('Error al guardar el pitch');
    },
  });
}

export function useDeletePitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; release_id: string }) => {
      const { error } = await supabase
        .from('pitches')
        .delete()
        .eq('id', params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pitches', data.release_id] });
      toast.success('Pitch eliminado');
    },
    onError: () => toast.error('Error al eliminar el pitch'),
  });
}

export function useDuplicatePitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pitch: Pitch) => {
      const { data, error } = await supabase
        .from('pitches')
        .insert({
          release_id: pitch.release_id,
          created_by: pitch.created_by,
          name: `${pitch.name} (copia)`,
          synopsis: pitch.synopsis,
          mood: pitch.mood,
          country: pitch.country,
          spotify_strategy: pitch.spotify_strategy,
          spotify_monthly_listeners: pitch.spotify_monthly_listeners,
          spotify_followers: pitch.spotify_followers,
          spotify_milestones: pitch.spotify_milestones,
          general_strategy: pitch.general_strategy,
          social_links: pitch.social_links,
          pitch_config: pitch.pitch_config,
          pitch_type: pitch.pitch_type,
          track_id: pitch.track_id,
          audio_link: pitch.audio_link,
          instruments: pitch.instruments,
          artist_photos_link: pitch.artist_photos_link,
          video_link: pitch.video_link,
          spotify_photos_link: pitch.spotify_photos_link,
          additional_info: pitch.additional_info,
          artist_bio: pitch.artist_bio,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Pitch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pitches', data.release_id] });
      toast.success('Pitch duplicado');
    },
    onError: () => toast.error('Error al duplicar el pitch'),
  });
}
