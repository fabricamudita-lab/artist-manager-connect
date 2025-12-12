import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Song {
  id: string;
  title: string;
  artist_id?: string;
  isrc?: string;
  release_date?: string;
  metadata?: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SongSplit {
  id: string;
  song_id: string;
  collaborator_name: string;
  collaborator_email?: string;
  collaborator_contact_id?: string;
  percentage: number;
  role: string;
  payment_info?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformEarning {
  id: string;
  song_id: string;
  platform: string;
  amount: number;
  streams: number;
  period_start: string;
  period_end: string;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useSongs(artistId?: string) {
  return useQuery({
    queryKey: ['songs', artistId],
    queryFn: async () => {
      let query = supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (artistId && artistId !== 'all') {
        query = query.eq('artist_id', artistId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Song[];
    },
  });
}

export function useSongSplits(songId?: string) {
  return useQuery({
    queryKey: ['song_splits', songId],
    queryFn: async () => {
      let query = supabase.from('song_splits').select('*');
      
      if (songId) {
        query = query.eq('song_id', songId);
      }
      
      const { data, error } = await query.order('percentage', { ascending: false });
      
      if (error) throw error;
      return data as SongSplit[];
    },
  });
}

export function usePlatformEarnings(songId?: string) {
  return useQuery({
    queryKey: ['platform_earnings', songId],
    queryFn: async () => {
      let query = supabase.from('platform_earnings').select('*');
      
      if (songId) {
        query = query.eq('song_id', songId);
      }
      
      const { data, error } = await query.order('period_end', { ascending: false });
      
      if (error) throw error;
      return data as PlatformEarning[];
    },
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (song: { title: string; isrc?: string; release_date?: string }) => {
      const { data, error } = await supabase
        .from('songs')
        .insert({
          title: song.title,
          isrc: song.isrc,
          release_date: song.release_date,
          created_by: profile?.user_id || '',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success('Canción creada correctamente');
    },
    onError: (error) => {
      toast.error('Error al crear la canción: ' + error.message);
    },
  });
}

export function useCreateSongSplit() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (split: { song_id: string; collaborator_name: string; collaborator_email?: string; percentage: number; role: string }) => {
      const { data, error } = await supabase
        .from('song_splits')
        .insert({
          song_id: split.song_id,
          collaborator_name: split.collaborator_name,
          collaborator_email: split.collaborator_email,
          percentage: split.percentage,
          role: split.role,
          created_by: profile?.user_id || '',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['song_splits'] });
      toast.success('Split añadido correctamente');
    },
    onError: (error) => {
      toast.error('Error al crear el split: ' + error.message);
    },
  });
}

export function useDeleteSongSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (splitId: string) => {
      const { error } = await supabase
        .from('song_splits')
        .delete()
        .eq('id', splitId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song_splits'] });
      toast.success('Split eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });
}

export function useCreatePlatformEarning() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (earning: { song_id: string; platform: string; amount: number; streams?: number; period_start: string; period_end: string }) => {
      const { data, error } = await supabase
        .from('platform_earnings')
        .insert({
          song_id: earning.song_id,
          platform: earning.platform,
          amount: earning.amount,
          streams: earning.streams || 0,
          period_start: earning.period_start,
          period_end: earning.period_end,
          created_by: profile?.user_id || '',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform_earnings'] });
      toast.success('Ganancia registrada');
    },
    onError: (error) => {
      toast.error('Error al registrar: ' + error.message);
    },
  });
}

export function useRoyaltiesStats(artistId?: string) {
  const { data: songs } = useSongs(artistId);
  const { data: splits } = useSongSplits();
  const { data: earnings } = usePlatformEarnings();

  // Filter earnings by songs if artistId is set
  const songIds = new Set(songs?.map(s => s.id) || []);
  const filteredEarnings = artistId && artistId !== 'all' 
    ? earnings?.filter(e => songIds.has(e.song_id)) 
    : earnings;
  const filteredSplits = artistId && artistId !== 'all'
    ? splits?.filter(s => songIds.has(s.song_id))
    : splits;

  const totalEarnings = filteredEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const totalStreams = filteredEarnings?.reduce((sum, e) => sum + (e.streams || 0), 0) || 0;
  const uniqueCollaborators = new Set(filteredSplits?.map(s => s.collaborator_name) || []).size;
  
  const earningsByPlatform = filteredEarnings?.reduce((acc, e) => {
    acc[e.platform] = (acc[e.platform] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  return {
    totalEarnings,
    totalStreams,
    songsCount: songs?.length || 0,
    collaboratorsCount: uniqueCollaborators,
    earningsByPlatform,
  };
}
