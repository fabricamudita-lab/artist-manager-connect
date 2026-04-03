import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, MousePointerClick } from 'lucide-react';

interface TeamsHeaderProps {
  memberCount: number;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onAddContact: () => void;
  onInvite: () => void;
  workspaceId: string | null;
}

export function TeamsHeader({
  memberCount,
  selectionMode,
  onToggleSelectionMode,
  onAddContact,
  onInvite,
  workspaceId,
}: TeamsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Equipos</h1>
        <Badge variant="secondary" className="text-xs">{memberCount}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={selectionMode ? 'default' : 'ghost'}
          size="sm"
          onClick={onToggleSelectionMode}
          className="h-8"
        >
          <MousePointerClick className="w-3.5 h-3.5 mr-1.5" />
          {selectionMode ? 'Cancelar' : 'Seleccionar'}
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={onAddContact}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Perfil
        </Button>
        <Button size="sm" className="h-8" onClick={onInvite} disabled={!workspaceId}>
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          Invitar
        </Button>
      </div>
    </div>
  );
}
