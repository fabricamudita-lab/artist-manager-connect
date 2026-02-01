import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Release {
  id: string;
  title: string;
  type: 'album' | 'ep' | 'single';
  release_date: string | null;
  cover_image_url: string | null;
  status: 'planning' | 'in_progress' | 'released' | 'archived';
  artist_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  label: string | null;
  upc: string | null;
  genre: string | null;
  artist?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export interface ReleaseMilestone {
  id: string;
  release_id: string;
  title: string;
  due_date: string | null;
  days_offset: number | null;
  is_anchor: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  category: string | null;
  responsible: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  release_id: string;
  title: string;
  track_number: number;
  duration: number | null;
  isrc: string | null;
  lyrics: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackVersion {
  id: string;
  track_id: string;
  version_name: string;
  file_url: string;
  file_bucket: string;
  is_current_version: boolean;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface TrackCredit {
  id: string;
  track_id: string;
  contact_id: string | null;
  name: string;
  role: string;
  percentage: number | null; // Deprecated - use publishing_percentage or master_percentage
  publishing_percentage: number | null; // % de autoría (sobre 100%)
  master_percentage: number | null;     // % de royalties master (sobre 100%)
  notes: string | null;
  created_at: string;
}

export interface ReleaseBudget {
  id: string;
  release_id: string;
  category: string;
  item_name: string;
  estimated_cost: number;
  actual_cost: number;
  status: 'pending' | 'paid' | 'invoiced';
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseAsset {
  id: string;
  release_id: string;
  type: 'image' | 'video' | 'document';
  title: string;
  file_url: string;
  file_bucket: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  category: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// Fetch all releases
export function useReleases() {
  return useQuery({
    queryKey: ['releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('release_date', { ascending: false, nullsFirst: true });

      if (error) throw error;
      return data as Release[];
    },
  });
}

// Fetch single release with all related data
export function useRelease(id: string | undefined) {
  return useQuery({
    queryKey: ['release', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('releases')
        .select(`
          *,
          artist:artists!releases_artist_id_fkey(id, name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Release;
    },
    enabled: !!id,
  });
}

// Create release
export function useCreateRelease() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (release: { title: string; type?: string; release_date?: string | null; description?: string | null; artist_id?: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('releases')
        .insert({
          title: release.title,
          type: release.type || 'single',
          release_date: release.release_date,
          description: release.description,
          artist_id: release.artist_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['artist-releases'] });
      toast.success('Lanzamiento creado');
    },
    onError: () => {
      toast.error('Error al crear el lanzamiento');
    },
  });
}

// Update release
export function useUpdateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Release> & { id: string }) => {
      const { data, error } = await supabase
        .from('releases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['release', data.id] });
      queryClient.invalidateQueries({ queryKey: ['artist-releases'] });
      toast.success('Lanzamiento actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });
}

// Delete release
export function useDeleteRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('releases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      toast.success('Lanzamiento eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar');
    },
  });
}

// Milestones
export function useReleaseMilestones(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['release-milestones', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('release_milestones')
        .select('*')
        .eq('release_id', releaseId)
        .order('due_date', { ascending: true, nullsFirst: true });

      if (error) throw error;
      return data as ReleaseMilestone[];
    },
    enabled: !!releaseId,
  });
}

// Tracks
export function useTracks(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['tracks', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('release_id', releaseId)
        .order('track_number');

      if (error) throw error;
      return data as Track[];
    },
    enabled: !!releaseId,
  });
}

// Track versions
export function useTrackVersions(trackId: string | undefined) {
  return useQuery({
    queryKey: ['track-versions', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from('track_versions')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrackVersion[];
    },
    enabled: !!trackId,
  });
}

// Track credits
export function useTrackCredits(trackId: string | undefined) {
  return useQuery({
    queryKey: ['track-credits', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from('track_credits')
        .select('*')
        .eq('track_id', trackId);

      if (error) throw error;
      return data as TrackCredit[];
    },
    enabled: !!trackId,
  });
}

// Release budgets
export function useReleaseBudgets(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['release-budgets', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('release_budgets')
        .select('*')
        .eq('release_id', releaseId)
        .order('category');

      if (error) throw error;
      return data as ReleaseBudget[];
    },
    enabled: !!releaseId,
  });
}

// Release assets
export function useReleaseAssets(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['release-assets', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('release_assets')
        .select('*')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReleaseAsset[];
    },
    enabled: !!releaseId,
  });
}
