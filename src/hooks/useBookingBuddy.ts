import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BuddyAlert {
  id: string;
  key: string;
  type: 'urgent' | 'warning';
  icon: string;
  message: string;
  bookingId: string;
  actions: { label: string; action: string }[];
}

export interface BuddyAction {
  id: string;
  checkpointId?: string;
  icon: string;
  message: string;
  bookingId: string;
  dueDate?: string;
}

export interface PipelineSummary {
  confirmados: number;
  negociacionActiva: number;
  cobrosVencidos: number;
  ofertasFrias: number;
  ingresosEsperados90d: number;
  ingresosNetos90d: number;
  anticiposPendientes: number;
  liquidacionesPendientes: number;
}

export function useBookingBuddy(offers: any[]) {
  const { user } = useAuth();
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [bookingsWithContracts, setBookingsWithContracts] = useState<Set<string>>(new Set());

  // Fetch checkpoints, dismissals, and contract data
  useEffect(() => {
    const fetchCheckpoints = async () => {
      const { data } = await supabase
        .from('booking_checkpoints')
        .select('*')
        .eq('status', 'pending')
        .order('due_date', { ascending: true });
      setCheckpoints(data || []);
    };

    // Fetch dismissed items
    const fetchDismissals = async () => {
      if (!user?.id) return;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('buddy_dismissals')
        .select('alert_key')
        .eq('user_id', user.id)
        .gte('dismissed_at', twentyFourHoursAgo);
      setDismissedKeys(new Set((data || []).map(d => d.alert_key)));
    };

    // Fetch which bookings have contracts in booking_documents
    const fetchContractStatus = async () => {
      const offerIds = offers.map(o => o.id).filter(Boolean);
      if (offerIds.length === 0) {
        setBookingsWithContracts(new Set());
        return;
      }
      const { data } = await supabase
        .from('booking_documents')
        .select('booking_id')
        .in('booking_id', offerIds);
      
      const ids = new Set((data || []).map(d => d.booking_id));
      setBookingsWithContracts(ids);
    };

    fetchCheckpoints();
    fetchDismissals();
    fetchContractStatus();
  }, [user?.id, offers]);

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Helper
  const daysDiff = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.floor((d.getTime() - now.getTime()) / 86400000);
  };

  const daysSince = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.floor((now.getTime() - d.getTime()) / 86400000);
  };

  const getName = (o: any) => o.festival_ciclo || o.venue || o.ciudad || 'Evento';

  // SECTION A: Urgent alerts
  const urgentAlerts = useMemo((): BuddyAlert[] => {
    const alerts: BuddyAlert[] = [];

    for (const o of offers) {
      const name = getName(o);

      // Realizado with pending cobro > 7 days
      if (o.phase === 'realizado' && o.fecha && o.cobro_estado !== 'cobrado_completo') {
        const days = daysSince(o.fecha);
        if (days > 7) {
          const key = `cobro_vencido_${o.id}`;
          if (!dismissedKeys.has(key)) {
            alerts.push({
              id: key, key, type: days > 30 ? 'urgent' : 'warning',
              icon: '💰',
              message: `${name} lleva ${days} días sin cobrar`,
              bookingId: o.id,
              actions: [
                { label: 'Registrar cobro', action: 'cobro' },
                { label: 'Ver evento', action: 'navigate' },
              ],
            });
          }
        }
      }

      // Confirmado without contract > 5 days
      if (o.phase === 'confirmado') {
        const daysSinceConfirm = daysSince(o.updated_at || o.created_at);
        // Check booking_documents table first (primary), fallback to adjuntos
        const hasContractInDb = bookingsWithContracts.has(o.id);
        const hasContractInAdjuntos = o.adjuntos && (
          (typeof o.adjuntos === 'string' && o.adjuntos.length > 2) ||
          (Array.isArray(o.adjuntos) && o.adjuntos.length > 0) ||
          (typeof o.adjuntos === 'object' && Object.keys(o.adjuntos).length > 0)
        );
        const hasContract = hasContractInDb || hasContractInAdjuntos;
        if (daysSinceConfirm > 5 && !hasContract) {
          const key = `contrato_pendiente_${o.id}`;
          if (!dismissedKeys.has(key)) {
            alerts.push({
              id: key, key, type: 'warning',
              icon: '📄',
              message: `${name} confirmado hace ${daysSinceConfirm} días sin contrato subido`,
              bookingId: o.id,
              actions: [
                { label: 'Subir contrato', action: 'navigate' },
                { label: 'Ver evento', action: 'navigate' },
              ],
            });
          }
        }

        // Confirmed event in next 7 days without full viability
        if (o.fecha) {
          const daysUntil = daysDiff(o.fecha);
          if (daysUntil >= 0 && daysUntil <= 7) {
            const fullViability = o.viability_manager_approved && o.viability_tour_manager_approved && o.viability_production_approved;
            if (!fullViability) {
              const key = `viabilidad_${o.id}`;
              if (!dismissedKeys.has(key)) {
                alerts.push({
                  id: key, key, type: 'urgent',
                  icon: '⚠',
                  message: `${name} en ${daysUntil} días — confirma disponibilidad del equipo`,
                  bookingId: o.id,
                  actions: [
                    { label: 'Ver checklist', action: 'navigate' },
                  ],
                });
              }
            }
          }
        }
      }

      // Oferta without activity > 21 days
      if (o.phase === 'oferta') {
        const days = daysSince(o.updated_at || o.created_at);
        if (days > 21) {
          const key = `oferta_fria_${o.id}`;
          if (!dismissedKeys.has(key)) {
            alerts.push({
              id: key, key, type: 'warning',
              icon: '❄️',
              message: `${name} sin actividad desde hace ${days} días`,
              bookingId: o.id,
              actions: [{ label: 'Ver evento', action: 'navigate' }],
            });
          }
        }
      }

      // Negociación without activity > 14 days
      if (o.phase === 'negociacion') {
        const days = daysSince(o.updated_at || o.created_at);
        if (days > 14) {
          const key = `negociacion_estancada_${o.id}`;
          if (!dismissedKeys.has(key)) {
            alerts.push({
              id: key, key, type: 'warning',
              icon: '🔄',
              message: `${name} en negociación estancada (${days} días)`,
              bookingId: o.id,
              actions: [{ label: 'Ver evento', action: 'navigate' }],
            });
          }
        }
      }
    }

    // Sort urgent first
    return alerts.sort((a, b) => (a.type === 'urgent' ? -1 : 1) - (b.type === 'urgent' ? -1 : 1));
  }, [offers, dismissedKeys, bookingsWithContracts]);

  // SECTION B: Upcoming actions (from checkpoints + computed)
  const upcomingActions = useMemo((): BuddyAction[] => {
    const actions: BuddyAction[] = [];

    for (const cp of checkpoints) {
      if (!cp.due_date) continue;
      const days = daysDiff(cp.due_date);
      if (days >= -7 && days <= 30) {
        const offer = offers.find(o => o.id === cp.booking_offer_id);
        const name = offer ? getName(offer) : 'Evento';
        const dateStr = new Date(cp.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

        actions.push({
          id: cp.id,
          checkpointId: cp.id,
          icon: days < 0 ? '🔴' : days <= 7 ? '📋' : '📅',
          message: `${name} (${dateStr}) — ${cp.label}`,
          bookingId: cp.booking_offer_id,
          dueDate: cp.due_date,
        });
      }
    }

    // Quarter ending check
    const currentMonth = now.getMonth();
    const quarterEnd = new Date(now.getFullYear(), Math.ceil((currentMonth + 1) / 3) * 3, 0);
    const daysToQuarter = daysDiff(quarterEnd.toISOString());
    if (daysToQuarter > 0 && daysToQuarter <= 15) {
      const q = Math.ceil((currentMonth + 1) / 3);
      actions.push({
        id: `fiscal_q${q}`,
        icon: '📊',
        message: `Fin de trimestre en ${daysToQuarter} días — revisar retenciones IRPF T${q}`,
        bookingId: '',
        dueDate: quarterEnd.toISOString().split('T')[0],
      });
    }

    return actions.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  }, [checkpoints, offers]);

  // SECTION C: Pipeline summary
  const pipelineSummary = useMemo((): PipelineSummary => {
    const in90days = new Date(Date.now() + 90 * 86400000);
    const confirmados = offers.filter(o => o.phase === 'confirmado').length;
    const negociacionActiva = offers.filter(o => o.phase === 'negociacion').length;
    const cobrosVencidos = offers.filter(o =>
      o.phase === 'realizado' && o.fecha && daysSince(o.fecha) > 7 && o.cobro_estado !== 'cobrado_completo'
    ).length;
    const ofertasFrias = offers.filter(o =>
      o.phase === 'oferta' && daysSince(o.updated_at || o.created_at) > 21
    ).length;

    const upcoming = offers.filter(o =>
      (o.phase === 'confirmado' || o.phase === 'realizado') &&
      o.fecha && new Date(o.fecha) <= in90days
    );
    const ingresosEsperados90d = upcoming.reduce((s, o) => s + (o.fee || 0), 0);
    const ingresosNetos90d = Math.round(ingresosEsperados90d * 0.85); // approximate

    const anticiposPendientes = offers
      .filter(o => o.anticipo_estado === 'pendiente' && o.anticipo_importe)
      .reduce((s, o) => s + (o.anticipo_importe || 0), 0);
    const liquidacionesPendientes = offers
      .filter(o => o.liquidacion_estado === 'pendiente' && o.liquidacion_importe)
      .reduce((s, o) => s + (o.liquidacion_importe || 0), 0);

    return {
      confirmados, negociacionActiva, cobrosVencidos, ofertasFrias,
      ingresosEsperados90d, ingresosNetos90d, anticiposPendientes, liquidacionesPendientes,
    };
  }, [offers]);

  // Alert banner data
  const alertBanners = useMemo(() => {
    const banners: { type: 'error' | 'warning'; message: string; action: string; count: number; total?: number }[] = [];

    const cobrosVencidos = offers.filter(o =>
      o.phase === 'realizado' && o.fecha && daysSince(o.fecha) > 7 && o.cobro_estado !== 'cobrado_completo'
    );
    if (cobrosVencidos.length > 0) {
      const total = cobrosVencidos.reduce((s, o) => s + (o.fee || 0), 0);
      banners.push({
        type: 'error',
        message: `${cobrosVencidos.length} cobro${cobrosVencidos.length > 1 ? 's' : ''} vencido${cobrosVencidos.length > 1 ? 's' : ''} por €${total.toLocaleString('es-ES')}`,
        action: 'cobros',
        count: cobrosVencidos.length,
        total,
      });
    }

    const sinViabilidad = offers.filter(o => {
      if (o.phase !== 'confirmado' || !o.fecha) return false;
      const d = daysDiff(o.fecha);
      if (d < 0 || d > 7) return false;
      return !(o.viability_manager_approved && o.viability_tour_manager_approved && o.viability_production_approved);
    });
    if (sinViabilidad.length > 0) {
      banners.push({
        type: 'warning',
        message: `${sinViabilidad.length} evento${sinViabilidad.length > 1 ? 's' : ''} próximo${sinViabilidad.length > 1 ? 's' : ''} sin viabilidad completa`,
        action: 'viabilidad',
        count: sinViabilidad.length,
      });
    }

    const sinContrato = offers.filter(o => {
      if (o.phase !== 'confirmado') return false;
      const days = daysSince(o.updated_at || o.created_at);
      if (days < 5) return false;
      // Check booking_documents table first, then adjuntos
      const hasContractInDb = bookingsWithContracts.has(o.id);
      const hasContractInAdjuntos = o.adjuntos && (
        (Array.isArray(o.adjuntos) && o.adjuntos.length > 0) ||
        (typeof o.adjuntos === 'object' && Object.keys(o.adjuntos).length > 0)
      );
      return !(hasContractInDb || hasContractInAdjuntos);
    });
    if (sinContrato.length > 0) {
      banners.push({
        type: 'warning',
        message: `${sinContrato.length} evento${sinContrato.length > 1 ? 's' : ''} confirmado${sinContrato.length > 1 ? 's' : ''} sin contrato`,
        action: 'contratos',
        count: sinContrato.length,
      });
    }

    return banners;
  }, [offers, bookingsWithContracts]);

  const dismissAlert = async (key: string) => {
    if (!user?.id) return;
    setDismissedKeys(prev => new Set([...prev, key]));
    await supabase.from('buddy_dismissals').insert({
      user_id: user.id,
      alert_key: key,
    });
  };

  const markCheckpointDone = async (checkpointId: string) => {
    await supabase
      .from('booking_checkpoints')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', checkpointId);
    setCheckpoints(prev => prev.filter(c => c.id !== checkpointId));
  };

  return {
    urgentAlerts,
    upcomingActions,
    pipelineSummary,
    alertBanners,
    dismissAlert,
    markCheckpointDone,
  };
}
