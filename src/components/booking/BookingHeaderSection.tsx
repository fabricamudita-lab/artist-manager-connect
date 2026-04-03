import { Button } from '@/components/ui/button';
import { Kanban, Download, Folder, Settings, RefreshCw, Loader2 } from 'lucide-react';
import { PermissionChip } from '@/components/PermissionChip';
import { PermissionWrapper } from '@/components/PermissionBoundary';

interface BookingHeaderSectionProps {
  onSyncEstados: () => void;
  syncing: boolean;
  onExportCSV: () => void;
  onBackfillFolders: () => void;
  foldersLoading: boolean;
  onEditTemplate: () => void;
}

export function BookingHeaderSection({
  onSyncEstados,
  syncing,
  onExportCSV,
  onBackfillFolders,
  foldersLoading,
  onEditTemplate,
}: BookingHeaderSectionProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-primary rounded-xl">
          <Kanban className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Booking</h1>
          <p className="text-muted-foreground">Gestiona ofertas de conciertos por fases con reglas CityZen</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <PermissionChip />
        <div className="flex gap-3">
          <Button onClick={onSyncEstados} disabled={syncing} variant="outline" size="sm">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar
          </Button>
          <Button onClick={onExportCSV} className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/20">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <PermissionWrapper requiredPermission="manage">
            <Button onClick={onBackfillFolders} disabled={foldersLoading} className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/20">
              <Folder className="h-4 w-4 mr-2" />
              Backfill Carpetas
            </Button>
          </PermissionWrapper>
          <PermissionWrapper requiredPermission="edit">
            <Button onClick={onEditTemplate} className="btn-secondary">
              <Settings className="h-4 w-4 mr-2" />
              Editar plantilla
            </Button>
          </PermissionWrapper>
        </div>
      </div>
    </div>
  );
}
