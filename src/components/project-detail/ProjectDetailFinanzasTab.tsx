import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BarChart3, Link } from "lucide-react";

interface ProjectDetailFinanzasTabProps {
  budgets: any[];
  linkedEntities: any[];
  onLinkEntityClick: () => void;
}

export function ProjectDetailFinanzasTab({ budgets, linkedEntities, onLinkEntityClick }: ProjectDetailFinanzasTabProps) {
  const ingresosConfirmados = budgets
    .filter(b => b.budget_status === 'confirmado' || b.show_status === 'confirmado')
    .reduce((sum: number, b: any) => sum + (b.fee || 0), 0);
  const enNegociacion = budgets
    .filter(b => b.budget_status === 'negociacion' || b.budget_status === 'pendiente' || b.show_status === 'negociacion')
    .reduce((sum: number, b: any) => sum + (b.fee || 0), 0);
  const gastosEjecutados = budgets.reduce((sum: number, b: any) => {
    const items = b.budget_items || [];
    return sum + items.reduce((s: number, item: any) => s + ((item.quantity || 0) * (item.unit_price || 0)), 0);
  }, 0);
  const totalAprobado = ingresosConfirmados + enNegociacion;
  const balance = ingresosConfirmados - gastosEjecutados;
  const execPercent = totalAprobado > 0 ? Math.round((gastosEjecutados / totalAprobado) * 100) : 0;

  const entitiesWithValue = linkedEntities.filter((e: any) => e.entity_status);
  const typeConfig: Record<string, { emoji: string; label: string }> = {
    show: { emoji: '🎤', label: 'Show' },
    release: { emoji: '💿', label: 'Release' },
    sync: { emoji: '🎬', label: 'Sincronización' },
    videoclip: { emoji: '🎥', label: 'Videoclip' },
    prensa: { emoji: '📰', label: 'Prensa' },
    merch: { emoji: '👕', label: 'Merch' },
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ingresos confirmados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{ingresosConfirmados.toLocaleString('es-ES')} €</p>
            <p className="text-xs text-muted-foreground mt-1">{budgets.filter(b => b.budget_status === 'confirmado' || b.show_status === 'confirmado').length} presupuestos</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">En negociación</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{enNegociacion.toLocaleString('es-ES')} €</p>
            <p className="text-xs text-muted-foreground mt-1">{budgets.filter(b => b.budget_status === 'negociacion' || b.budget_status === 'pendiente').length} presupuestos</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gastos ejecutados</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{gastosEjecutados.toLocaleString('es-ES')} €</p>
            <p className="text-xs text-muted-foreground mt-1">Total partidas</p>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4", balance >= 0 ? "border-l-green-500" : "border-l-red-500")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Balance proyectado</p>
            <p className={cn("text-2xl font-bold mt-1", balance >= 0 ? "text-green-600" : "text-red-600")}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString('es-ES')} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ingresos − Gastos</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Execution Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Ejecución de presupuesto</h3>
            <span className="text-sm text-muted-foreground">{execPercent}%</span>
          </div>
          <Progress value={execPercent} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ejecutado <strong className="text-foreground">{gastosEjecutados.toLocaleString('es-ES')} €</strong> ({execPercent}%)</span>
            <span>Aprobado <strong className="text-foreground">{totalAprobado.toLocaleString('es-ES')} €</strong></span>
            <span>Total <strong className="text-foreground">{(ingresosConfirmados + enNegociacion).toLocaleString('es-ES')} €</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Entity Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Desglose por entidad vinculada</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entitiesWithValue.length === 0 ? (
            <div className="text-center py-8 px-4">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay entidades vinculadas con valor económico</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onLinkEntityClick}>
                <Link className="w-4 h-4 mr-2" />Vincular entidad
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {entitiesWithValue.map((entity: any) => {
                const cfg = typeConfig[entity.entity_type] || { emoji: '📎', label: entity.entity_type };
                const isConfirmed = entity.entity_status?.toLowerCase().includes('confirmad');
                return (
                  <div key={entity.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cfg.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">{entity.entity_name}</p>
                        <p className="text-xs text-muted-foreground">{cfg.label} · {entity.entity_date || 'Sin fecha'}</p>
                      </div>
                    </div>
                    <Badge variant={isConfirmed ? 'success' : 'warning'} className="text-xs">{entity.entity_status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
