import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';

export interface TeamMemberWithCategory {
  id: string;
  name: string;
  category?: string;
  type: 'workspace' | 'contact';
  artistIds?: string[]; // Artists this contact is assigned to
  isManagementTeam?: boolean; // True if contact is part of management team
}

export interface TeamCategory {
  value: string;
  label: string;
  members: TeamMemberWithCategory[];
}

export function useTeamMembersByArtist(selectedArtistIds: string[] = []) {
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const members: TeamMemberWithCategory[] = [];

        // Get user's workspace
        const { data: profileData } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single();

        // Workspace members (with accounts) - these are always visible
        if (profileData?.workspace_id) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('created_by')
            .eq('id', profileData.workspace_id)
            .single();

          let { data: memberships } = await supabase
            .from('workspace_memberships')
            .select('id, user_id, role, team_category')
            .eq('workspace_id', profileData.workspace_id);

          // Auto-create owner membership if needed
          if ((!memberships || memberships.length === 0) && workspace?.created_by === user.id) {
            const { data: newMembership } = await supabase
              .from('workspace_memberships')
              .insert({
                workspace_id: profileData.workspace_id,
                user_id: user.id,
                role: 'OWNER',
                team_category: 'management',
              })
              .select('id, user_id, role, team_category')
              .single();
            memberships = newMembership ? [newMembership] : [];
          }

          if (memberships && memberships.length > 0) {
            const catMap = new Map<string, string>();
            memberships.forEach((m: any) => catMap.set(m.user_id, m.team_category || 'management'));

            const userIds = memberships.map((m: any) => m.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name, stage_name')
              .in('user_id', userIds);

            (profiles || []).forEach((p: any) => {
              members.push({
                id: p.user_id,
                name: p.stage_name || p.full_name || 'Sin nombre',
                category: catMap.get(p.user_id),
                type: 'workspace',
                artistIds: [], // Workspace members are not artist-specific
              });
            });
          }
        }

        // Team contacts (without accounts)
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, stage_name, category, field_config')
          .eq('created_by', user.id);

        const teamContacts = (contacts || []).filter((c: any) => {
          const config = c.field_config as Record<string, any> | null;
          return config?.is_team_member === true;
        });

        // Get artist assignments for all team contacts
        if (teamContacts.length > 0) {
          const contactIds = teamContacts.map(c => c.id);
          const { data: assignments } = await supabase
            .from('contact_artist_assignments')
            .select('contact_id, artist_id')
            .in('contact_id', contactIds);

          const assignmentMap = new Map<string, string[]>();
          (assignments || []).forEach((a: any) => {
            if (!assignmentMap.has(a.contact_id)) {
              assignmentMap.set(a.contact_id, []);
            }
            assignmentMap.get(a.contact_id)!.push(a.artist_id);
          });

          teamContacts.forEach((c: any) => {
            const config = c.field_config as Record<string, any> | null;
            const cats: string[] = Array.isArray(config?.team_categories) ? config.team_categories : [];
            const isManagementTeam = config?.is_management_team === true;

            members.push({
              id: c.id,
              name: c.stage_name || c.name,
              category: cats[0] || c.category,
              type: 'contact',
              artistIds: assignmentMap.get(c.id) || [],
              isManagementTeam,
            });
          });
        }

        setAllTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, []);

  // Filter members based on selected artists
  const filteredMembers = useMemo(() => {
    if (selectedArtistIds.length === 0) {
      // No artist selected - show all team members
      return allTeamMembers;
    }

    // Filter: workspace members always visible, contacts only if:
    // 1. They are marked as management team (is_management_team: true => artistIds is empty array)
    // 2. They are explicitly assigned to one of the selected artists
    return allTeamMembers.filter(member => {
      if (member.type === 'workspace') {
        return true; // Workspace members are always visible
      }
      // Contact: check if is management team (empty artistIds means management)
      // OR explicitly assigned to any selected artist
      if (member.isManagementTeam) {
        return true; // Management team always visible
      }
      // Only show if assigned to at least one selected artist
      if (!member.artistIds || member.artistIds.length === 0) {
        return false; // No assignment and not management = hide
      }
      return member.artistIds.some(id => selectedArtistIds.includes(id));
    });
  }, [allTeamMembers, selectedArtistIds]);

  // Group by categories
  const groupedByCategory = useMemo(() => {
    const categoryMap = new Map<string, TeamMemberWithCategory[]>();
    
    // Initialize with TEAM_CATEGORIES order
    TEAM_CATEGORIES.forEach(cat => {
      categoryMap.set(cat.value, []);
    });
    categoryMap.set('otro', []); // For uncategorized

    filteredMembers.forEach(member => {
      const cat = member.category || 'otro';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push(member);
    });

    // Convert to array, only include non-empty categories
    const result: TeamCategory[] = [];
    TEAM_CATEGORIES.forEach(cat => {
      const members = categoryMap.get(cat.value) || [];
      if (members.length > 0) {
        result.push({
          value: cat.value,
          label: cat.label,
          members,
        });
      }
    });

    // Add "otro" if has members
    const otroMembers = categoryMap.get('otro') || [];
    if (otroMembers.length > 0) {
      result.push({
        value: 'otro',
        label: 'Otros',
        members: otroMembers,
      });
    }

    return result;
  }, [filteredMembers]);

  return {
    allTeamMembers,
    filteredMembers,
    groupedByCategory,
    loading,
  };
}
