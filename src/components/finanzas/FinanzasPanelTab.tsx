import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, ChevronDown, Receipt, CreditCard, Landmark, DollarSign, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFinanzasPanel, PeriodFilter } from '@/hooks/useFinanzasPanel';

const fmt = (v: number) =>
  `€${Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'month', label: 'Este mes' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year', label: 'Este año' },
];

interface Props {
  artistId: string;
}

export function FinanzasPanelTab({ artistId }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const navigate = useNavigate();
  const data = useFinanzasPanel(artistId, period);

  if (data.loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-24 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {data.totalAlerts > 0 && (
        <Collapsible open={alertsOpen} onOpenChange={setAlertsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                <span>⚠ {data.totalAlerts} alerta{data.totalAlerts !== 1 ? 's' : ''} requieren atención</span>
              </div>
              <div className="flex items-center gap-2 text-destructive text-xs">
                <span>Ver todas</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${alertsOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1.5 pl-2">
              {data.cobrosVencidos > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {data.cobrosVencidos} cobro{data.cobrosVencidos !== 1 ? 's' : ''} vencido{data.cobrosVencidos !== 1 ? 's' : ''} (evento hace +7 días sin cobrar)
                </div>
              )}
              {data.presupuestosExcedidos > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {data.presupuestosExcedidos} presupuesto{data.presupuestosExcedidos !== 1 ? 's' : ''} excedido{data.presupuestosExcedidos !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Period filter */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-moodita border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Brutos</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.ingresosBrutos)}</div>
            <p className="text-xs text-muted-foreground">
              {data.conciertosCobrados} concierto{data.conciertosCobrados !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="card-moodita border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Comprometidos</CardTitle>
            <Wallet className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.gastosComprometidos)}</div>
            <p className="text-xs text-muted-foreground">
              {fmt(data.gastosConfirmados)} confirmado · {fmt(data.gastosProvisionales)} provisional
            </p>
          </CardContent>
        </Card>

        <Card className={`card-moodita border-l-4 ${data.beneficioNeto >= 0 ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto</CardTitle>
            {data.beneficioNeto >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.beneficioNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {data.beneficioNeto < 0 ? '-' : ''}{fmt(data.beneficioNeto)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.beneficioNeto >= 0 ? `Margen ${data.margenPct}%` : 'Pérdida'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="card-moodita border-l-4 border-l-blue-500 cursor-pointer hover:border-primary/30"
          onClick={() => navigate('/finanzas/cobros')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobros Pendientes</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.cobrosPendientes)}</div>
            <p className="text-xs text-muted-foreground">
              {data.eventosSinCobrar} evento{data.eventosSinCobrar !== 1 ? 's' : ''} sin cobrar
            </p>
          </CardContent>
        </Card>

        <Card
          className="card-moodita border-l-4 border-l-orange-500 cursor-pointer hover:border-primary/30"
          onClick={() => navigate('/finanzas/pagos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.pagosPendientes)}</div>
            <p className="text-xs text-muted-foreground">
              {data.facturasPendientes} factura{data.facturasPendientes !== 1 ? 's' : ''} pendiente{data.facturasPendientes !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card
          className="card-moodita border-l-4 border-l-violet-500 cursor-pointer hover:border-primary/30"
          onClick={() => navigate('/finanzas/fiscal')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retenciones IRPF</CardTitle>
            <Landmark className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.irpfTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {data.quarterLabel} · pendiente presentar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Ingresos vs Gastos */}
      {data.chartData.length > 0 && (
        <Card className="card-moodita">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ingresos vs Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [fmt(value), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="card-moodita">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map(event => (
                <div key={event.id} className="flex items-center gap-3 group">
                  <span className="text-base flex-shrink-0">{event.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{event.description}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {event.artistName}
                      {event.date && ` · ${new Date(event.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums flex-shrink-0">
                    {fmt(event.amount)}
                  </span>
                  {event.link && (
                    <button
                      onClick={() => navigate(event.link!)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
