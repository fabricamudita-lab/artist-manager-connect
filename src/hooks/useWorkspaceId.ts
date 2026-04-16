import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWorkspaceId(userId: string | undefined) {
  return useQuery({
    queryKey: ['my_workspace_id', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', userId!)
        .single();
      return data?.workspace_id as string | null;
    },
    enabled: !!userId,
  });
}
