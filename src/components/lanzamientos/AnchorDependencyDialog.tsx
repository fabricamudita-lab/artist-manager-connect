import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';

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
  onConfirm: (selectedTaskIds: string[]) => void;
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
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedTasks(new Set(dependentTasks.map(t => t.id)));
    }
  }, [open, dependentTasks]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTasks.size === dependentTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(dependentTasks.map(t => t.id)));
    }
  };

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
              <p>Selecciona las tareas que deseas mover también:</p>
              <div className="space-y-2 py-2">
                <div 
                  className="flex items-center space-x-2 pb-2 border-b cursor-pointer"
                  onClick={toggleAll}
                >
                  <Checkbox 
                    id="select-all"
                    checked={selectedTasks.size === dependentTasks.length}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Seleccionar todas
                  </label>
                </div>
                {dependentTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => toggleTask(task.id)}
                  >
                    <Checkbox 
                      id={task.id}
                      checked={selectedTasks.has(task.id)}
                    />
                    <label htmlFor={task.id} className="text-sm cursor-pointer">
                      <strong>{task.name}</strong>
                      <span className="text-muted-foreground"> ({task.workflowName})</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirm([])}>
            No mover ninguna
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(Array.from(selectedTasks))}>
            Mover seleccionadas ({selectedTasks.size})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}