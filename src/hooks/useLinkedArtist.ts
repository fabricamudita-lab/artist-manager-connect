import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LinkedArtist {
  id: string;
  name: string;
  stage_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function useLinkedArtist() {
  const { user } = useAuth();

  const { data: linkedArtist, isLoading } = useQuery({
    queryKey: ['linked-artist', user?.id],
    queryFn: async (): Promise<LinkedArtist | null> => {
      if (!user) return null;

      const { data: bindings } = await supabase
        .from('artist_role_bindings')
        .select('artist_id, role')
        .eq('user_id', user.id);

      if (!bindings || bindings.length === 0) return null;

      // Find binding with highest privilege (MANAGER > OBSERVER)
      const best = bindings.find(b => b.role === 'MANAGER') || bindings[0];

      const { data: artist } = await supabase
        .from('artists')
        .select('id, name, stage_name, avatar_url')
        .eq('id', best.artist_id)
        .single();

      if (!artist) return null;

      return { ...artist, role: best.role };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return { linkedArtist: linkedArtist ?? null, isLoading };
}
