import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Publishing splits (Derechos de Autor - composition/lyrics)
export interface PublishingSplit {
  id: string;
  track_id: string;
  contact_id?: string;
  name: string;
  role: string;
  percentage: number;
  pro_name?: string;
  ipi_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Master splits (Royalties - recording/phonogram)
export interface MasterSplit {
  id: string;
  track_id: string;
  contact_id?: string;
  name: string;
  role: string;
  percentage: number;
  label_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Publishing roles
export const PUBLISHING_ROLES = [
  { value: 'composer', label: 'Compositor' },
  { value: 'lyricist', label: 'Letrista' },
  { value: 'publisher', label: 'Editorial' },
  { value: 'co-writer', label: 'Co-autor' },
  { value: 'arranger', label: 'Arreglista' },
];

// Master roles
export const MASTER_ROLES = [
  { value: 'artist', label: 'Artista Principal' },
  { value: 'featured', label: 'Featuring' },
  { value: 'producer', label: 'Productor' },
  { value: 'label', label: 'Sello' },
  { value: 'mixer', label: 'Mezclador' },
  { value: 'mastering', label: 'Masterizador' },
  { value: 'session', label: 'Músico de Sesión' },
];

// Common PROs (Performing Rights Organizations)
export const PRO_OPTIONS = [
  { value: 'SGAE', label: 'SGAE (España)' },
  { value: 'ASCAP', label: 'ASCAP (USA)' },
  { value: 'BMI', label: 'BMI (USA)' },
  { value: 'PRS', label: 'PRS (UK)' },
  { value: 'SACEM', label: 'SACEM (Francia)' },
  { value: 'GEMA', label: 'GEMA (Alemania)' },
  { value: 'SIAE', label: 'SIAE (Italia)' },
  { value: 'JASRAC', label: 'JASRAC (Japón)' },
  { value: 'other', label: 'Otra' },
];

// =============== PUBLISHING SPLITS HOOKS ===============

export function usePublishingSplits(trackId?: string) {
  return useQuery({
    queryKey: ['track-publishing-splits', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from('track_publishing_splits')
        .select('*')
        .eq('track_id', trackId)
        .order('percentage', { ascending: false });
      if (error) throw error;
      return data as PublishingSplit[];
    },
    enabled: !!trackId,
  });
}

export function useCreatePublishingSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PublishingSplit, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('track_publishing_splits').insert(data);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-publishing-splits', variables.track_id] });
      toast.success('Derecho de autor añadido');
    },
    onError: () => {
      toast.error('Error al añadir derecho de autor');
    },
  });
}

export function useUpdatePublishingSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trackId, ...data }: Partial<PublishingSplit> & { id: string; trackId: string }) => {
      const { error } = await supabase
        .from('track_publishing_splits')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      return { trackId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['track-publishing-splits', result.trackId] });
      toast.success('Derecho de autor actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });
}

export function useDeletePublishingSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trackId }: { id: string; trackId: string }) => {
      const { error } = await supabase.from('track_publishing_splits').delete().eq('id', id);
      if (error) throw error;
      return { trackId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['track-publishing-splits', result.trackId] });
      toast.success('Derecho de autor eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar');
    },
  });
}

// =============== MASTER SPLITS HOOKS ===============

export function useMasterSplits(trackId?: string) {
  return useQuery({
    queryKey: ['track-master-splits', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from('track_master_splits')
        .select('*')
        .eq('track_id', trackId)
        .order('percentage', { ascending: false });
      if (error) throw error;
      return data as MasterSplit[];
    },
    enabled: !!trackId,
  });
}

export function useCreateMasterSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<MasterSplit, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('track_master_splits').insert(data);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-master-splits', variables.track_id] });
      toast.success('Royalty añadido');
    },
    onError: () => {
      toast.error('Error al añadir royalty');
    },
  });
}

export function useUpdateMasterSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trackId, ...data }: Partial<MasterSplit> & { id: string; trackId: string }) => {
      const { error } = await supabase
        .from('track_master_splits')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      return { trackId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['track-master-splits', result.trackId] });
      toast.success('Royalty actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });
}

export function useDeleteMasterSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trackId }: { id: string; trackId: string }) => {
      const { error } = await supabase.from('track_master_splits').delete().eq('id', id);
      if (error) throw error;
      return { trackId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['track-master-splits', result.trackId] });
      toast.success('Royalty eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar');
    },
  });
}

// =============== AGGREGATED STATS ===============

export function useTrackRightsStats(trackId?: string) {
  const { data: publishingSplits } = usePublishingSplits(trackId);
  const { data: masterSplits } = useMasterSplits(trackId);

  const publishingTotal = publishingSplits?.reduce((sum, s) => sum + s.percentage, 0) || 0;
  const masterTotal = masterSplits?.reduce((sum, s) => sum + s.percentage, 0) || 0;

  return {
    publishingTotal,
    masterTotal,
    publishingCount: publishingSplits?.length || 0,
    masterCount: masterSplits?.length || 0,
    publishingComplete: publishingTotal === 100,
    masterComplete: masterTotal === 100,
  };
}

// Get all publishing/master splits for multiple tracks (for release-level view)
export function useReleaseRightsSplits(trackIds: string[]) {
  return useQuery({
    queryKey: ['release-rights-splits', trackIds],
    queryFn: async () => {
      if (!trackIds.length) return { publishing: [], master: [] };

      const [publishingRes, masterRes] = await Promise.all([
        supabase
          .from('track_publishing_splits')
          .select('*')
          .in('track_id', trackIds),
        supabase
          .from('track_master_splits')
          .select('*')
          .in('track_id', trackIds),
      ]);

      if (publishingRes.error) throw publishingRes.error;
      if (masterRes.error) throw masterRes.error;

      return {
        publishing: publishingRes.data as PublishingSplit[],
        master: masterRes.data as MasterSplit[],
      };
    },
    enabled: trackIds.length > 0,
  });
}
