import { supabase } from '@/integrations/supabase/client';

/**
 * Finds and merges duplicate contacts (same name, same created_by).
 * Keeps the oldest contact, merges team_categories and roles,
 * re-assigns track_credits and contact_artist_assignments, then deletes duplicates.
 */
export async function deduplicateContacts(): Promise<{ merged: number; deleted: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch all contacts for this user
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, name, role, category, field_config, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!contacts || contacts.length === 0) return { merged: 0, deleted: 0 };

  // Group by normalized name
  const groups = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const key = c.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  let merged = 0;
  let deleted = 0;

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    // Keep the first (oldest) contact
    const primary = group[0];
    const duplicates = group.slice(1);
    const dupIds = duplicates.map(d => d.id);

    // Merge team_categories
    const allCats = new Set<string>();
    const allRoles = new Set<string>();
    for (const c of group) {
      const config = (c.field_config as Record<string, any>) || {};
      const cats: string[] = Array.isArray(config.team_categories) ? config.team_categories : [];
      cats.forEach(cat => allCats.add(cat));
      if (c.category) allCats.add(c.category);
      if (c.role) {
        c.role.split(',').map((r: string) => r.trim()).filter(Boolean).forEach((r: string) => allRoles.add(r));
      }
    }

    const primaryConfig = (primary.field_config as Record<string, any>) || {};

    // Update primary contact with merged data
    await supabase
      .from('contacts')
      .update({
        field_config: {
          ...primaryConfig,
          is_team_member: true,
          team_categories: Array.from(allCats),
        },
        role: Array.from(allRoles).join(', '),
      })
      .eq('id', primary.id);

    // Re-assign track_credits from duplicates to primary
    await supabase
      .from('track_credits')
      .update({ contact_id: primary.id })
      .in('contact_id', dupIds);

    // Re-assign contact_artist_assignments (delete dups that would conflict, then update)
    // First get primary's existing artist assignments
    const { data: primaryAssignments } = await supabase
      .from('contact_artist_assignments')
      .select('artist_id')
      .eq('contact_id', primary.id);

    const existingArtistIds = new Set((primaryAssignments || []).map(a => a.artist_id));

    // Get duplicate assignments
    const { data: dupAssignments } = await supabase
      .from('contact_artist_assignments')
      .select('id, artist_id, contact_id')
      .in('contact_id', dupIds);

    if (dupAssignments) {
      for (const a of dupAssignments) {
        if (existingArtistIds.has(a.artist_id)) {
          // Already linked to primary, just delete the dup assignment
          await supabase.from('contact_artist_assignments').delete().eq('id', a.id);
        } else {
          // Move to primary
          await supabase
            .from('contact_artist_assignments')
            .update({ contact_id: primary.id })
            .eq('id', a.id);
          existingArtistIds.add(a.artist_id);
        }
      }
    }

    // Re-assign contact_group_members
    const { data: primaryGroupMembers } = await supabase
      .from('contact_group_members')
      .select('group_id')
      .eq('contact_id', primary.id);

    const existingGroupIds = new Set((primaryGroupMembers || []).map(g => g.group_id));

    const { data: dupGroupMembers } = await supabase
      .from('contact_group_members')
      .select('id, group_id, contact_id')
      .in('contact_id', dupIds);

    if (dupGroupMembers) {
      for (const g of dupGroupMembers) {
        if (existingGroupIds.has(g.group_id)) {
          await supabase.from('contact_group_members').delete().eq('id', g.id);
        } else {
          await supabase
            .from('contact_group_members')
            .update({ contact_id: primary.id })
            .eq('id', g.id);
          existingGroupIds.add(g.group_id);
        }
      }
    }

    // Delete duplicates
    await supabase.from('contacts').delete().in('id', dupIds);

    merged++;
    deleted += dupIds.length;
  }

  // Step 2: Fix all contacts that have artist assignments but aren't marked as team members
  const { data: allContacts } = await supabase
    .from('contacts')
    .select('id, field_config, category, role')
    .eq('created_by', user.id);

  if (allContacts) {
    const { data: allAssignments } = await supabase
      .from('contact_artist_assignments')
      .select('contact_id')
      .in('contact_id', allContacts.map(c => c.id));

    const assignedContactIds = new Set((allAssignments || []).map(a => a.contact_id));

    for (const contact of allContacts) {
      if (!assignedContactIds.has(contact.id)) continue;
      const config = (contact.field_config as Record<string, any>) || {};
      if (config.is_team_member === true) continue;

      // Mark as team member, add category to team_categories if missing
      const currentCats: string[] = Array.isArray(config.team_categories) ? config.team_categories : [];
      const catsToSet = currentCats.length > 0 ? currentCats : (contact.category ? [contact.category] : ['artistico']);

      await supabase
        .from('contacts')
        .update({
          field_config: {
            ...config,
            is_team_member: true,
            team_categories: catsToSet,
          },
        })
        .eq('id', contact.id);
    }
  }

  return { merged, deleted };
}
