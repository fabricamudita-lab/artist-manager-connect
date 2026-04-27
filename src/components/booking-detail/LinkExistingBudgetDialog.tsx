import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
import { Search, Link as LinkIcon, ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  searchUnlinkedBudgetsForArtist,
  linkBudgetToBooking,
  BookingBudgetError,
  type BookingBudgetRow,
} from '@/lib/budgets/bookingBudgets';

interface LinkExistingBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  artistId: string | null;
  onLinked: () => void;
}

const PAGE_SIZE = 20;

export function LinkExistingBudgetDialog({
  open,
  onOpenChange,
  bookingId,
  artistId,
  onLinked,
}: LinkExistingBudgetDialogProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pendingForce, setPendingForce] = useState<BookingBudgetRow | null>(null);
  const debounced = useDebounce(search, 250);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setSearch('');
      setPage(0);
      setPendingForce(null);
    }
  }, [open]);

  useEffect(() => {
    setPage(0);
  }, [debounced]);

  const { data, isLoading } = useQuery({
    queryKey: ['unlinked-budgets', artistId, debounced, page],
    queryFn: () =>
      searchUnlinkedBudgetsForArtist({
        artistId: artistId!,
        query: debounced,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    enabled: open && !!artistId,
  });

  const linkMutation = useMutation({
    mutationFn: async ({ budgetId, force }: { budgetId: string; force?: boolean }) => {
      await linkBudgetToBooking(budgetId, bookingId, { force });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-budgets', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-budgets', artistId] });
      toast({ title: 'Presupuesto vinculado' });
      onLinked();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      if (err instanceof BookingBudgetError && err.code === 'ALREADY_LINKED_OTHER_BOOKING') {
        // No debería ocurrir aquí porque filtramos por null, pero por si acaso.
        toast({
          title: 'Ya vinculado',
          description: err.message,
          variant: 'destructive',
        });
        return;
      }
      const message = err instanceof Error ? err.message : 'Error al vincular';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });

  const fmt = (n: number | null) =>
    n == null ? '—' : n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular presupuesto existente</DialogTitle>
            <DialogDescription>
              Selecciona un presupuesto del mismo artista para vincularlo a este evento.
            </DialogDescription>
          </DialogHeader>

          {!artistId ? (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
              title="Sin artista asignado"
              description="Asigna primero un artista al booking para poder vincular presupuestos."
            />
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value.slice(0, 100))}
                  placeholder="Buscar por nombre…"
                  className="pl-9"
                  maxLength={100}
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : !data || data.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay presupuestos disponibles{debounced ? ` para "${debounced}"` : ''}.
                  </p>
                ) : (
                  data.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.event_date ? `${b.event_date} · ` : ''}
                          {b.venue || b.city || 'Sin ubicación'} · {fmt(b.fee)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => linkMutation.mutate({ budgetId: b.id })}
                        disabled={linkMutation.isPending}
                      >
                        <LinkIcon className="h-3.5 w-3.5 mr-1" />
                        Vincular
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Página {page + 1}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data || data.length < PAGE_SIZE || isLoading}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingForce} onOpenChange={(o) => !o && setPendingForce(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Mover presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Este presupuesto ya está vinculado a otro evento. Si continúas, se moverá a este
              booking y dejará de estar vinculado al anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingForce) {
                  linkMutation.mutate({ budgetId: pendingForce.id, force: true });
                  setPendingForce(null);
                }
              }}
            >
              Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
