import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useTracks,
  useReleaseMilestones,
  useReleaseBudgets,
  useReleaseAssets,
} from '@/hooks/useReleases';
import {
  Calendar,
  DollarSign,
  Image,
  Users,
  Music,
  FileText,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export interface ReleaseAlert {
  id: string;
  section: string;
  severity: 'urgent' | 'warning' | 'info';
  message: string;
  icon: LucideIcon;
  dismissible: boolean;
}

function useTrackCreditsByRelease(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['track-credits-by-release', releaseId],
    queryFn: async () => {
      if (!releaseId) return new Set<string>();
      const { data, error } = await supabase
        .from('track_credits')
        .select('track_id, tracks!inner(release_id)')
        .eq('tracks.release_id', releaseId);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.track_id as string));
    },
    enabled: !!releaseId,
  });
}

function useTrackVersionsByRelease(releaseId: string | undefined) {
  return useQuery({
    queryKey: ['track-versions-by-release', releaseId],
    queryFn: async () => {
      if (!releaseId) return new Set<string>();
      const { data, error } = await supabase
        .from('track_versions')
        .select('track_id, tracks!inner(release_id)')
        .eq('tracks.release_id', releaseId);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.track_id as string));
    },
    enabled: !!releaseId,
  });
}

export function useReleaseHealthCheck(releaseId: string | undefined) {
  const { data: tracks = [] } = useTracks(releaseId);
  const { data: milestones = [] } = useReleaseMilestones(releaseId);
  const { data: budgets = [] } = useReleaseBudgets(releaseId);
  const { data: assets = [] } = useReleaseAssets(releaseId);
  const { data: tracksWithCredits = new Set() } = useTrackCreditsByRelease(releaseId);
  const { data: tracksWithAudio = new Set() } = useTrackVersionsByRelease(releaseId);

  const alerts = useMemo<ReleaseAlert[]>(() => {
    if (!releaseId) return [];
    const result: ReleaseAlert[] = [];
    const now = new Date();

    // --- Créditos ---
    if (tracks.length > 0) {
      const missing = tracks.filter(t => !tracksWithCredits.has(t.id)).length;
      if (missing > 0) {
        result.push({
          id: 'credits-missing',
          section: 'creditos',
          severity: 'warning',
          message: `Faltan ${missing} de ${tracks.length} canciones por inscribir en Créditos y Autoría`,
          icon: Users,
          dismissible: false,
        });
      }
    }

    // --- Audio ---
    if (tracks.length > 0) {
      const missing = tracks.filter(t => !tracksWithAudio.has(t.id)).length;
      if (missing > 0) {
        result.push({
          id: 'audio-missing',
          section: 'audio',
          severity: 'warning',
          message: `${missing} ${missing === 1 ? 'canción sin archivo' : 'canciones sin archivo'} de audio`,
          icon: Music,
          dismissible: false,
        });
      }
    }

    // --- Cronograma ---
    if (milestones.length === 0) {
      result.push({
        id: 'cronograma-empty',
        section: 'cronograma',
        severity: 'info',
        message: 'El Cronograma aún no ha sido creado',
        icon: Calendar,
        dismissible: true,
      });
    } else {
      const delayed = milestones.filter(m => m.status === 'delayed').length;
      if (delayed > 0) {
        result.push({
          id: 'cronograma-delayed',
          section: 'cronograma',
          severity: 'urgent',
          message: `${delayed} ${delayed === 1 ? 'tarea del cronograma está retrasada' : 'tareas del cronograma están retrasadas'}`,
          icon: Calendar,
          dismissible: false,
        });
      }

      const upcoming = milestones.filter(m => {
        if (m.status === 'completed' || m.status === 'delayed') return false;
        if (!m.due_date) return false;
        const days = differenceInDays(parseISO(m.due_date), now);
        return days >= 0 && days <= 7;
      }).length;
      if (upcoming > 0) {
        result.push({
          id: 'cronograma-upcoming',
          section: 'cronograma',
          severity: 'urgent',
          message: `${upcoming} ${upcoming === 1 ? 'tarea vence' : 'tareas vencen'} en los próximos 7 días`,
          icon: Calendar,
          dismissible: false,
        });
      }
    }

    // --- Presupuestos ---
    if (budgets.length === 0) {
      result.push({
        id: 'budget-empty',
        section: 'presupuestos',
        severity: 'info',
        message: 'No se han definido presupuestos',
        icon: DollarSign,
        dismissible: true,
      });
    } else {
      const totalEstimated = budgets.reduce((s, b) => s + (b.estimated_cost || 0), 0);
      const totalActual = budgets.reduce((s, b) => s + (b.actual_cost || 0), 0);
      if (totalActual > totalEstimated && totalEstimated > 0) {
        const over = totalActual - totalEstimated;
        result.push({
          id: 'budget-over',
          section: 'presupuestos',
          severity: 'warning',
          message: `El presupuesto está sobregirado en $${over.toLocaleString()}`,
          icon: DollarSign,
          dismissible: false,
        });
      }
    }

    // --- Imagen & Video ---
    const mediaAssets = assets.filter(a => a.type === 'image' || a.type === 'video');
    if (mediaAssets.length === 0) {
      result.push({
        id: 'media-empty',
        section: 'imagen-video',
        severity: 'info',
        message: 'No se han subido imágenes ni videos',
        icon: Image,
        dismissible: true,
      });
    }

    // --- EPF ---
    const docAssets = assets.filter(a => a.type === 'document');
    if (docAssets.length === 0) {
      result.push({
        id: 'epf-empty',
        section: 'epf',
        severity: 'info',
        message: 'El EPF está vacío',
        icon: FileText,
        dismissible: true,
      });
    }

    // --- Splits ---
    // Check if any track has credits that don't sum to 100%
    if (tracks.length > 0 && tracksWithCredits.size > 0) {
      // We need a separate query for this — for now we skip the detailed split check
      // since it requires per-track percentage sums. This can be added later.
    }

    // Sort: urgent > warning > info
    const order: Record<string, number> = { urgent: 0, warning: 1, info: 2 };
    result.sort((a, b) => order[a.severity] - order[b.severity]);

    return result;
  }, [releaseId, tracks, milestones, budgets, assets, tracksWithCredits, tracksWithAudio]);

  return alerts;
}
