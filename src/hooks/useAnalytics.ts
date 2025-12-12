import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface MonthlyStats {
  month: string;
  events: number;
  earnings: number;
  bookings: number;
  solicitudes: number;
}

export interface PlatformStats {
  platform: string;
  amount: number;
  streams: number;
}

export interface AnalyticsSummary {
  totalEarnings: number;
  totalEvents: number;
  totalBookings: number;
  totalContacts: number;
  pendingSolicitudes: number;
  approvedSolicitudes: number;
  monthlyTrend: MonthlyStats[];
  platformBreakdown: PlatformStats[];
}

export function useAnalytics(months: number = 6) {
  return useQuery({
    queryKey: ['analytics', months],
    queryFn: async (): Promise<AnalyticsSummary> => {
      const now = new Date();
      const startDate = startOfMonth(subMonths(now, months - 1));
      
      // Fetch all data in parallel
      const [
        eventsResult,
        earningsResult,
        bookingsResult,
        contactsResult,
        solicitudesResult,
      ] = await Promise.all([
        supabase
          .from('events')
          .select('id, start_date')
          .gte('start_date', startDate.toISOString()),
        supabase
          .from('platform_earnings')
          .select('platform, amount, streams, period_end')
          .gte('period_end', startDate.toISOString()),
        supabase
          .from('booking_offers')
          .select('id, fecha, estado, created_at'),
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('solicitudes')
          .select('id, estado, fecha_creacion')
          .gte('fecha_creacion', startDate.toISOString()),
      ]);

      const events = eventsResult.data || [];
      const earnings = earningsResult.data || [];
      const bookings = bookingsResult.data || [];
      const solicitudes = solicitudesResult.data || [];

      // Calculate totals
      const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalEvents = events.length;
      const totalBookings = bookings.length;
      const totalContacts = contactsResult.count || 0;
      const pendingSolicitudes = solicitudes.filter(s => s.estado === 'pendiente').length;
      const approvedSolicitudes = solicitudes.filter(s => s.estado === 'aprobada').length;

      // Calculate monthly trends
      const monthlyTrend: MonthlyStats[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthKey = format(monthStart, 'MMM yyyy');

        const monthEvents = events.filter(e => {
          const date = new Date(e.start_date);
          return date >= monthStart && date <= monthEnd;
        }).length;

        const monthEarnings = earnings
          .filter(e => {
            const date = new Date(e.period_end);
            return date >= monthStart && date <= monthEnd;
          })
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const monthBookings = bookings.filter(b => {
          const date = new Date(b.created_at);
          return date >= monthStart && date <= monthEnd;
        }).length;

        const monthSolicitudes = solicitudes.filter(s => {
          const date = new Date(s.fecha_creacion);
          return date >= monthStart && date <= monthEnd;
        }).length;

        monthlyTrend.push({
          month: monthKey,
          events: monthEvents,
          earnings: monthEarnings,
          bookings: monthBookings,
          solicitudes: monthSolicitudes,
        });
      }

      // Calculate platform breakdown
      const platformMap = new Map<string, { amount: number; streams: number }>();
      earnings.forEach(e => {
        const current = platformMap.get(e.platform) || { amount: 0, streams: 0 };
        platformMap.set(e.platform, {
          amount: current.amount + Number(e.amount),
          streams: current.streams + (e.streams || 0),
        });
      });

      const platformBreakdown: PlatformStats[] = Array.from(platformMap.entries())
        .map(([platform, stats]) => ({
          platform,
          amount: stats.amount,
          streams: stats.streams,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        totalEarnings,
        totalEvents,
        totalBookings,
        totalContacts,
        pendingSolicitudes,
        approvedSolicitudes,
        monthlyTrend,
        platformBreakdown,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: async () => {
      const [eventsResult, solicitudesResult, epksResult] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, start_date, event_type')
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('solicitudes')
          .select('id, nombre_solicitante, tipo, estado, fecha_creacion')
          .order('fecha_creacion', { ascending: false })
          .limit(limit),
        supabase
          .from('epks')
          .select('id, titulo, creado_en, vistas_totales')
          .order('creado_en', { ascending: false })
          .limit(limit),
      ]);

      type ActivityItem = {
        id: string;
        type: 'event' | 'solicitud' | 'epk';
        title: string;
        subtitle: string;
        date: string;
        status?: string;
      };

      const activities: ActivityItem[] = [];

      (eventsResult.data || []).forEach(e => {
        activities.push({
          id: e.id,
          type: 'event',
          title: e.title,
          subtitle: e.event_type,
          date: e.start_date,
        });
      });

      (solicitudesResult.data || []).forEach(s => {
        activities.push({
          id: s.id,
          type: 'solicitud',
          title: s.nombre_solicitante,
          subtitle: s.tipo,
          date: s.fecha_creacion,
          status: s.estado,
        });
      });

      (epksResult.data || []).forEach(e => {
        activities.push({
          id: e.id,
          type: 'epk',
          title: e.titulo,
          subtitle: `${e.vistas_totales || 0} vistas`,
          date: e.creado_en,
        });
      });

      // Sort by date and limit
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    },
  });
}
