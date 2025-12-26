import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface QuickExpense {
  id: string;
  uploader_id: string;
  artist_id: string | null;
  booking_id: string | null;
  budget_id: string | null;
  budget_item_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  amount: number | null;
  description: string | null;
  expense_date: string;
  auto_linked: boolean;
  auto_link_confidence: number | null;
  status: 'unreconciled' | 'reviewed' | 'approved' | 'rejected' | 'linked';
  reviewed_by: string | null;
  reviewed_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateQuickExpenseParams {
  file_url: string;
  file_name: string;
  file_type?: string;
  amount?: number;
  description?: string;
  expense_date?: string;
  artist_id?: string;
  booking_id?: string;
}

export function useQuickExpenses(filters?: {
  artistId?: string;
  bookingId?: string;
  status?: string;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['quick-expenses', filters],
    queryFn: async () => {
      let query = supabase
        .from('quick_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.artistId) {
        query = query.eq('artist_id', filters.artistId);
      }
      if (filters?.bookingId) {
        query = query.eq('booking_id', filters.bookingId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QuickExpense[];
    },
  });

  const createExpense = useMutation({
    mutationFn: async (params: CreateQuickExpenseParams) => {
      const { data, error } = await supabase
        .from('quick_expenses')
        .insert({
          ...params,
          uploader_id: profile?.user_id,
          expense_date: params.expense_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-expenses'] });
      if (data.auto_linked) {
        toast.success(`Gasto auto-vinculado (${Math.round((data.auto_link_confidence || 0) * 100)}% confianza)`);
      } else {
        toast.success('Gasto subido - pendiente de revisar');
      }
    },
    onError: (error) => {
      toast.error('Error al subir gasto');
      console.error(error);
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuickExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from('quick_expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-expenses'] });
      toast.success('Gasto actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar gasto');
      console.error(error);
    },
  });

  const approveExpense = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('quick_expenses')
        .update({
          status: 'approved',
          reviewed_by: profile?.user_id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-expenses'] });
      toast.success('Gasto aprobado');
    },
  });

  const rejectExpense = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('quick_expenses')
        .update({
          status: 'rejected',
          reviewed_by: profile?.user_id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-expenses'] });
      toast.success('Gasto rechazado');
    },
  });

  const linkToBudgetItem = useMutation({
    mutationFn: async ({ expenseId, budgetItemId }: { expenseId: string; budgetItemId: string }) => {
      const { data, error } = await supabase
        .from('quick_expenses')
        .update({
          budget_item_id: budgetItemId,
          status: 'linked',
          reviewed_by: profile?.user_id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-expenses'] });
      toast.success('Gasto vinculado a partida');
    },
  });

  // Stats
  const unreconciledCount = expenses.filter(e => e.status === 'unreconciled').length;
  const autoLinkedCount = expenses.filter(e => e.auto_linked).length;
  const totalPendingAmount = expenses
    .filter(e => e.status === 'unreconciled')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    expenses,
    isLoading,
    error,
    unreconciledCount,
    autoLinkedCount,
    totalPendingAmount,
    createExpense,
    updateExpense,
    approveExpense,
    rejectExpense,
    linkToBudgetItem,
  };
}
