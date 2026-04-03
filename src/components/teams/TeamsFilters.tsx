import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Grid3X3, List, Move, Search } from 'lucide-react';
import { TeamDropdown } from '@/components/TeamDropdown';
import { CategoryDropdown } from '@/components/CategoryDropdown';

interface TeamsFiltersProps {
  artists: Array<{ id: string; name: string; stage_name?: string | null; avatar_url?: string | null }>;
  selectedArtistId: string;
  onArtistChange: (id: string) => void;
  teamMemberCounts: Map<string, number>;
  managementMemberCount: number;
  onManageTeams: () => void;
  categoryPillsData: Array<{ value: string; label: string; count: number; icon: any }>;
  selectedCategoryFilter: string;
  onCategoryChange: (cat: string) => void;
  allMembersCount: number;
  onManageCategories: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: 'grid' | 'list' | 'free';
  onViewModeChange: (mode: 'grid' | 'list' | 'free') => void;
}

export function TeamsFilters({
  artists,
  selectedArtistId,
  onArtistChange,
  teamMemberCounts,
  managementMemberCount,
  onManageTeams,
  categoryPillsData,
  selectedCategoryFilter,
  onCategoryChange,
  allMembersCount,
  onManageCategories,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: TeamsFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TeamDropdown
        teams={artists.map(a => ({
          id: a.id,
          name: a.name,
          stageName: a.stage_name,
          avatarUrl: a.avatar_url,
          memberCount: teamMemberCounts.get(a.id) || 0,
        }))}
        selectedTeamId={selectedArtistId}
        onTeamChange={onArtistChange}
        managementMemberCount={managementMemberCount}
        onManageTeams={onManageTeams}
      />

      {categoryPillsData.length > 0 && (
        <CategoryDropdown
          categories={categoryPillsData}
          selectedCategory={selectedCategoryFilter}
          onCategoryChange={onCategoryChange}
          allCount={allMembersCount}
          onManageCategories={onManageCategories}
        />
      )}

      <div className="relative ml-auto">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 w-40 h-8 text-sm"
        />
      </div>

      <div className="flex gap-0.5 border rounded-lg p-0.5">
        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => onViewModeChange('grid')} className="h-7 w-7" title="Cuadrícula">
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => onViewModeChange('list')} className="h-7 w-7" title="Lista">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button variant={viewMode === 'free' ? 'secondary' : 'ghost'} size="icon" onClick={() => onViewModeChange('free')} className="h-7 w-7" title="Vista libre">
          <Move className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
