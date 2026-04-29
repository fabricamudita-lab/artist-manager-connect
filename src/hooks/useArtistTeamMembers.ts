import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';
import type { TeamMemberWithCategory, TeamCategory } from './useTeamMembersByArtist';

/**
 * Returns ONLY the team members explicitly assigned to a given artist via
 * `contact_artist_assignments`. Does NOT include workspace members or general
 * management contacts.
 *
 * This mirrors the "Equipo del Artista" section of the credits selector
 * (AddCreditWithProfileForm) and is used by the format crew picker to keep
 * the default list scoped strictly to the artist's team.
 */
export function useArtistTeamMembers(artistId?: string | null) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['artist-team-members-strict', artistId],
    queryFn: async (): Promise<TeamMemberWithCategory[]> => {
      if (!artistId) return [];

      // Get assignments for this artist
      const { data: assignments, error: aErr } = await supabase
        .from('contact_artist_assignments')
        .select('contact_id')
        .eq('artist_id', artistId);
      if (aErr) throw aErr;
      const contactIds = (assignments || []).map((a: any) => a.contact_id);
      if (contactIds.length === 0) return [];

      const { data: contacts, error: cErr } = await supabase
        .from('contacts')
        .select('id, name, stage_name, category, role, field_config')
        .in('id', contactIds);
      if (cErr) throw cErr;

      return (contacts || []).map((c: any) => {
        const config = c.field_config as Record<string, any> | null;
        const cats: string[] = Array.isArray(config?.team_categories)
          ? config.team_categories
          : [];
        return {
          id: c.id,
          name: c.stage_name || c.name,
          category: cats[0] || c.category,
          role: c.role || undefined,
          type: 'contact' as const,
          artistIds: [artistId],
          isManagementTeam: config?.is_management_team === true,
        };
      });
    },
    enabled: !!artistId,
  });

  const groupedByCategory = useMemo<TeamCategory[]>(() => {
    const map = new Map<string, TeamMemberWithCategory[]>();
    TEAM_CATEGORIES.forEach((cat) => map.set(cat.value, []));
    map.set('otro', []);

    members.forEach((m) => {
      const cat = m.category || 'otro';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    });

    const result: TeamCategory[] = [];
    TEAM_CATEGORIES.forEach((cat) => {
      const list = map.get(cat.value) || [];
      if (list.length > 0) {
        result.push({ value: cat.value, label: cat.label, members: list });
      }
    });
    const otros = map.get('otro') || [];
    if (otros.length > 0) {
      result.push({ value: 'otro', label: 'Otros', members: otros });
    }
    return result;
  }, [members]);

  return { members, groupedByCategory, loading: isLoading };
}
