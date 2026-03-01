import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CheckCircle, DollarSign, Clock, AlertTriangle, CalendarClock } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';

const fmt = (v: number) =>
  `€${Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SOURCE_TYPES = [
  { value: 'booking', label: 'Booking', icon: '🎤' },
  { value: 'royalty', label: 'Royalties', icon: '🎵' },
  { value: 'sync', label: 'Sincronización', icon: '🎬' },
  { value: 'subvencion', label: 'Subvención', icon: '🏛' },
  { value: 'beca', label: 'Beca', icon: '🎓' },
  { value: 'otro', label: 'Otro', icon: '○' },
] as const;

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  cobrado: { label: 'Cobrado', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  parcial: { label: 'Parcial', variant: 'outline' },
};

interface CobroRow {
  id: string;
  type: string;
  concept: string;
  amount_gross: number;
  irpf_pct: number;
  amount_net: number;
  expected_date: string | null;
  received_date: string | null;
  status: string;
  notes: string | null;
  artist_id: string | null;
  project_id: string | null;
  booking_id: string | null;
  artists?: { name: string; stage_name?: string | null } | null;
  projects?: { name: string } | null;
}

interface CobrosTabProps {
  artistId: string;
}

export function CobrosTab({ artistId }: CobrosTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sourceFilter, setSourceFilter] = useState('todos');
  const [addOpen, setAddOpen] = useState(false);
  const [markCobroId, setMarkCobroId] = useState<string | null>(null);
  const [markDate, setMarkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markAmount, setMarkAmount] = useState('');
  const [markNotes, setMarkNotes] = useState('');

  // Form state
  const [formType, setFormType] = useState('otro');
  const [formConcept, setFormConcept] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formGross, setFormGross] = useState('');
  const [formIrpf, setFormIrpf] = useState('15');
  const [formExpectedDate, setFormExpectedDate] = useState('');
  const [formReceivedDate, setFormReceivedDate] = useState('');
  const [formStatus, setFormStatus] = useState('pendiente');
  const [formNotes, setFormNotes] = useState('');

  // Fetch cobros
  const { data: cobros = [], isLoading } = useQuery({
    queryKey: ['cobros', artistId],
    queryFn: async () => {
      let q = supabase
        .from('cobros')
        .select('id, type, concept, amount_gross, irpf_pct, amount_net, expected_date, received_date, status, notes, artist_id, project_id, booking_id, artists(name, stage_name), projects:projects(name)')
        .order('expected_date', { ascending: true, nullsFirst: false });
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CobroRow[];
    },
  });

  // Fetch booking-based income (for merged view)
  const { data: bookingCobros = [] } = useQuery({
    queryKey: ['cobros-bookings', artistId],
    queryFn: async () => {
      let q = supabase
        .from('booking_offers')
        .select('id, fee, estado, estado_facturacion, fecha, festival_ciclo, ciudad, venue, artist_id, project_id, artists!booking_offers_artist_id_fkey(name, stage_name)')
        .not('fee', 'is', null)
        .gt('fee', 0);
      if (artistId !== 'all') q = q.eq('artist_id', artistId);
      const { data } = await q;
      return (data || []).map(b => ({
        id: `booking-${b.id}`,
        type: 'booking' as const,
        concept: b.festival_ciclo || `${b.ciudad || ''} ${b.venue || ''}`.trim() || 'Concierto',
        amount_gross: b.fee || 0,
        irpf_pct: 0,
        amount_net: b.fee || 0,
        expected_date: b.fecha,
        received_date: b.estado_facturacion === 'cobrado' ? b.fecha : null,
        status: b.estado_facturacion === 'cobrado' ? 'cobrado' : b.estado_facturacion === 'parcial' ? 'parcial' : (b.fecha && new Date(b.fecha) < addDays(new Date(), -7) ? 'vencido' : 'pendiente'),
        notes: null,
        artist_id: b.artist_id,
        project_id: b.project_id,
        booking_id: b.id,
        artists: b.artists as any,
        projects: null,
      })) as CobroRow[];
    },
  });

  // Artists for form
  const { data: artists = [] } = useQuery({
    queryKey: ['artists-list'],
    queryFn: async () => {
      const { data } = await supabase.from('artists').select('id, name, stage_name');
      return data || [];
    },
  });

  // Merge and deduplicate (cobros table entries override booking-derived ones if booking_id matches)
  const cobroBookingIds = new Set(cobros.filter(c => c.booking_id).map(c => c.booking_id));
  const mergedCobros = [
    ...cobros,
    ...bookingCobros.filter(bc => !cobroBookingIds.has(bc.booking_id)),
  ];

  // Apply source filter
  const filtered = sourceFilter === 'todos'
    ? mergedCobros
    : mergedCobros.filter(c => c.type === sourceFilter);

  // Sort: vencido first, then pendiente by date, then cobrado desc
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder: Record<string, number> = { vencido: 0, pendiente: 1, parcial: 2, cobrado: 3 };
    const sa = statusOrder[a.status] ?? 2;
    const sb = statusOrder[b.status] ?? 2;
    if (sa !== sb) return sa - sb;
    const da = a.expected_date || '9999';
    const db = b.expected_date || '9999';
    return a.status === 'cobrado' ? db.localeCompare(da) : da.localeCompare(db);
  });

  // Summary calculations
  const totalCobrado = mergedCobros.filter(c => c.status === 'cobrado').reduce((s, c) => s + c.amount_net, 0);
  const totalPendiente = mergedCobros.filter(c => c.status === 'pendiente' || c.status === 'parcial').reduce((s, c) => s + c.amount_net, 0);
  const totalVencido = mergedCobros.filter(c => c.status === 'vencido').reduce((s, c) => s + c.amount_net, 0);
  const in30Days = addDays(new Date(), 30);
  const totalProximo = mergedCobros.filter(c =>
    c.status !== 'cobrado' && c.expected_date && new Date(c.expected_date) <= in30Days && new Date(c.expected_date) >= new Date()
  ).reduce((s, c) => s + c.amount_net, 0);

  // Add cobro mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('cobros').insert({
        type: formType,
        concept: formConcept,
        artist_id: formArtist || null,
        amount_gross: parseFloat(formGross) || 0,
        irpf_pct: parseFloat(formIrpf) || 0,
        expected_date: formExpectedDate || null,
        received_date: formReceivedDate || null,
        status: formStatus,
        notes: formNotes || null,
        created_by: user?.id || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros'] });
      setAddOpen(false);
      resetForm();
      toast.success('Cobro añadido');
    },
    onError: () => toast.error('Error al añadir cobro'),
  });

  // Mark as cobrado mutation
  const markMutation = useMutation({
    mutationFn: async () => {
      if (!markCobroId) return;
      // If it's a booking-derived cobro, create a new cobros entry
      if (markCobroId.startsWith('booking-')) {
        const bookingId = markCobroId.replace('booking-', '');
        const booking = bookingCobros.find(b => b.booking_id === bookingId);
        if (!booking) return;
        // Update booking_offers estado_facturacion
        await supabase.from('booking_offers').update({ estado_facturacion: 'cobrado' }).eq('id', bookingId);
      } else {
        await supabase.from('cobros').update({
          status: 'cobrado',
          received_date: markDate,
          amount_gross: parseFloat(markAmount) || undefined,
          notes: markNotes || undefined,
        }).eq('id', markCobroId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-bookings'] });
      setMarkCobroId(null);
      toast.success('Marcado como cobrado');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const resetForm = () => {
    setFormType('otro');
    setFormConcept('');
    setFormArtist('');
    setFormGross('');
    setFormIrpf('15');
    setFormExpectedDate('');
    setFormReceivedDate('');
    setFormStatus('pendiente');
    setFormNotes('');
  };

  const openMarkCobrado = (cobro: CobroRow) => {
    setMarkCobroId(cobro.id);
    setMarkDate(format(new Date(), 'yyyy-MM-dd'));
    setMarkAmount(String(cobro.amount_gross));
    setMarkNotes('');
  };

  const getSourceIcon = (type: string) => SOURCE_TYPES.find(s => s.value === type)?.icon || '○';

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-moodita border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalCobrado)}</div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de Cobro</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalPendiente)}</div>
          </CardContent>
        </Card>

        <Card className={`card-moodita border-l-4 ${totalVencido > 0 ? 'border-l-destructive' : 'border-l-muted-foreground/30'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalVencido > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVencido > 0 ? 'text-destructive' : ''}`}>{fmt(totalVencido)}</div>
          </CardContent>
        </Card>

        <Card className="card-moodita border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos 30 días</CardTitle>
            <CalendarClock className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalProximo)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Source tabs + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setSourceFilter('todos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sourceFilter === 'todos' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {SOURCE_TYPES.map(s => (
            <button
              key={s.value}
              onClick={() => setSourceFilter(s.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                sourceFilter === s.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Añadir cobro
        </Button>
      </div>

      {/* Cobros list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No hay cobros registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(cobro => {
            const artistName = (cobro.artists as any)?.stage_name || (cobro.artists as any)?.name || '';
            const irpfAmount = cobro.amount_gross * (cobro.irpf_pct / 100);
            const statusCfg = STATUS_CONFIG[cobro.status] || STATUS_CONFIG.pendiente;

            return (
              <div key={cobro.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                <span className="text-lg flex-shrink-0">{getSourceIcon(cobro.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{cobro.concept}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {artistName && <span className="text-xs text-muted-foreground truncate">{artistName}</span>}
                    {cobro.expected_date && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(cobro.expected_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-sm font-bold tabular-nums">{fmt(cobro.amount_net)}</p>
                  {irpfAmount > 0 && (
                    <p className="text-[10px] text-muted-foreground tabular-nums">-{fmt(irpfAmount)} IRPF</p>
                  )}
                </div>
                <Badge variant={statusCfg.variant} className="text-[10px] flex-shrink-0">
                  {statusCfg.label}
                </Badge>
                {cobro.status !== 'cobrado' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs flex-shrink-0"
                    onClick={() => openMarkCobrado(cobro)}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Cobrado
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Cobro Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Añadir Cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="cobrado">Cobrado</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input value={formConcept} onChange={e => setFormConcept(e.target.value)} placeholder="Descripción del cobro" />
            </div>
            <div className="space-y-2">
              <Label>Artista</Label>
              <Select value={formArtist} onValueChange={setFormArtist}>
                <SelectTrigger><SelectValue placeholder="Seleccionar artista" /></SelectTrigger>
                <SelectContent>
                  {artists.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.stage_name || a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importe bruto (€)</Label>
                <Input type="number" value={formGross} onChange={e => setFormGross(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>% IRPF retenido</Label>
                <Input type="number" value={formIrpf} onChange={e => setFormIrpf(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha esperada</Label>
                <Input type="date" value={formExpectedDate} onChange={e => setFormExpectedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha cobro real</Label>
                <Input type="date" value={formReceivedDate} onChange={e => setFormReceivedDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!formConcept || !formGross || addMutation.isPending}>
              {addMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Cobrado Dialog */}
      <Dialog open={!!markCobroId} onOpenChange={open => !open && setMarkCobroId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Marcar como Cobrado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha de recepción</Label>
              <Input type="date" value={markDate} onChange={e => setMarkDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Importe recibido (€)</Label>
              <Input type="number" value={markAmount} onChange={e => setMarkAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={markNotes} onChange={e => setMarkNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkCobroId(null)}>Cancelar</Button>
            <Button onClick={() => markMutation.mutate()} disabled={markMutation.isPending}>
              {markMutation.isPending ? 'Guardando...' : 'Confirmar cobro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
