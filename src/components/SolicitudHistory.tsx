import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('solicitud_history')
          .select(`id, estado, condicion, nota, changed_at, profiles:changed_by_profile_id ( full_name )`)
          .eq('solicitud_id', solicitudId)
          .order('changed_at', { ascending: false });
        if (error) throw error;
        setItems((data as any) || []);
      } catch (e) {
        console.error('Error loading history', e);
      } finally {
        setLoading(false);
      }
    };

    if (solicitudId) fetchHistory();
  }, [solicitudId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
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
