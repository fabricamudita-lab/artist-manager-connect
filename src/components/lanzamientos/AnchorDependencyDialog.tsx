import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DependentTask {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
}

interface AnchorDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  daysDelta: number;
  dependentTasks: DependentTask[];
  onConfirm: (propagate: boolean) => void;
}

export default function AnchorDependencyDialog({
  open,
  onOpenChange,
  sourceName,
  daysDelta,
  dependentTasks,
  onConfirm,
}: AnchorDependencyDialogProps) {
  const direction = daysDelta > 0 ? 'adelante' : 'atrás';
  const absDays = Math.abs(daysDelta);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tareas ancladas detectadas</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Has movido <strong>"{sourceName}"</strong> {absDays} día{absDays > 1 ? 's' : ''} hacia {direction}.
              </p>
              <p>Las siguientes tareas están ancladas a esta:</p>
              <ul className="list-disc pl-5 space-y-1">
                {dependentTasks.map(task => (
                  <li key={task.id} className="text-sm">
                    <strong>{task.name}</strong>
                    <span className="text-muted-foreground"> ({task.workflowName})</span>
                  </li>
                ))}
              </ul>
              <p className="font-medium">
                ¿Quieres mover también estas tareas {absDays} día{absDays > 1 ? 's' : ''} hacia {direction}?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirm(false)}>
            No, solo mover "{sourceName}"
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(true)}>
            Sí, mover todas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
