import { useQuery } from '@tanstack/react-query';
import { getReorderImpact, type ReorderImpact } from '@/lib/releases/trackOrderingGuards';

export function useReorderImpact(releaseId: string | undefined) {
  return useQuery<ReorderImpact>({
    queryKey: ['reorder-impact', releaseId],
    queryFn: () => getReorderImpact(releaseId!),
    enabled: !!releaseId,
    staleTime: 30_000,
  });
}
