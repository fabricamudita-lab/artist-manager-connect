import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FolderKanban, Filter, UserCircle, ChevronLeft, ChevronRight, Building, Disc3, Target, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArtistSelector } from '@/components/ArtistSelector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TEAM_CATEGORIES, type TeamCategoryOption } from '@/lib/teamCategories';

interface CalendarToolbarProps {
  // View controls
  viewMode: 'week' | 'month' | 'quarter' | 'year';
  setViewMode: (mode: 'week' | 'month' | 'quarter' | 'year') => void;
  currentDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;

  // Filters
  showMyCalendar: boolean;
  setShowMyCalendar: (show: boolean) => void;
  selectedArtists: string[];
  setSelectedArtists: (artists: string[]) => void;
  selectedProjects: string[];
  setSelectedProjects: (projects: string[]) => void;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  projects: { id: string; name: string }[];
  teamMembers: { id: string; full_name: string; type?: 'workspace' | 'contact' }[];
  departments?: TeamCategoryOption[]; // optional override; defaults to all categories
  showReleases?: boolean;
  setShowReleases?: (v: boolean) => void;
  showMilestones?: boolean;
  setShowMilestones?: (v: boolean) => void;
}

export function CalendarToolbar({
  viewMode,
  setViewMode,
  currentDate,
  onNavigate,
  onGoToToday,
  showMyCalendar,
  setShowMyCalendar,
  selectedArtists,
  setSelectedArtists,
  selectedProjects,
  setSelectedProjects,
  selectedTeam,
  setSelectedTeam,
  selectedDepartment,
  setSelectedDepartment,
  projects,
  teamMembers,
  departments,
  showReleases = true,
  setShowReleases,
  showMilestones = true,
  setShowMilestones,
}: CalendarToolbarProps) {
  const getDateLabel = () => {
    switch (viewMode) {
      case 'week':
        return format(currentDate, "'Semana del' d 'de' MMMM, yyyy", { locale: es });
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: es });
      case 'quarter': {
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        return `Q${quarter} ${currentDate.getFullYear()}`;
      }
      case 'year':
        return currentDate.getFullYear().toString();
      default:
        return format(currentDate, 'MMMM yyyy', { locale: es });
    }
  };

  const activeFiltersCount =
    (selectedArtists.length > 0 ? 1 : 0) +
    (selectedProjects.length > 0 ? 1 : 0) +
    (selectedTeam !== 'all' ? 1 : 0) +
    (selectedDepartment !== 'all' ? 1 : 0);

  // Project multi-select helpers
  const toggleProject = (id: string) => {
    if (selectedProjects.includes(id)) {
      setSelectedProjects(selectedProjects.filter((p) => p !== id));
    } else {
      setSelectedProjects([...selectedProjects, id]);
    }
  };
  const projectButtonLabel =
    selectedProjects.length === 0
      ? 'Todos los proyectos'
      : selectedProjects.length === 1
        ? projects.find((p) => p.id === selectedProjects[0])?.name || '1 proyecto'
        : `${selectedProjects.length} proyectos`;

  const departmentList = departments ?? TEAM_CATEGORIES;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-lg">
      {/* Left: Filters */}
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="font-medium text-sm">Filtros</div>

              {/* Artists */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Artistas
                </label>
                <ArtistSelector
                  selectedArtists={selectedArtists}
                  onSelectionChange={setSelectedArtists}
                  placeholder="Ninguno seleccionado"
                  showSelfOption={true}
                />
              </div>

              {/* Projects — multi-select */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="h-3 w-3" /> Proyecto
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between h-8 text-sm font-normal"
                      disabled={projects.length === 0}
                    >
                      <span className="truncate">{projectButtonLabel}</span>
                      <FolderKanban className="h-3.5 w-3.5 opacity-60 shrink-0 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <div className="flex items-center justify-between p-2 border-b">
                      <span className="text-xs text-muted-foreground">
                        {selectedProjects.length} de {projects.length} seleccionados
                      </span>
                      {selectedProjects.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setSelectedProjects([])}
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="max-h-64">
                      <div className="p-1">
                        {projects.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No hay proyectos disponibles para los artistas seleccionados.
                          </div>
                        ) : (
                          projects.map((p) => {
                            const checked = selectedProjects.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => toggleProject(p.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left"
                              >
                                <Checkbox checked={checked} onCheckedChange={() => toggleProject(p.id)} />
                                <span className="flex-1 truncate">{p.name}</span>
                                {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Team Members */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserCircle className="h-3 w-3" /> Equipo
                </label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos los miembros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los miembros</SelectItem>
                    {teamMembers.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Sin miembros para esta selección
                      </div>
                    ) : (
                      teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" /> Departamento
                </label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departmentList.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Sin departamentos para esta selección
                      </div>
                    ) : (
                      departmentList.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Layers */}
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground">Capas adicionales</div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={showReleases} onCheckedChange={(v) => setShowReleases?.(!!v)} />
                  <Disc3 className="h-3.5 w-3.5 text-violet-500" />
                  Lanzamientos
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={showMilestones} onCheckedChange={(v) => setShowMilestones?.(!!v)} />
                  <Target className="h-3.5 w-3.5 text-emerald-500" />
                  Hitos del cronograma
                </label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right: Views & Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onGoToToday}>
          Hoy
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
