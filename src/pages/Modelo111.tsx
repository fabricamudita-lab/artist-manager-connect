import { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Download, CheckCircle, Plus, Lock, FileText } from 'lucide-react';
import { exportToCSV } from '@/utils/exportUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Retention {
  id: string;
  provider_name: string;
  provider_nif: string | null;
  concepto: string;
  base_imponible: number;
  irpf_percentage: number;
  importe_retenido: number;
  fecha_pago: string | null;
  trimestre: string;
  ejercicio: number;
  is_manual: boolean;
  budget_id: string | null;
  created_at: string;
}

interface QuarterStatus {
  id?: string;
  trimestre: string;
  ejercicio: number;
  presentado: boolean;
  fecha_presentacion: string | null;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_LABELS: Record<string, string> = {
  Q1: 'Ene – Mar',
  Q2: 'Abr – Jun',
  Q3: 'Jul – Sep',
  Q4: 'Oct – Dic',
};

export default function Modelo111() {
  usePageTitle('Modelo 111');
  const { user } = useAuth();
  const [retentions, setRetentions] = useState<Retention[]>([]);
  const [quarterStatuses, setQuarterStatuses] = useState<QuarterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [openQuarters, setOpenQuarters] = useState<Set<string>>(new Set(['Q1', 'Q2', 'Q3', 'Q4']));
  const [addManualOpen, setAddManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    provider_name: '',
    provider_nif: '',
    concepto: '',
    base_imponible: '',
    irpf_percentage: '15',
    fecha_pago: '',
    trimestre: 'Q1',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchWorkspaceAndData();
  }, [user, currentYear]);

  const fetchWorkspaceAndData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .single();

      if (!profile?.workspace_id) {
        setLoading(false);
        return;
      }
      setWorkspaceId(profile.workspace_id);

      const [retRes, statusRes] = await Promise.all([
        supabase
          .from('irpf_retentions')
          .select('*')
          .eq('workspace_id', profile.workspace_id)
          .eq('ejercicio', currentYear)
          .order('fecha_pago', { ascending: true }),
        supabase
          .from('irpf_quarter_status')
          .select('*')
          .eq('workspace_id', profile.workspace_id)
          .eq('ejercicio', currentYear),
      ]);

