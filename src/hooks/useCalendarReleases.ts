import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CalendarRelease {
  id: string;
  title: string;
  type: string;
  release_date: string;
  status: string;
  artist_id: string | null;
  project_id: string | null;
  cover_image_url: string | null;
  pitch_deadline: string | null;
  artist?: { name: string } | null;
}

export interface CalendarMilestone {
  id: string;
  release_id: string;
  title: string;
  due_date: string;
  status: string;
  category: string | null;
  responsible: string | null;
  release?: { id: string; title: string; artist_id: string | null; project_id: string | null } | null;
}

interface Options {
  artistIds: string[];
  enabled: boolean;
}

export function useCalendarReleases({ artistIds, enabled }: Options) {
  const [releases, setReleases] = useState<CalendarRelease[]>([]);
  const [milestones, setMilestones] = useState<CalendarMilestone[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (artistIds.length === 0) {
      setReleases([]);
      setMilestones([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // 1. Releases of accessible artists with a release_date and not archived
        const { data: directReleases, error: relErr } = await supabase
          .from('releases')
          .select('id, title, type, release_date, status, artist_id, project_id, cover_image_url, pitch_deadline, artist:artists(name)')
          .in('artist_id', artistIds)
          .neq('status', 'archived')
          .not('release_date', 'is', null);
        if (relErr) console.error('Error loading calendar releases:', relErr);

        // 2. Multi-artist releases via release_artists junction
        const { data: junctionRows, error: jErr } = await supabase
          .from('release_artists')
          .select('release_id')
          .in('artist_id', artistIds);
        if (jErr) console.error('Error loading release_artists:', jErr);

        const junctionIds = Array.from(new Set((junctionRows || []).map((r: any) => r.release_id)));
        let extraReleases: any[] = [];
        if (junctionIds.length > 0) {
          const directIds = new Set((directReleases || []).map((r: any) => r.id));
          const missing = junctionIds.filter(id => !directIds.has(id));
          if (missing.length > 0) {
            const { data } = await supabase
              .from('releases')
              .select('id, title, type, release_date, status, artist_id, project_id, cover_image_url, pitch_deadline, artist:artists(name)')
              .in('id', missing)
              .neq('status', 'archived')
              .not('release_date', 'is', null);
            extraReleases = data || [];
          }
        }

        const allReleases = [...(directReleases || []), ...extraReleases] as CalendarRelease[];

        // 3. Milestones of those releases
        const releaseIds = allReleases.map(r => r.id);
        let allMilestones: CalendarMilestone[] = [];
        if (releaseIds.length > 0) {
          const { data: milestoneRows, error: mErr } = await supabase
            .from('release_milestones')
            .select('id, release_id, title, due_date, status, category, responsible')
            .in('release_id', releaseIds)
            .not('due_date', 'is', null);
          if (mErr) console.error('Error loading release milestones:', mErr);
          const releasesById = new Map(allReleases.map(r => [r.id, r]));
          allMilestones = (milestoneRows || []).map((m: any) => ({
            ...m,
            release: releasesById.get(m.release_id)
              ? {
                  id: m.release_id,
                  title: releasesById.get(m.release_id)!.title,
                  artist_id: releasesById.get(m.release_id)!.artist_id,
                }
              : null,
          }));
        }

        if (!cancelled) {
          setReleases(allReleases);
          setMilestones(allMilestones);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, artistIds.join(',')]);

  return { releases, milestones, loading };
}
