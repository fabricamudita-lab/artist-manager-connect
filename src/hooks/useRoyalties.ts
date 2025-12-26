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

// Discografía (tracks) — usado para mostrar canciones de lanzamientos
export interface TrackCredit {
  id: string;
  track_id: string;
  name: string;
  role: string;
  percentage: number;
  contact_id?: string;
}

export interface Track {
  id: string;
  title: string;
  release_id: string;
  track_number: number;
  isrc?: string;
  release_title?: string;
  artist_id?: string;
}

export function useTracksWithCredits(artistId?: string) {
  return useQuery({
    queryKey: ['tracks-with-credits', artistId],
    queryFn: async () => {
      // If filtering by a specific artist, get artist info first
      let artistName: string | null = null;
      if (artistId && artistId !== 'all') {
        const { data: artist } = await supabase
          .from('artists')
          .select('name, stage_name')
          .eq('id', artistId)
          .single();
        artistName = artist?.name || artist?.stage_name || null;
      }

      // Get releases - either filtered by artist_id OR all if no filter
      let releasesQuery = supabase.from('releases').select('id, title, artist_id');

      if (artistId && artistId !== 'all') {
        // Get releases by artist_id OR releases without artist_id (we'll filter by credits later)
        releasesQuery = releasesQuery.or(`artist_id.eq.${artistId},artist_id.is.null`);
      }

      const { data: releases, error: releasesError } = await releasesQuery;
      if (releasesError) throw releasesError;

      if (!releases || releases.length === 0) return { tracks: [], credits: [] };

      const releaseIds = releases.map((r) => r.id);

      // Get tracks from those releases
      const { data: tracks, error: tracksError } = await supabase
        .from('tracks')
        .select('id, title, release_id, track_number, isrc')
        .in('release_id', releaseIds)
        .order('track_number');

      if (tracksError) throw tracksError;
      if (!tracks || tracks.length === 0) return { tracks: [], credits: [] };

      const trackIds = tracks.map((t) => t.id);

      // Get credits for those tracks (only those with percentage = splits)
      const { data: credits, error: creditsError } = await supabase
        .from('track_credits')
        .select('*')
        .in('track_id', trackIds)
        .not('percentage', 'is', null);

      if (creditsError) throw creditsError;

      // If filtering by artist, also filter tracks where artist appears as a credit
      let filteredTracks = tracks;
      let filteredCredits = credits || [];

      if (artistId && artistId !== 'all' && artistName) {
        // Find tracks where this artist has a credit
        const artistCreditTrackIds = new Set(
          filteredCredits
            .filter((c: any) => c.name?.toLowerCase().includes(artistName!.toLowerCase()))
            .map((c: any) => c.track_id)
        );

        // Also include tracks from releases with matching artist_id
        const artistReleaseIds = new Set(releases.filter((r) => r.artist_id === artistId).map((r) => r.id));

        filteredTracks = tracks.filter((t) => artistCreditTrackIds.has(t.id) || artistReleaseIds.has(t.release_id));

        const filteredTrackIds = new Set(filteredTracks.map((t) => t.id));
        filteredCredits = filteredCredits.filter((c: any) => filteredTrackIds.has(c.track_id));
      }

      // Map tracks with release info
      const tracksWithRelease = filteredTracks.map((t) => ({
        ...t,
        release_title: releases.find((r) => r.id === t.release_id)?.title,
        artist_id: releases.find((r) => r.id === t.release_id)?.artist_id,
      }));

      return { tracks: tracksWithRelease as Track[], credits: filteredCredits as TrackCredit[] };
    },
  });
}

