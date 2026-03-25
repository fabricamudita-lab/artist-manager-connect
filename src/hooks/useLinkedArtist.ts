import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LinkedArtist {
  id: string;
  name: string;
  stage_name: string | null;
  avatar_url: string | null;
  role: string;
}

const IMPERSONATE_KEY = 'impersonate_artist';

function getImpersonatedArtist(): LinkedArtist | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useLinkedArtist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [impersonated, setImpersonated] = useState<LinkedArtist | null>(getImpersonatedArtist);

  // Listen for storage changes (in case multiple components need sync)
  useEffect(() => {
    const handler = () => setImpersonated(getImpersonatedArtist());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const { data: linkedArtist, isLoading } = useQuery({
    queryKey: ['linked-artist', user?.id],
    queryFn: async (): Promise<LinkedArtist | null> => {
      if (!user) return null;

      const { data: bindings } = await supabase
        .from('artist_role_bindings')
        .select('artist_id, role')
        .eq('user_id', user.id);

      if (!bindings || bindings.length === 0) return null;

      const best = bindings.find(b => b.role === 'ARTIST_MANAGER') || bindings[0];

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

  const startImpersonation = useCallback((artist: LinkedArtist) => {
    sessionStorage.setItem(IMPERSONATE_KEY, JSON.stringify(artist));
    setImpersonated(artist);
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(IMPERSONATE_KEY);
    setImpersonated(null);
  }, []);

  const isImpersonating = impersonated !== null;
  const effectiveArtist = impersonated ?? linkedArtist ?? null;

  return {
    linkedArtist: effectiveArtist,
    isLoading: !impersonated && isLoading,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
  };
}
