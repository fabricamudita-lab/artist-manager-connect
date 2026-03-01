import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Auto-transitions booking_offers from 'confirmado' to 'realizado'
 * when the event date has passed (fecha < today).
 * Runs once per page load.
 */
export function useAutoRealizado() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    const run = async () => {
      try {
        // Wait for network to be ready (avoid preview startup race)
        await new Promise(r => setTimeout(r, 2000));

        const today = new Date().toISOString().split('T')[0];

        const { data: pastEvents, error: fetchError } = await supabase
          .from('booking_offers')
          .select('id')
          .eq('phase', 'confirmado')
          .lt('fecha', today);

        if (fetchError) throw fetchError;
        if (!pastEvents || pastEvents.length === 0) {
          hasRun.current = true;
          return;
        }

        const ids = pastEvents.map(e => e.id);

        const { error: updateError } = await supabase
          .from('booking_offers')
          .update({ phase: 'realizado' })
          .in('id', ids);

        if (updateError) throw updateError;

        hasRun.current = true;

        toast({
          title: 'Eventos actualizados',
          description: `${ids.length} evento(s) movido(s) a Realizado — el evento ya ha ocurrido`,
        });
      } catch (error) {
        console.error('Auto-realizado error, will retry on next render:', error);
      }
    };

    run();
  }, []);
}
