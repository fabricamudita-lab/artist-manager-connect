import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CalendarMilestone } from '@/hooks/useCalendarReleases';

interface Props {
  milestone: CalendarMilestone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  delayed: 'Retrasado',
};

export function MilestoneDayPopover({ milestone, open, onOpenChange }: Props) {
  if (!milestone) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            {milestone.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{statusLabel[milestone.status] || milestone.status}</Badge>
            {milestone.category && <Badge variant="secondary">{milestone.category}</Badge>}
          </div>
          {milestone.release?.title && (
            <p className="text-sm text-muted-foreground">
              Lanzamiento: <span className="text-foreground">{milestone.release.title}</span>
            </p>
          )}
          {milestone.responsible && (
            <p className="text-sm text-muted-foreground">Responsable: <span className="text-foreground">{milestone.responsible}</span></p>
          )}
          {milestone.release?.id && (
            <Button asChild className="w-full">
              <Link to={`/releases/${milestone.release.id}?tab=cronograma`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver cronograma
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
