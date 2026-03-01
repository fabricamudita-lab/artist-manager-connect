import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Client-side fallback: transitions booking_offers from 'confirmado' to 'realizado'
 * when the event date has passed (fecha < today).
 * The primary mechanism is the server-side Edge Function (auto-booking-transitions)
 * scheduled via pg_cron. This hook is a safety net for mid-day edge cases.
 * Runs once per page load.
 */
export function useAutoRealizado() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    const run = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: pastEvents, error: fetchError } = await supabase
          .from('booking_offers')
          .select('id')
          .eq('phase', 'confirmado')
          .lt('fecha', today);

        if (fetchError) throw fetchError;

        hasRun.current = true;

        if (!pastEvents || pastEvents.length === 0) return;

        const ids = pastEvents.map(e => e.id);

        const { error: updateError } = await supabase
          .from('booking_offers')
          .update({ phase: 'realizado' })
          .in('id', ids);

        if (updateError) throw updateError;

        toast({
          title: 'Eventos actualizados',
          description: `${ids.length} evento(s) movido(s) a Realizado`,
        });
      } catch (error) {
        console.error('Auto-realizado fallback error:', error);
        hasRun.current = true; // prevent infinite retry
      }
    };

    run();
  }, []);
}
