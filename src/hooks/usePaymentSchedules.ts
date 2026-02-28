import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { undoableDelete } from '@/utils/undoableDelete';

export interface PaymentSchedule {
  id: string;
  booking_id: string | null;
  budget_id: string | null;
  payment_type: 'deposit' | 'balance' | 'full';
  amount: number;
  percentage: number | null;
  due_date: string | null;
  invoice_status: 'pending' | 'sent' | 'received';
  payment_status: 'pending' | 'partial' | 'received' | 'overdue';
  invoice_number: string | null;
  invoice_url: string | null;
  received_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentScheduleParams {
  booking_id?: string;
  budget_id?: string;
  payment_type: 'deposit' | 'balance' | 'full';
  amount: number;
  percentage?: number;
  due_date?: string;
  notes?: string;
}

export function usePaymentSchedules(bookingId?: string, budgetId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ['payment-schedules', bookingId, budgetId],
    queryFn: async () => {
      let query = supabase
        .from('payment_schedules')
        .select('*')
        .order('due_date', { ascending: true });

      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }
      if (budgetId) {
        query = query.eq('budget_id', budgetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentSchedule[];
    },
    enabled: !!(bookingId || budgetId),
  });

  const createSchedule = useMutation({
    mutationFn: async (params: CreatePaymentScheduleParams) => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .insert({
          ...params,
          created_by: profile?.user_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      toast.success('Pago programado creado');
    },
    onError: (error) => {
      toast.error('Error al crear pago programado');
      console.error(error);
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      toast.success('Pago actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar pago');
      console.error(error);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      await undoableDelete({
        table: 'payment_schedules',
        id,
        successMessage: 'Pago eliminado',
        onComplete: () => {
          queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
        },
      });
    },
  });

  const createDefaultSchedule = useMutation({
    mutationFn: async ({ bookingId, fee, eventDate }: { bookingId: string; fee: number; eventDate: string }) => {
      const { error } = await supabase.rpc('create_default_payment_schedule', {
        p_booking_id: bookingId,
        p_fee: fee,
        p_event_date: eventDate,
        p_created_by: profile?.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      toast.success('Calendario de pagos creado');
    },
    onError: (error) => {
      toast.error('Error al crear calendario de pagos');
      console.error(error);
    },
  });

  // Calculate totals
  const totals = {
    totalAmount: schedules.reduce((sum, s) => sum + (s.amount || 0), 0),
    received: schedules
      .filter(s => s.payment_status === 'received')
      .reduce((sum, s) => sum + (s.amount || 0), 0),
    pending: schedules
      .filter(s => s.payment_status !== 'received')
      .reduce((sum, s) => sum + (s.amount || 0), 0),
  };

  return {
    schedules,
    isLoading,
    error,
    totals,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    createDefaultSchedule,
  };
}
