import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Release } from './useReleases';
import type { ReleasesFiltersState } from '@/components/releases/ReleasesFiltersToolbar';

interface SearchableRelease extends Release {
  hasMatchingContent?: boolean;
  matchedIn?: string[];
}

export function useReleasesWithSearch(filters: ReleasesFiltersState) {
  return useQuery({
    queryKey: ['releases-with-search', filters],
    queryFn: async () => {
      // First, fetch all releases with basic filters
      let query = supabase.from('releases').select('*');

      // Apply status filter — hide archived by default
      if (filters.status === 'all') {
        query = query.neq('status', 'archived');
      } else if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply artist filter
      if (filters.artistId && filters.artistId !== 'all') {
        query = query.eq('artist_id', filters.artistId);
      }

      // Apply type filter
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      // Apply date range
      if (filters.startDate) {
        query = query.gte('release_date', filters.startDate.toISOString().split('T')[0]);
      }
      if (filters.endDate) {
        query = query.lte('release_date', filters.endDate.toISOString().split('T')[0]);
      }

      const { data: releases, error } = await query.order('release_date', { ascending: false, nullsFirst: true });

      if (error) throw error;

      let filteredReleases = releases as SearchableRelease[];

      // If there's a search term, we need to search across related tables
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        const releaseIds = filteredReleases.map(r => r.id);

        // Search in tracks (for credits and audio)
        const { data: tracks } = await supabase
          .from('tracks')
          .select('id, release_id, title')
          .in('release_id', releaseIds)
          .ilike('title', `%${searchTerm}%`);

        const releasesWithMatchingTracks = new Set(tracks?.map(t => t.release_id) || []);

        // Search in track credits
        const { data: allTracks } = await supabase
          .from('tracks')
          .select('id, release_id')
          .in('release_id', releaseIds);

        const trackIds = allTracks?.map(t => t.id) || [];
        const { data: credits } = await supabase
          .from('track_credits')
          .select('track_id, name, role')
          .in('track_id', trackIds);

        const tracksWithMatchingCredits = new Set(
          credits?.filter(c => 
            c.name?.toLowerCase().includes(searchTerm) || 
            c.role?.toLowerCase().includes(searchTerm)
          ).map(c => c.track_id) || []
        );

        const releasesWithMatchingCredits = new Set(
          allTracks?.filter(t => tracksWithMatchingCredits.has(t.id)).map(t => t.release_id) || []
        );

        // Search in release budgets
        const { data: budgets } = await supabase
          .from('release_budgets')
          .select('release_id, item_name, category, vendor')
          .in('release_id', releaseIds);

        const releasesWithMatchingBudgets = new Set(
          budgets?.filter(b => 
            b.item_name?.toLowerCase().includes(searchTerm) ||
            b.category?.toLowerCase().includes(searchTerm) ||
            b.vendor?.toLowerCase().includes(searchTerm)
          ).map(b => b.release_id) || []
        );

        // Search in release assets (images, videos)
        const { data: assets } = await supabase
          .from('release_assets')
          .select('release_id, title, description, category')
          .in('release_id', releaseIds);

        const releasesWithMatchingAssets = new Set(
          assets?.filter(a => 
            a.title?.toLowerCase().includes(searchTerm) ||
            a.description?.toLowerCase().includes(searchTerm) ||
            a.category?.toLowerCase().includes(searchTerm)
          ).map(a => a.release_id) || []
        );

        // Search in milestones (cronograma)
        const { data: milestones } = await supabase
          .from('release_milestones')
          .select('release_id, title, notes, category')
          .in('release_id', releaseIds);

        const releasesWithMatchingMilestones = new Set(
          milestones?.filter(m => 
            m.title?.toLowerCase().includes(searchTerm) ||
            m.notes?.toLowerCase().includes(searchTerm) ||
            m.category?.toLowerCase().includes(searchTerm)
          ).map(m => m.release_id) || []
        );

        // Filter releases that match either title or any related content
        filteredReleases = filteredReleases.filter(release => {
          const matchesTitle = release.title.toLowerCase().includes(searchTerm);
          const matchesDescription = release.description?.toLowerCase().includes(searchTerm);
          const matchesTracks = releasesWithMatchingTracks.has(release.id);
          const matchesCredits = releasesWithMatchingCredits.has(release.id);
          const matchesBudgets = releasesWithMatchingBudgets.has(release.id);
          const matchesAssets = releasesWithMatchingAssets.has(release.id);
          const matchesMilestones = releasesWithMatchingMilestones.has(release.id);

          const hasMatch = matchesTitle || matchesDescription || matchesTracks || matchesCredits || matchesBudgets || matchesAssets || matchesMilestones;

          if (hasMatch) {
            release.hasMatchingContent = true;
            release.matchedIn = [];
            if (matchesTitle || matchesDescription) release.matchedIn.push('título');
            if (matchesTracks) release.matchedIn.push('audio');
            if (matchesCredits) release.matchedIn.push('créditos');
            if (matchesBudgets) release.matchedIn.push('presupuestos');
            if (matchesAssets) release.matchedIn.push('imagen/video');
            if (matchesMilestones) release.matchedIn.push('cronograma');
          }

          return hasMatch;
        });
      }

      // Filter by budget presence
      if (filters.hasBudget && filters.hasBudget !== 'all') {
        const releaseIds = filteredReleases.map(r => r.id);
        const { data: budgetCounts } = await supabase
          .from('release_budgets')
          .select('release_id')
          .in('release_id', releaseIds);

        const releasesWithBudgets = new Set(budgetCounts?.map(b => b.release_id) || []);

        if (filters.hasBudget === 'with') {
          filteredReleases = filteredReleases.filter(r => releasesWithBudgets.has(r.id));
        } else if (filters.hasBudget === 'without') {
          filteredReleases = filteredReleases.filter(r => !releasesWithBudgets.has(r.id));
        }
      }

      return filteredReleases;
    },
  });
}
