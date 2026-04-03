import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, MessageSquare, Link } from "lucide-react";

interface ProjectDetailOverviewTabProps {
  project: any;
  budgets: any[];
  tasks: any[];
  linkedEntities: any[];
  documents: any[];
  contracts: any[];
  onLinkEntityClick: () => void;
}

export function ProjectDetailOverviewTab({
  project, budgets, tasks, linkedEntities, documents, contracts, onLinkEntityClick,
}: ProjectDetailOverviewTabProps) {
  const typeConfig: Record<string, { emoji: string; label: string }> = {
    show: { emoji: '🎤', label: 'Shows' },
    release: { emoji: '💿', label: 'Releases' },
    sync: { emoji: '🎬', label: 'Sincronizaciones' },
    videoclip: { emoji: '🎥', label: 'Videoclips' },
    prensa: { emoji: '📰', label: 'Prensa' },
    merch: { emoji: '👕', label: 'Merch' },
    sponsor: { emoji: '🤝', label: 'Sponsors' },
    brand_deal: { emoji: '💼', label: 'Brand Deals' },
    tour: { emoji: '🚌', label: 'Tours' },
  };

  return (
    <div className="space-y-6">
      {/* Misión + Por qué */}
      {(project.objective || project.description) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.objective && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-green-700 dark:text-green-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Misión del proyecto</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{project.objective}</p>
            </div>
          )}
          {project.description && project.description !== project.objective && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Por qué existe</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{project.description}</p>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(() => {
          const confirmedBudgets = budgets.filter(b => {
            const estado = (b as any).metadata?.estado || b.budget_status || b.show_status;
            return estado === 'confirmado';
          });
          const feeConfirmado = confirmedBudgets.reduce((sum, b) => sum + (b.fee || 0), 0);
          const negociacionBudgets = budgets.filter(b => {
            const estado = (b as any).metadata?.estado || b.budget_status || b.show_status;
            return estado === 'pendiente' || estado === 'negociacion';
          });
          const feeNegociacion = negociacionBudgets.reduce((sum, b) => sum + (b.fee || 0), 0);
          const completedTasks = tasks.filter(t => t.estado === 'completada').length;
          const totalTasks = tasks.length;
          const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k€` : `${n}€`;

          return (
            <>
              <div className="rounded-lg border bg-card p-4 space-y-1 hover:shadow-md transition-shadow">
                <div className="text-[13px] font-medium text-foreground">✅ Fee confirmado</div>
                <div className="text-2xl font-bold text-foreground">{fmt(feeConfirmado)}</div>
                <div className="text-[11px] text-muted-foreground">{confirmedBudgets.length} show{confirmedBudgets.length !== 1 ? 's' : ''} confirmado{confirmedBudgets.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="rounded-lg border bg-card p-4 space-y-1 hover:shadow-md transition-shadow">
                <div className="text-[13px] font-medium text-foreground">🤝 En negociación</div>
                <div className="text-2xl font-bold text-foreground">{fmt(feeNegociacion)}</div>
                <div className="text-[11px] text-muted-foreground">potencial pendiente</div>
              </div>
              <div className="rounded-lg border bg-card p-4 space-y-1 hover:shadow-md transition-shadow">
                <div className="text-[13px] font-medium text-foreground">📊 Avance</div>
                <div className="text-2xl font-bold text-foreground">{pct}%</div>
                <div className="text-[11px] text-muted-foreground">{completedTasks}/{totalTasks} tareas</div>
              </div>
              <div className="rounded-lg border bg-card p-4 space-y-1 hover:shadow-md transition-shadow">
                <div className="text-[13px] font-medium text-foreground">🔗 Entidades</div>
                <div className="text-2xl font-bold text-foreground">{linkedEntities.length + budgets.length}</div>
                <div className="text-[11px] text-muted-foreground">vinculadas</div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Linked entities grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Entidades vinculadas</h3>
          <Button variant="outline" size="sm" onClick={onLinkEntityClick}>
            <Link className="w-4 h-4 mr-1" />Vincular
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(() => {
            const grouped: Record<string, any[]> = {};
            linkedEntities.forEach((le: any) => {
              if (!grouped[le.entity_type]) grouped[le.entity_type] = [];
              grouped[le.entity_type].push(le);
            });
            return Object.entries(grouped).map(([type, entities]) => {
              const cfg = typeConfig[type] || { emoji: '📎', label: type };
              return (
                <div key={type} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">{cfg.emoji} {cfg.label}</span>
                    <Badge variant="secondary" className="text-xs">{entities.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {entities.slice(0, 4).map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-foreground">{e.entity_name}</p>
                          {e.entity_date && <p className="text-xs text-muted-foreground">{new Date(e.entity_date).toLocaleDateString('es-ES')}</p>}
                        </div>
                        {e.entity_status && <Badge variant="outline" className="text-xs h-5">{e.entity_status}</Badge>}
                      </div>
                    ))}
                    {entities.length > 4 && <p className="text-xs text-muted-foreground pt-1">+{entities.length - 4} más</p>}
                  </div>
                </div>
              );
            });
          })()}

          {/* Documentos */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">📎 Documentos</span>
              <Badge variant="secondary" className="text-xs">{documents.length}</Badge>
            </div>
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No hay documentos adjuntos</p>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 4).map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
                    <Badge variant="outline" className="text-xs h-5 ml-2">{d.category}</Badge>
                  </div>
                ))}
                {documents.length > 4 && <p className="text-xs text-muted-foreground pt-1">+{documents.length - 4} más</p>}
              </div>
            )}
          </div>

          {/* Contratos */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">📝 Contratos</span>
              <Badge variant="secondary" className="text-xs">{contracts.length}</Badge>
            </div>
            {contracts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No hay contratos vinculados</p>
            ) : (
              <div className="space-y-2">
                {contracts.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.title || c.file_name}</p>
                    <Badge variant="outline" className="text-xs h-5 ml-2 capitalize">{c.status}</Badge>
                  </div>
                ))}
                {contracts.length > 4 && <p className="text-xs text-muted-foreground pt-1">+{contracts.length - 4} más</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
