import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReleaseMilestone } from '@/hooks/useReleases';

export function useAllReleaseMilestones(releaseIds: string[]) {
  return useQuery({
    queryKey: ['all-release-milestones', releaseIds],
    queryFn: async () => {
      if (!releaseIds.length) return {};

      const { data, error } = await supabase
        .from('release_milestones')
        .select('*')
        .in('release_id', releaseIds)
        .order('due_date', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const grouped: Record<string, ReleaseMilestone[]> = {};
      for (const m of (data as ReleaseMilestone[])) {
        if (!grouped[m.release_id]) grouped[m.release_id] = [];
        grouped[m.release_id].push(m);
      }
      return grouped;
    },
    enabled: releaseIds.length > 0,
  });
}