export function useSongs(artistId?: string) {
  return useQuery({
    queryKey: ['songs', artistId],
    queryFn: async () => {
      let query = supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Include songs for this artist OR songs without artist_id (shared/unassigned)
      if (artistId && artistId !== 'all') {
        query = query.or(`artist_id.eq.${artistId},artist_id.is.null`);
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
    mutationFn: async (song: {
      title: string;
      artist_id?: string;
      isrc?: string;
      release_date?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('songs')
        .insert({
          title: song.title,
          artist_id: song.artist_id ?? null,
          isrc: song.isrc,
          release_date: song.release_date,
          metadata: song.metadata ?? {},
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

  // Also fetch track credits from releases for unified stats
  const { data: tracksData } = useQuery({
    queryKey: ['tracks-credits-stats', artistId],
    queryFn: async () => {
      // If filtering by a specific artist, get artist info first
      let artistName: string | null = null;
      if (artistId && artistId !== 'all') {
        const { data: artist } = await supabase
          .from('artists')
          .select('name, stage_name')
          .eq('id', artistId)
          .single();
        artistName = artist?.name || artist?.stage_name || null;
      }
      
      // Get releases - either filtered by artist_id OR all if no filter
      let releasesQuery = supabase
        .from('releases')
        .select('id, artist_id');
      
      if (artistId && artistId !== 'all') {
        // Get releases by artist_id OR releases without artist_id
        releasesQuery = releasesQuery.or(`artist_id.eq.${artistId},artist_id.is.null`);
      }
      
      const { data: releases } = await releasesQuery;
      if (!releases || releases.length === 0) return { tracks: [], credits: [] };
      
      const releaseIds = releases.map(r => r.id);
      
      const { data: tracks } = await supabase
        .from('tracks')
        .select('id, release_id')
        .in('release_id', releaseIds);
      
      if (!tracks || tracks.length === 0) return { tracks: [], credits: [] };
      
      const trackIds = tracks.map(t => t.id);
      
      const { data: credits } = await supabase
        .from('track_credits')
        .select('*')
        .in('track_id', trackIds)
        .not('percentage', 'is', null);
      
      // If filtering by artist, filter tracks where artist appears as a credit
      let filteredTracks = tracks;
      let filteredCredits = credits || [];
      
      if (artistId && artistId !== 'all' && artistName) {
        const artistCreditTrackIds = new Set(
          filteredCredits
            .filter(c => c.name?.toLowerCase().includes(artistName!.toLowerCase()))
            .map(c => c.track_id)
        );
        
        const artistReleaseIds = new Set(
          releases.filter(r => r.artist_id === artistId).map(r => r.id)
        );
        
        filteredTracks = tracks.filter(t => 
          artistCreditTrackIds.has(t.id) || artistReleaseIds.has(t.release_id)
        );
        
        const filteredTrackIds = new Set(filteredTracks.map(t => t.id));
        filteredCredits = filteredCredits.filter(c => filteredTrackIds.has(c.track_id));
      }
      
      return { tracks: filteredTracks, credits: filteredCredits };
    },
  });

  // Filter earnings by songs if artistId is set
  const songIds = new Set(songs?.map(s => s.id) || []);
  const filteredEarnings = artistId && artistId !== 'all' 
    ? earnings?.filter(e => songIds.has(e.song_id)) 
    : earnings;
  const filteredSplits = artistId && artistId !== 'all'
    ? splits?.filter(s => songIds.has(s.song_id))
    : splits;

  // Combine collaborators from both sources
  const songCollaborators = new Set(filteredSplits?.map(s => s.collaborator_name) || []);
  const trackCollaborators = new Set(tracksData?.credits?.map(c => c.name) || []);
  const allCollaborators = new Set([...songCollaborators, ...trackCollaborators]);

  const totalEarnings = filteredEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const totalStreams = filteredEarnings?.reduce((sum, e) => sum + (e.streams || 0), 0) || 0;
  
  // Count songs: manual songs + tracks with credits from releases
  const tracksWithCredits = tracksData?.tracks?.filter(t => 
    tracksData?.credits?.some(c => c.track_id === t.id)
  )?.length || 0;
  const totalSongsCount = (songs?.length || 0) + tracksWithCredits;
  
  const earningsByPlatform = filteredEarnings?.reduce((acc, e) => {
    acc[e.platform] = (acc[e.platform] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  return {
    totalEarnings,
    totalStreams,
    songsCount: totalSongsCount,
    collaboratorsCount: allCollaborators.size,
    earningsByPlatform,
  };
}
