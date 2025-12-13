import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Users, FolderKanban, Filter, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArtistSelector } from '@/components/ArtistSelector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
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
  projects: {
    id: string;
    name: string;
  }[];
  teamMembers: {
    id: string;
    full_name: string;
  }[];
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
  teamMembers
}: CalendarToolbarProps) {
  const getDateLabel = () => {
    switch (viewMode) {
      case 'week':
        return format(currentDate, "'Semana del' d 'de' MMMM, yyyy", {
          locale: es
        });
      case 'month':
        return format(currentDate, 'MMMM yyyy', {
          locale: es
        });
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        return `Q${quarter} ${currentDate.getFullYear()}`;
      case 'year':
        return currentDate.getFullYear().toString();
      default:
        return format(currentDate, 'MMMM yyyy', {
          locale: es
        });
    }
  };
  const activeFiltersCount = (selectedArtists.length > 0 ? 1 : 0) + (selectedProjects.length > 0 ? 1 : 0) + (selectedTeam !== 'all' ? 1 : 0) + (selectedDepartment !== 'all' ? 1 : 0);
  return <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-lg">
      {/* Left: Filters */}
      <div className="flex items-center gap-3">
        {/* Filter Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
              {activeFiltersCount > 0 && <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>}
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
                <ArtistSelector selectedArtists={selectedArtists} onSelectionChange={setSelectedArtists} placeholder="Todos los artistas" showSelfOption={true} />
              </div>
              
              {/* Projects */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="h-3 w-3" /> Proyecto
                </label>
                <Select value={selectedProjects[0] || 'all'} onValueChange={value => setSelectedProjects(value === 'all' ? [] : [value])}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos los proyectos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proyectos</SelectItem>
                    {projects.map(project => <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
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
                    {teamMembers.map(member => <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Department */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Departamento</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="produccion">Producción</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="administracion">Administración</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right: Views & Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onGoToToday}>
          Hoy
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium min-w-[180px] text-center capitalize">
          {getDateLabel()}
        </span>
      </div>
    </div>;
}