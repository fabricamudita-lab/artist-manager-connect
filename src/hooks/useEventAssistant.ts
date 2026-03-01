import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventAlert {
  id: string;
  icon: string;
  message: string;
  subtext?: string;
  severity: 'critical' | 'warning' | 'info';
  actions: { label: string; action: string; href?: string }[];
}

export interface EventAction {
  id: string;
  icon: string;
  message: string;
  dueDate?: string;
  daysUntilDue?: number;
  checkpointId?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  action?: string;
}

export interface FinancialSummary {
  fee: number;
  irpfPorcentaje: number;
  irpfAmount: number;
  feeNeto: number;
  comisionPorcentaje: number;
  comisionAmount: number;
  anticipoImporte: number;
  anticipoEstado: string;
  liquidacionImporte: number;
  liquidacionEstado: string;
}

export interface EventAssistantData {
  phase: string;
  daysUntilEvent: number | null;
  alerts: EventAlert[];
  actions: EventAction[];
  checklist: ChecklistItem[];
  checklistProgress: { done: number; total: number };
  financialSummary: FinancialSummary | null;
  hasContract: boolean;
  hasSignedContract: boolean;
  hasRoadmap: boolean;
  hasTravelExpenses: boolean;
  promotorContact: { name?: string; phone?: string; email?: string } | null;
  loading: boolean;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  markCheckpointDone: (id: string) => Promise<void>;
}

interface BookingData {
  id: string;
  phase?: string;
  fecha?: string;
  fee?: number;
  oferta?: string;
  formato?: string;
  festival_ciclo?: string;
  venue?: string;
  promotor?: string;
  contacto?: string;
  adjuntos?: any;
  comision_porcentaje?: number;
  comision_euros?: number;
  anticipo_importe?: number;
  anticipo_estado?: string;
  anticipo_fecha_esperada?: string;
  anticipo_fecha_cobro?: string;
  liquidacion_importe?: number;
  liquidacion_estado?: string;
  liquidacion_fecha_esperada?: string;
  liquidacion_fecha_cobro?: string;
  cobro_estado?: string;
  viability_manager_approved?: boolean;
  viability_tour_manager_approved?: boolean;
  viability_production_approved?: boolean;
  artist_id?: string;
  artist?: { name: string; stage_name?: string };
  created_at: string;
  updated_at?: string;
}

