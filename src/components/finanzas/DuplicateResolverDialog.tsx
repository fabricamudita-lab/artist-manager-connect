import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, GitMerge } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Budget {
  id: string;
  name: string;
  type?: string;
  fee?: number;
  event_date?: string;
  show_status?: string;
  budget_status?: string;
  metadata?: Record<string, any>;
  project_id?: string;
  release_id?: string;
  artists?: { name: string; stage_name?: string } | null;
  releases?: { title: string } | null;
  projects?: { name: string } | null;
}

type MergeField = 'fee' | 'estado' | 'project_id';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getEstadoReal(budget: Budget): string {
  const meta = budget.metadata as any;
  if (meta?.estado) return meta.estado;
  if (budget.show_status) return budget.show_status;
  if (
    budget.budget_status &&
    budget.budget_status !== 'nacional' &&
    budget.budget_status !== 'internacional'
  ) {
    return budget.budget_status;
  }
  return 'borrador';
}

function hasDifferences(group: Budget[]): boolean {
  const ref = group[0];
  return group.slice(1).some(
    (b) =>
      (b.fee ?? 0) !== (ref.fee ?? 0) ||
      getEstadoReal(b) !== getEstadoReal(ref) ||
      (b.project_id ?? null) !== (ref.project_id ?? null) ||
      (b.release_id ?? null) !== (ref.release_id ?? null),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface DuplicateResolverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Budget[][];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onKeep: (keepId: string, group: Budget[]) => Promise<void>;
  onMerge: (targetId: string, overrides: Record<string, any>, group: Budget[]) => Promise<void>;
}

export function DuplicateResolverDialog({
  open, onOpenChange, groups, currentIndex, onNavigate, onKeep, onMerge,
}: DuplicateResolverDialogProps) {
  const group = groups[currentIndex];
  const [mergeMode, setMergeMode] = useState(false);
  const [selections, setSelections] = useState<Record<MergeField, string>>({
    fee: '', estado: '', project_id: '',
  });
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (group && group.length > 0) {
      setSelections({ fee: group[0].id, estado: group[0].id, project_id: group[0].id });
      setMergeMode(false);
    }
  }, [currentIndex, group]);

  if (!group || group.length === 0) return null;

  const withDiffs = hasDifferences(group);

  const fieldLabel: Record<MergeField, string> = {
    fee: '💰 Capital',
    estado: '🗂 Estado',
    project_id: '📁 Vinculado a',
  };

  const getFieldValue = (b: Budget, field: MergeField): string => {
    if (field === 'fee') return b.fee ? `€${b.fee.toLocaleString('es-ES')}` : '—';
    if (field === 'estado') return getEstadoReal(b);
    if (field === 'project_id') return b.projects?.name ?? b.releases?.title ?? '—';
    return '—';
  };

  const handleMerge = async () => {
    setMerging(true);
    const target = group[0];
    const overrides: Record<string, any> = {};

    const feeWinner = group.find((b) => b.id === selections.fee);
    if (feeWinner) overrides.fee = feeWinner.fee ?? 0;

    const estadoWinner = group.find((b) => b.id === selections.estado);
    if (estadoWinner) {
      const estado = getEstadoReal(estadoWinner);
      overrides.metadata = { ...(target.metadata || {}), estado };
      const VALID_SHOW_STATUS = ['confirmado', 'pendiente', 'cancelado'];
      if (target.type === 'concierto' && VALID_SHOW_STATUS.includes(estado)) {
        overrides.show_status = estado;
      }
    }

    const projectWinner = group.find((b) => b.id === selections.project_id);
    if (projectWinner) overrides.project_id = projectWinner.project_id ?? null;

    await onMerge(target.id, overrides, group);
    setMerging(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            Posibles duplicados — Grupo {currentIndex + 1} de {groups.length}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>"{group[0].name}"</strong>
            {group[0].artists && (
              <> · {group[0].artists.stage_name || group[0].artists.name}</>
            )}
          </p>
        </DialogHeader>

        {/* Comparison table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground w-[120px]">Campo</th>
                {group.map((b, idx) => (
                  <th key={b.id} className="text-left p-3 font-medium">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <span className="ml-1 font-mono text-xs text-muted-foreground/60">
                      …{b.id.slice(-6)}
                    </span>
                    {idx === 0 && (
                      <Badge variant="outline" className="ml-2 text-[10px] py-0">original</Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Fecha */}
              <tr className="border-b border-border/50">
                <td className="p-3 text-muted-foreground">📅 Fecha</td>
                {group.map((b, idx) => {
                  const val = b.event_date
                    ? new Date(b.event_date).toLocaleDateString('es-ES')
                    : '—';
                  const ref = group[0].event_date
                    ? new Date(group[0].event_date).toLocaleDateString('es-ES')
                    : '—';
                  const diff = idx > 0 && val !== ref;
                  return (
                    <td key={b.id} className={`p-3 ${diff ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                      {idx > 0 && !diff ? <span className="text-muted-foreground/40">=</span> : val}
                    </td>
                  );
                })}
              </tr>
              {/* Capital */}
              <tr className="border-b border-border/50">
                <td className="p-3 text-muted-foreground">💰 Capital</td>
                {group.map((b, idx) => {
                  const val = b.fee ? `€${b.fee.toLocaleString('es-ES')}` : '—';
                  const ref = group[0].fee ? `€${group[0].fee.toLocaleString('es-ES')}` : '—';
                  const diff = idx > 0 && val !== ref;
                  return (
                    <td key={b.id} className={`p-3 ${diff ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                      {idx > 0 && !diff ? <span className="text-muted-foreground/40">=</span> : val}
                    </td>
                  );
                })}
              </tr>
              {/* Estado */}
              <tr className="border-b border-border/50">
                <td className="p-3 text-muted-foreground">🗂 Estado</td>
                {group.map((b, idx) => {
                  const val = getEstadoReal(b);
                  const ref = getEstadoReal(group[0]);
                  const diff = idx > 0 && val !== ref;
                  return (
                    <td key={b.id} className={`p-3 ${diff ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                      {idx > 0 && !diff ? <span className="text-muted-foreground/40">=</span> : val}
                    </td>
                  );
                })}
              </tr>
              {/* Vinculado */}
              <tr className="border-b border-border/50">
                <td className="p-3 text-muted-foreground">📁 Vínculo</td>
                {group.map((b, idx) => {
                  const val = b.projects?.name ?? b.releases?.title ?? '—';
                  const ref = group[0].projects?.name ?? group[0].releases?.title ?? '—';
                  const diff = idx > 0 && val !== ref;
                  return (
                    <td key={b.id} className={`p-3 ${diff ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                      {idx > 0 && !diff ? <span className="text-muted-foreground/40">=</span> : val}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {withDiffs && !mergeMode && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Se encontraron diferencias entre los duplicados. Puedes fusionarlos eligiendo campo a campo.
          </p>
        )}

        {/* Merge mode */}
        {mergeMode && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-primary" />
              Elige qué valor conservar para cada campo (se guardará en #{1} y se eliminarán el resto)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-2 text-muted-foreground font-medium">Campo</th>
                    {group.map((b, idx) => (
                      <th key={b.id} className="text-left p-2 font-medium text-xs">#{idx + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(['fee', 'estado', 'project_id'] as MergeField[]).map((field) => (
                    <tr key={field} className="border-b border-border/30">
                      <td className="p-2 text-muted-foreground text-xs">{fieldLabel[field]}</td>
                      {group.map((b) => (
                        <td key={b.id} className="p-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`merge-${field}`}
                              value={b.id}
                              checked={selections[field] === b.id}
                              onChange={() => setSelections((s) => ({ ...s, [field]: b.id }))}
                              className="accent-primary"
                            />
                            <span className={`text-xs ${selections[field] === b.id ? 'font-semibold' : 'text-muted-foreground'}`}>
                              {getFieldValue(b, field)}
                            </span>
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {!mergeMode ? (
            <>
              <p className="text-sm font-medium text-foreground mb-3">¿Qué quieres hacer?</p>
              <div className="flex flex-wrap gap-2">
                {group.map((b, idx) => (
                  <Button
                    key={b.id}
                    variant="outline"
                    size="sm"
                    className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => onKeep(b.id, group)}
                  >
                    Conservar #{idx + 1} y eliminar el resto
                  </Button>
                ))}
              </div>
              {withDiffs && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => setMergeMode(true)}
                >
                  <GitMerge className="h-3 w-3 mr-1.5" />
                  Fusionar (elegir campo a campo)
                </Button>
              )}
              <div className="flex gap-2 pt-1">
                {groups.length > 1 && currentIndex < groups.length - 1 && (
                  <Button variant="ghost" size="sm" onClick={() => onNavigate(currentIndex + 1)}>
                    Siguiente grupo →
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Ignorar — mantener todos
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleMerge}
                disabled={merging}
                className="text-xs"
              >
                <GitMerge className="h-3 w-3 mr-1.5" />
                {merging ? 'Fusionando…' : 'Fusionar con los valores elegidos'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMergeMode(false)}>
                ← Volver
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
