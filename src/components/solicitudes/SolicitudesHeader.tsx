import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Zap, List, LayoutGrid, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SolicitudesHeaderProps {
  pendientesCount: number;
  aprobadasCount: number;
  denegadasCount: number;
  archivadasCount: number;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  viewMode: 'list' | 'kanban' | 'stats';
  setViewMode: (mode: 'list' | 'kanban' | 'stats') => void;
  onExport: () => void;
  onTemplates: () => void;
  onNewSolicitud: () => void;
}

export function SolicitudesHeader({
  pendientesCount,
  aprobadasCount,
  denegadasCount,
  archivadasCount,
  filterStatus,
  setFilterStatus,
  viewMode,
  setViewMode,
  onExport,
  onTemplates,
  onNewSolicitud,
}: SolicitudesHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Solicitudes</h1>
        <Badge variant="secondary" className="text-sm px-3 py-1 cursor-pointer" onClick={() => setFilterStatus('all')}>
          ver todas
        </Badge>
        <div className="hidden sm:flex gap-2 text-sm text-muted-foreground">
          <span
            className="bg-warning/20 text-warning-foreground px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-warning/30 transition-colors"
            onClick={() => setFilterStatus('pendiente')}
          >
            {pendientesCount} pendientes
          </span>
          <span
            className="bg-success/20 text-success px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-success/30 transition-colors"
            onClick={() => setFilterStatus('aprobada')}
          >
            {aprobadasCount} aprobadas
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs cursor-pointer transition-colors ${
              filterStatus === 'denegada' 
                ? 'bg-muted text-muted-foreground' 
                : filterStatus === 'archivadas'
                ? 'bg-muted text-muted-foreground'
                : 'bg-destructive/20 text-destructive'
            }`}
            onClick={() => {
              if (filterStatus === 'denegada') {
                setFilterStatus('archivadas');
              } else if (filterStatus === 'archivadas') {
                setFilterStatus('denegada');
              } else {
                setFilterStatus('denegada');
              }
            }}
          >
            {filterStatus === 'denegada' 
              ? `${archivadasCount} archivadas`
              : filterStatus === 'archivadas'
              ? `${denegadasCount} denegadas`
              : `${denegadasCount} denegadas`
            }
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onExport} className="h-9">
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Exportar (Ctrl+E)</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onTemplates} className="h-9">
                <Zap className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Plantillas de respuesta</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex border rounded-lg p-1 bg-muted/30">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8 px-3">
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Vista Lista (Ctrl+1)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="h-8 px-3">
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Vista Kanban (Ctrl+2)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={viewMode === 'stats' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('stats')} className="h-8 px-3">
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Estadísticas (Ctrl+3)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onNewSolicitud} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Solicitud
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Ctrl+N</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