export function useEventAssistant(booking: BookingData | null): EventAssistantData {
  const [hasContract, setHasContract] = useState(false);
  const [hasSignedContract, setHasSignedContract] = useState(false);
  const [hasRoadmap, setHasRoadmap] = useState(false);
  const [hasTravelExpenses, setHasTravelExpenses] = useState(false);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const phase = booking?.phase || '';
  const now = new Date();
  const eventDate = booking?.fecha ? new Date(booking.fecha) : null;
  const daysUntilEvent = eventDate
    ? Math.floor((eventDate.getTime() - now.getTime()) / 86400000)
    : null;

  // Fetch related data
  useEffect(() => {
    if (!booking?.id) return;
    setLoading(true);

    const fetchAll = async () => {
      const [docsRes, roadmapRes, expensesRes, checkpointsRes] = await Promise.all([
        supabase
          .from('booking_documents')
          .select('id, status, document_type')
          .eq('booking_id', booking.id),
        supabase
          .from('tour_roadmap_bookings' as any)
          .select('id')
          .eq('booking_id', booking.id)
          .limit(1),
        supabase
          .from('booking_expenses')
          .select('id, category')
          .eq('booking_id', booking.id),
        supabase
          .from('booking_checkpoints')
          .select('*')
          .eq('booking_offer_id', booking.id),
      ]);

      const docs = docsRes.data || [];
      setHasContract(docs.length > 0);
      setHasSignedContract(docs.some((d: any) => d.status === 'signed'));

      setHasRoadmap(((roadmapRes.data as any[]) || []).length > 0);

      const expenses = expensesRes.data || [];
      setHasTravelExpenses(expenses.some((e: any) =>
        ['viaje', 'vuelo', 'hotel', 'tren', 'transporte', 'alojamiento'].some(k =>
          (e.category || '').toLowerCase().includes(k)
        )
      ));

      setCheckpoints(checkpointsRes.data || []);
      setLoading(false);
    };

    fetchAll();
  }, [booking?.id]);

  // Notification logging
  useEffect(() => {
    if (!notificationsEnabled || !booking) return;
    // We'll log in the alerts memo when notifications are enabled
  }, [notificationsEnabled]);

  const viabilityCount = [
    booking?.viability_manager_approved,
    booking?.viability_tour_manager_approved,
    booking?.viability_production_approved,
  ].filter(Boolean).length;

  const hasRiderInAdjuntos = useMemo(() => {
    if (!booking?.adjuntos) return false;
    const str = JSON.stringify(booking.adjuntos).toLowerCase();
    return str.includes('rider');
  }, [booking?.adjuntos]);

  const hasHospitalityRider = useMemo(() => {
    if (!booking?.adjuntos) return false;
    const str = JSON.stringify(booking.adjuntos).toLowerCase();
    return str.includes('hospitalidad') || str.includes('hospitality') || str.includes('catering');
  }, [booking?.adjuntos]);

  const hasTravelInAdjuntos = useMemo(() => {
    if (!booking?.adjuntos) return false;
    const str = JSON.stringify(booking.adjuntos).toLowerCase();
    return str.includes('vuelo') || str.includes('hotel') || str.includes('tren') || str.includes('travel');
  }, [booking?.adjuntos]);

  const checkpointDone = useCallback((type: string) => {
    return checkpoints.some(c => c.type === type && c.status === 'done');
  }, [checkpoints]);

  const promotorContact = useMemo(() => {
    if (!booking?.promotor && !booking?.contacto) return null;
    // Try to extract phone/email from contacto field
    const contactStr = booking.contacto || '';
    const emailMatch = contactStr.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = contactStr.match(/[\d\s+()-]{9,}/);
    return {
      name: booking.promotor || undefined,
      email: emailMatch?.[0],
      phone: phoneMatch?.[0]?.trim(),
    };
  }, [booking?.promotor, booking?.contacto]);

  // Build alerts based on phase
  const alerts = useMemo((): EventAlert[] => {
    if (!booking) return [];
    const result: EventAlert[] = [];

    if (phase === 'negociacion') {
      if (!booking.oferta?.trim()) {
        result.push({
          id: 'no_deal_memo',
          icon: '📋',
          message: 'Sin deal memo registrado — documenta los términos acordados antes de proceder',
          severity: 'warning',
          actions: [{ label: 'Editar oferta', action: 'edit' }],
        });
      }
      if (viabilityCount < 3) {
        result.push({
          id: 'viability_incomplete',
          icon: '✋',
          message: `Viabilidad incompleta — ${3 - viabilityCount} aprobaciones pendientes`,
          severity: 'warning',
          actions: [{ label: 'Ir a viabilidad', action: 'scroll_viability' }],
        });
      }
      if (!booking.fee) {
        result.push({
          id: 'no_fee',
          icon: '💶',
          message: 'Fee no definido',
          severity: 'warning',
          actions: [{ label: 'Editar evento', action: 'edit' }],
        });
      }
    }

    if (phase === 'confirmado') {
      if (!hasSignedContract) {
        const daysSinceConfirm = booking.updated_at
          ? Math.floor((now.getTime() - new Date(booking.updated_at).getTime()) / 86400000)
          : 0;
        result.push({
          id: 'contract_unsigned',
          icon: '📄',
          message: `Contrato sin firmar${daysSinceConfirm > 0 ? ` — ${daysSinceConfirm} días desde confirmación` : ''}`,
          severity: daysSinceConfirm > 5 ? 'critical' : 'warning',
          actions: [
            { label: 'Subir contrato', action: 'tab_files' },
            { label: 'Generar contrato', action: 'tab_files' },
          ],
        });
      }

      // Anticipo checks
      if (booking.anticipo_estado === 'pendiente' && booking.anticipo_fecha_esperada) {
        const esperada = new Date(booking.anticipo_fecha_esperada);
        const daysOverdue = Math.floor((now.getTime() - esperada.getTime()) / 86400000);
        const fmt = (v: number) => `€${v.toLocaleString('es-ES')}`;

        if (daysOverdue > 0) {
          result.push({
            id: 'anticipo_overdue',
            icon: '💰',
            message: `Anticipo vencido desde ${esperada.toLocaleDateString('es-ES')} — ${fmt(booking.anticipo_importe || 0)}`,
            severity: 'critical',
            actions: [
              { label: 'Registrar anticipo', action: 'open_pago' },
              ...(promotorContact?.email
                ? [{ label: 'Contactar promotor', action: 'contact_promotor' }]
                : promotorContact?.phone
                  ? [{ label: 'Contactar promotor', action: 'contact_promotor' }]
                  : []),
            ],
          });
        } else if (daysOverdue >= -7) {
          result.push({
            id: 'anticipo_upcoming',
            icon: '💰',
            message: `Anticipo esperado en ${Math.abs(daysOverdue)} días — ${fmt(booking.anticipo_importe || 0)}`,
            severity: 'info',
            actions: [{ label: 'Ver estado de pagos', action: 'scroll_pagos' }],
          });
        }
      }

      // 7-30 days specific
      if (daysUntilEvent !== null && daysUntilEvent <= 30 && daysUntilEvent > 7) {
        if (!hasRoadmap) {
          result.push({
            id: 'no_roadmap',
            icon: '🗺',
            message: 'Hoja de ruta no generada',
            severity: 'warning',
            actions: [{ label: 'Generar hoja de ruta', action: 'tab_roadmap' }],
          });
        }
        if (!hasRiderInAdjuntos && !checkpointDone('solicitar_rider')) {
          result.push({
            id: 'rider_not_confirmed',
            icon: '🎛',
            message: 'Rider técnico sin confirmar con el venue',
            severity: 'warning',
            actions: [{ label: 'Marcar como enviado', action: 'mark_rider_done' }],
          });
        }
        if (!hasTravelExpenses && !hasTravelInAdjuntos) {
          result.push({
            id: 'no_travel',
            icon: '✈️',
            message: 'Viaje sin registrar',
            severity: 'warning',
            actions: [{ label: 'Ir a Travel Expenses', action: 'tab_expenses' }],
          });
        }
      }

      // 0-7 days: additional items handled via checklist rendering
    }

    if (phase === 'realizado') {
      const fmt = (v: number) => `€${v.toLocaleString('es-ES')}`;

      if (booking.liquidacion_estado === 'pendiente') {
        const overdue = booking.liquidacion_fecha_esperada
          ? new Date(booking.liquidacion_fecha_esperada) < now
          : false;

        result.push({
          id: overdue ? 'liquidacion_overdue' : 'liquidacion_pending',
          icon: overdue ? '🔴' : '📩',
          message: overdue
            ? `Liquidación vencida — ${fmt(booking.liquidacion_importe || 0)} sin cobrar`
            : `Emite la factura de liquidación al promotor`,
          subtext: !overdue && booking.fecha
            ? `El evento fue el ${new Date(booking.fecha).toLocaleDateString('es-ES')}. La liquidación es de ${fmt(booking.liquidacion_importe || 0)}`
            : undefined,
          severity: overdue ? 'critical' : 'warning',
          actions: [
            { label: 'Registrar liquidación', action: 'open_pago' },
            ...(overdue && (promotorContact?.email || promotorContact?.phone)
              ? [{ label: 'Contactar promotor', action: 'contact_promotor' }]
              : []),
          ],
        });
      }

      if (booking.anticipo_estado === 'pendiente') {
        result.push({
          id: 'anticipo_never_registered',
          icon: '⚠️',
          message: 'Anticipo nunca registrado — revisa el cobro',
          severity: 'warning',
          actions: [{ label: 'Ver pagos', action: 'scroll_pagos' }],
        });
      }
    }

    // Limit to 3, sorted by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Log notification if enabled
    if (notificationsEnabled && result.length > 0) {
      result.forEach(alert => {
        console.log(JSON.stringify({
          event: booking.festival_ciclo || booking.venue || 'Evento',
          event_id: booking.id,
          alert_type: alert.id,
          severity: alert.severity,
          timestamp: new Date().toISOString(),
          action_url: window.location.href,
        }));
      });
    }

    return result;
  }, [booking, phase, hasSignedContract, hasRoadmap, hasRiderInAdjuntos, hasTravelExpenses, hasTravelInAdjuntos, viabilityCount, daysUntilEvent, promotorContact, checkpointDone, notificationsEnabled]);

  // Build actions based on phase
  const actions = useMemo((): EventAction[] => {
    if (!booking) return [];
    const result: EventAction[] = [];

    if (phase === 'negociacion') {
      result.push(
        { id: 'gen_contract', icon: '📝', message: 'Una vez acordado el fee, genera el contrato' },
        { id: 'confirm_availability', icon: '📅', message: 'Confirma disponibilidad del artista y equipo' },
      );
    }

    if (phase === 'confirmado' && daysUntilEvent !== null && daysUntilEvent > 30) {
      const ed = eventDate!;
      result.push(
        { id: 'send_rider', icon: '🎛', message: 'Enviar rider técnico al promotor', dueDate: new Date(ed.getTime() - 45 * 86400000).toISOString(), daysUntilDue: daysUntilEvent - 45 },
        { id: 'send_hospitality', icon: '🍽', message: 'Enviar rider de hospitalidad', dueDate: new Date(ed.getTime() - 45 * 86400000).toISOString(), daysUntilDue: daysUntilEvent - 45 },
        { id: 'book_travel', icon: '✈️', message: 'Reservar viaje y alojamiento', dueDate: new Date(ed.getTime() - 30 * 86400000).toISOString(), daysUntilDue: daysUntilEvent - 30 },
        { id: 'confirm_crew', icon: '👥', message: 'Confirmar crew técnico', dueDate: new Date(ed.getTime() - 21 * 86400000).toISOString(), daysUntilDue: daysUntilEvent - 21 },
      );
    }

    if (phase === 'realizado') {
      result.push(
        { id: 'sgae', icon: '🎵', message: 'Declara el concierto en SGAE si aplica' },
        { id: 'archive', icon: '📁', message: 'Archiva el contrato y facturas en Drive' },
        { id: 'feedback', icon: '⭐', message: 'Solicita valoración al promotor para futuras colaboraciones' },
      );
    }

    return result;
  }, [booking, phase, daysUntilEvent, eventDate]);

  // Build checklist (only for confirmado 0-30 days)
  const checklist = useMemo((): ChecklistItem[] => {
    if (phase !== 'confirmado' || daysUntilEvent === null || daysUntilEvent > 30) return [];

    const items: ChecklistItem[] = [
      { id: 'contrato', label: 'Contrato firmado', checked: hasSignedContract, action: 'tab_files' },
      { id: 'anticipo', label: 'Anticipo cobrado', checked: booking?.anticipo_estado === 'cobrado', action: 'scroll_pagos' },
      { id: 'rider_tecnico', label: 'Rider técnico enviado', checked: hasRiderInAdjuntos || checkpointDone('solicitar_rider'), action: 'mark_rider_done' },
      { id: 'rider_hospitality', label: 'Rider hospitalidad enviado', checked: hasHospitalityRider || checkpointDone('rider_hospitalidad'), action: 'mark_hospitality_done' },
      { id: 'viaje', label: 'Viaje reservado', checked: hasTravelExpenses || hasTravelInAdjuntos, action: 'tab_expenses' },
      { id: 'hoja_ruta', label: 'Hoja de ruta generada', checked: hasRoadmap, action: 'tab_roadmap' },
      { id: 'crew', label: 'Crew técnico confirmado', checked: booking?.viability_production_approved === true, action: 'scroll_viability' },
      { id: 'acreditaciones', label: 'Acreditaciones enviadas', checked: checkpointDone('acreditaciones'), action: 'mark_acreditaciones_done' },
    ];

    // Extra items for 0-7 days
    if (daysUntilEvent <= 7) {
      items.push(
        { id: 'advance_call', label: 'Avance con producción del venue', checked: checkpointDone('advance_call'), action: 'mark_advance_done' },
        { id: 'guest_list', label: 'Lista de invitados enviada al promotor', checked: checkpointDone('guest_list'), action: 'mark_guestlist_done' },
      );
    }

    return items;
  }, [phase, daysUntilEvent, hasSignedContract, booking?.anticipo_estado, hasRiderInAdjuntos, hasHospitalityRider, hasTravelExpenses, hasTravelInAdjuntos, hasRoadmap, booking?.viability_production_approved, checkpointDone]);

  const checklistProgress = useMemo(() => {
    const done = checklist.filter(i => i.checked).length;
    return { done, total: checklist.length };
  }, [checklist]);

  // Financial summary for realizado/facturado
  const financialSummary = useMemo((): FinancialSummary | null => {
    if (!booking || !['realizado', 'facturado'].includes(phase)) return null;
    const fee = booking.fee || 0;
    const irpfPct = booking.artist_id ? 15 : 0; // Default IRPF for Spanish artists
    const irpfAmount = Math.round(fee * irpfPct / 100);
    const feeNeto = fee - irpfAmount;
    const comPct = booking.comision_porcentaje || 0;
    const comAmount = booking.comision_euros || Math.round(fee * comPct / 100);

    return {
      fee,
      irpfPorcentaje: irpfPct,
      irpfAmount,
      feeNeto,
      comisionPorcentaje: comPct,
      comisionAmount: comAmount,
      anticipoImporte: booking.anticipo_importe || 0,
      anticipoEstado: booking.anticipo_estado || 'pendiente',
      liquidacionImporte: booking.liquidacion_importe || 0,
      liquidacionEstado: booking.liquidacion_estado || 'pendiente',
    };
  }, [booking, phase]);

  const markCheckpointDone = useCallback(async (type: string) => {
    if (!booking?.id) return;

    // Check if checkpoint exists
    const existing = checkpoints.find(c => c.type === type);
    if (existing) {
      await supabase
        .from('booking_checkpoints')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Create and immediately mark done
      await supabase
        .from('booking_checkpoints')
        .insert({
          booking_offer_id: booking.id,
          type,
          label: type.replace(/_/g, ' '),
          status: 'done',
          completed_at: new Date().toISOString(),
        });
    }

    // Refresh checkpoints
    const { data } = await supabase
      .from('booking_checkpoints')
      .select('*')
      .eq('booking_offer_id', booking.id);
    setCheckpoints(data || []);
  }, [booking?.id, checkpoints]);

  return {
    phase,
    daysUntilEvent,
    alerts,
    actions,
    checklist,
    checklistProgress,
    financialSummary,
    hasContract,
    hasSignedContract,
    hasRoadmap,
    hasTravelExpenses,
    promotorContact,
    loading,
    notificationsEnabled,
    setNotificationsEnabled,
    markCheckpointDone,
  };
}