      setRetentions((retRes.data as any[]) || []);
      setQuarterStatuses((statusRes.data as any[]) || []);
    } catch (e) {
      console.error('Error loading modelo 111:', e);
    } finally {
      setLoading(false);
    }
  };

  const retentionsByQuarter = useMemo(() => {
    const grouped: Record<string, Retention[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    retentions.forEach(r => {
      if (grouped[r.trimestre]) grouped[r.trimestre].push(r);
    });
    return grouped;
  }, [retentions]);

  const getQuarterStatus = (q: string): QuarterStatus => {
    return quarterStatuses.find(s => s.trimestre === q) || {
      trimestre: q,
      ejercicio: currentYear,
      presentado: false,
      fecha_presentacion: null,
    };
  };

  const getQuarterTotals = (q: string) => {
    const items = retentionsByQuarter[q] || [];
    return {
      base: items.reduce((s, i) => s + i.base_imponible, 0),
      retenciones: items.reduce((s, i) => s + i.importe_retenido, 0),
      count: items.length,
      perceptores: new Set(items.map(i => i.provider_name)).size,
    };
  };

  const handleMarkPresentado = async (q: string) => {
    if (!workspaceId) return;
    try {
      const { error } = await supabase
        .from('irpf_quarter_status')
        .upsert({
          workspace_id: workspaceId,
          ejercicio: currentYear,
          trimestre: q,
          presentado: true,
          fecha_presentacion: new Date().toISOString(),
          presentado_por: user!.id,
        }, { onConflict: 'workspace_id,ejercicio,trimestre' });

      if (error) throw error;
      toast({ title: 'Trimestre marcado como presentado' });
      fetchWorkspaceAndData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleExportQuarter = (q: string) => {
    const items = retentionsByQuarter[q] || [];
    if (items.length === 0) {
      toast({ title: 'No hay datos para exportar', variant: 'destructive' });
      return;
    }
    const totals = getQuarterTotals(q);
    const exportData = items.map(i => ({
      Proveedor: i.provider_name,
      NIF: i.provider_nif || '',
      Concepto: i.concepto,
      'Base Imponible': i.base_imponible.toFixed(2),
      'IRPF %': i.irpf_percentage,
      'Importe Retenido': i.importe_retenido.toFixed(2),
      'Fecha Pago': i.fecha_pago || '',
    }));
    // Add summary row
    exportData.push({
      Proveedor: `--- RESUMEN ${q} ${currentYear} ---`,
      NIF: `Perceptores: ${totals.perceptores}`,
      Concepto: '',
      'Base Imponible': totals.base.toFixed(2),
      'IRPF %': '' as any,
      'Importe Retenido': totals.retenciones.toFixed(2),
      'Fecha Pago': '',
    });
    exportToCSV(exportData, `modelo_111_${currentYear}_${q}`);
    toast({ title: `Exportado ${q} ${currentYear}` });
  };

  const handleAddManual = async () => {
    if (!workspaceId || !manualForm.provider_name || !manualForm.concepto || !manualForm.base_imponible) {
      toast({ title: 'Completa los campos obligatorios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const base = parseFloat(manualForm.base_imponible);
      const irpfPct = parseFloat(manualForm.irpf_percentage);
      const importe = base * (irpfPct / 100);

      const { error } = await supabase.from('irpf_retentions').insert({
        workspace_id: workspaceId,
        provider_name: manualForm.provider_name,
        provider_nif: manualForm.provider_nif || null,
        concepto: manualForm.concepto,
        base_imponible: base,
        irpf_percentage: irpfPct,
        importe_retenido: importe,
        fecha_pago: manualForm.fecha_pago || null,
        trimestre: manualForm.trimestre,
        ejercicio: currentYear,
        is_manual: true,
        created_by: user!.id,
      } as any);

      if (error) throw error;
      toast({ title: 'Retención añadida' });
      setAddManualOpen(false);
      setManualForm({ provider_name: '', provider_nif: '', concepto: '', base_imponible: '', irpf_percentage: '15', fecha_pago: '', trimestre: 'Q1' });
      fetchWorkspaceAndData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleQuarter = (q: string) => {
    const next = new Set(openQuarters);
    if (next.has(q)) next.delete(q); else next.add(q);
    setOpenQuarters(next);
  };

  const fmt = (n: number) => `€${n.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modelo 111</h1>
          <p className="text-muted-foreground text-sm">Retenciones IRPF — Ejercicio {currentYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(currentYear)} onValueChange={v => setCurrentYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setAddManualOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Añadir manual
          </Button>
        </div>
      </div>

      {/* Quarter summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUARTERS.map(q => {
          const totals = getQuarterTotals(q);
          const status = getQuarterStatus(q);
          return (
            <Card key={q} className={cn(status.presentado && 'border-primary/30 bg-primary/5')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{q} · {QUARTER_LABELS[q]}</CardTitle>
                  {status.presentado ? (
                    <Badge variant="default" className="bg-primary text-primary-foreground text-[10px]">
                      <Lock className="h-3 w-3 mr-1" />
                      Presentado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Pendiente</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base imponible</span>
                  <span className="font-medium">{fmt(totals.base)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Retenciones</span>
                  <span className="font-bold">{fmt(totals.retenciones)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {totals.perceptores} perceptor(es) · {totals.count} registro(s)
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quarterly tables */}
      {QUARTERS.map(q => {
        const items = retentionsByQuarter[q] || [];
        const status = getQuarterStatus(q);
        const totals = getQuarterTotals(q);

        return (
          <Collapsible key={q} open={openQuarters.has(q)} onOpenChange={() => toggleQuarter(q)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronDown className={cn('h-4 w-4 transition-transform', openQuarters.has(q) && 'rotate-180')} />
                      <CardTitle className="text-base">{q} — {QUARTER_LABELS[q]} {currentYear}</CardTitle>
                      <Badge variant="outline" className="text-xs">{items.length} registros</Badge>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportQuarter(q)}
                        disabled={items.length === 0}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Exportar
                      </Button>
                      {!status.presentado && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkPresentado(q)}
                          disabled={items.length === 0}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Marcar presentado
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sin retenciones en este trimestre</p>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Proveedor</TableHead>
                              <TableHead>NIF</TableHead>
                              <TableHead>Concepto</TableHead>
                              <TableHead className="text-right">Base imponible</TableHead>
                              <TableHead className="text-right">IRPF %</TableHead>
                              <TableHead className="text-right">Retención</TableHead>
                              <TableHead>Fecha pago</TableHead>
                              <TableHead>Origen</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map(r => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{r.provider_name}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{r.provider_nif || '—'}</TableCell>
                                <TableCell>{r.concepto}</TableCell>
                                <TableCell className="text-right">{fmt(r.base_imponible)}</TableCell>
                                <TableCell className="text-right">{r.irpf_percentage}%</TableCell>
                                <TableCell className="text-right font-medium">{fmt(r.importe_retenido)}</TableCell>
                                <TableCell className="text-sm">{r.fecha_pago || '—'}</TableCell>
                                <TableCell>
                                  <Badge variant={r.is_manual ? 'outline' : 'secondary'} className="text-[10px]">
                                    {r.is_manual ? 'Manual' : 'Auto'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Quarter totals */}
                      <div className="flex justify-end gap-6 mt-3 text-sm">
                        <span className="text-muted-foreground">Total base: <strong>{fmt(totals.base)}</strong></span>
                        <span className="text-muted-foreground">Total retenciones: <strong>{fmt(totals.retenciones)}</strong></span>
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Add Manual Dialog */}
      <Dialog open={addManualOpen} onOpenChange={setAddManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir retención manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Proveedor *</Label>
              <Input value={manualForm.provider_name} onChange={e => setManualForm(f => ({ ...f, provider_name: e.target.value }))} placeholder="Nombre del proveedor" />
            </div>
            <div>
              <Label>NIF</Label>
              <Input value={manualForm.provider_nif} onChange={e => setManualForm(f => ({ ...f, provider_nif: e.target.value }))} placeholder="NIF / CIF" />
            </div>
            <div>
              <Label>Concepto *</Label>
              <Input value={manualForm.concepto} onChange={e => setManualForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Descripción del servicio" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base imponible (€) *</Label>
                <Input type="number" step="0.01" value={manualForm.base_imponible} onChange={e => setManualForm(f => ({ ...f, base_imponible: e.target.value }))} />
              </div>
              <div>
                <Label>IRPF %</Label>
                <Input type="number" step="0.5" value={manualForm.irpf_percentage} onChange={e => setManualForm(f => ({ ...f, irpf_percentage: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de pago</Label>
                <Input type="date" value={manualForm.fecha_pago} onChange={e => setManualForm(f => ({ ...f, fecha_pago: e.target.value }))} />
              </div>
              <div>
                <Label>Trimestre</Label>
                <Select value={manualForm.trimestre} onValueChange={v => setManualForm(f => ({ ...f, trimestre: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map(q => <SelectItem key={q} value={q}>{q} — {QUARTER_LABELS[q]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddManualOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddManual} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
