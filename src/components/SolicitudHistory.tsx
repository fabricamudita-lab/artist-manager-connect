import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HistoryEntry {
  id: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  condicion: string | null;
  nota: string | null;
  changed_at: string;
  profiles?: { full_name?: string | null } | null;
}

export function SolicitudHistory({ solicitudId }: { solicitudId: string }) {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('solicitud_history')
          .select(`id, estado, condicion, nota, changed_at, profiles:changed_by_profile_id ( full_name )`)
          .eq('solicitud_id', solicitudId)
          .order('changed_at', { ascending: order === 'asc' });
        if (error) throw error;
        setItems((data as any) || []);
      } catch (e) {
        console.error('Error loading history', e);
      } finally {
        setLoading(false);
      }
    };

    if (solicitudId) fetchHistory();
  }, [solicitudId, order]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historial</CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">{items.length} eventos</div>
            <div className="w-[220px]">
              <Select value={order} onValueChange={(v) => setOrder(v as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Más recientes primero</SelectItem>
                  <SelectItem value="asc">Más antiguos primero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Ocultar' : 'Ver'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!expanded ? (
          <div className="text-sm text-muted-foreground">Historial oculto</div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">Cargando historial…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sin eventos aún.</div>
        ) : (
          <div className="space-y-4">
            {items.map((h, idx) => (
              <div key={h.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {h.estado === 'aprobada'
                      ? 'Aprobada'
                      : h.estado === 'denegada'
                      ? 'Denegada'
                      : 'Pendiente'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.changed_at).toLocaleString()}
                  </div>
                </div>
                {h.profiles?.full_name && (
                  <div className="text-xs text-muted-foreground">por {h.profiles.full_name}</div>
                )}
                {h.condicion && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Condición: </span>
                    <span className="whitespace-pre-wrap">{h.condicion}</span>
                  </div>
                )}
                {h.nota && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Nota: </span>
                    <span className="whitespace-pre-wrap">{h.nota}</span>
                  </div>
                )}
                {idx < items.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
