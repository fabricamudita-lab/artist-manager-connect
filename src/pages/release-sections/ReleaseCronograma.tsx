import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRelease, useReleaseMilestones } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReleaseCronograma() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: milestones, isLoading: loadingMilestones } = useReleaseMilestones(id);

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">{release?.title}</p>
          <h1 className="text-2xl font-bold">Cronograma</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Milestones</CardTitle>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Añadir Milestone
          </Button>
        </CardHeader>
        <CardContent>
          {loadingMilestones ? (
            <Skeleton className="h-32 w-full" />
          ) : milestones && milestones.length > 0 ? (
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="p-3 border rounded-lg">
                  <p className="font-medium">{milestone.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {milestone.due_date || 'Sin fecha'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay milestones aún. Añade hitos para planificar el lanzamiento.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
