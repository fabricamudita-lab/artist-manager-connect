import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund';
export type TransactionStatus = 'pending' | 'confirmed' | 'invoiced' | 'paid' | 'cancelled';

export interface Transaction {
  id: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  artist_id: string | null;
  project_id: string | null;
  booking_id: string | null;
  budget_id: string | null;
  budget_item_id: string | null;
  contact_id: string | null;
  amount: number;
  currency: string;
  iva_percentage: number;
  irpf_percentage: number;
  net_amount: number | null;
  description: string;
  category: string | null;
  subcategory: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  invoice_date: string | null;
  payment_date: string | null;
  due_date: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionParams {
  transaction_type: TransactionType;
  amount: number;
  description: string;
  artist_id?: string;
  project_id?: string;
  booking_id?: string;
  budget_id?: string;
  contact_id?: string;
  iva_percentage?: number;
  irpf_percentage?: number;
  category?: string;
  subcategory?: string;
  invoice_number?: string;
  invoice_url?: string;
  invoice_date?: string;
  payment_date?: string;
  due_date?: string;
}

export interface TransactionFilters {
  artist_id?: string;
  project_id?: string;
  booking_id?: string;
  transaction_type?: TransactionType[];
  status?: TransactionStatus[];
  from_date?: string;
  to_date?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.artist_id) {
        query = query.eq('artist_id', filters.artist_id);
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.booking_id) {
        query = query.eq('booking_id', filters.booking_id);
      }
      if (filters.transaction_type && filters.transaction_type.length > 0) {
        query = query.in('transaction_type', filters.transaction_type);
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (params: CreateTransactionParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        transaction_type: params.transaction_type,
        amount: params.amount,
        description: params.description,
        artist_id: params.artist_id,
        project_id: params.project_id,
        booking_id: params.booking_id,
        budget_id: params.budget_id,
        contact_id: params.contact_id,
        iva_percentage: params.iva_percentage,
        irpf_percentage: params.irpf_percentage,
        category: params.category,
        subcategory: params.subcategory,
        invoice_number: params.invoice_number,
        invoice_url: params.invoice_url,
        invoice_date: params.invoice_date,
        payment_date: params.payment_date,
        due_date: params.due_date,
        created_by: user.id,
        status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Éxito',
        description: 'Transacción creada correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, status, amount, description, category, invoice_number, invoice_url, invoice_date, payment_date }: { 
      id: string; 
      status?: TransactionStatus;
      amount?: number;
      description?: string;
      category?: string;
      invoice_number?: string;
      invoice_url?: string;
      invoice_date?: string;
      payment_date?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (status !== undefined) updateData.status = status;
      if (amount !== undefined) updateData.amount = amount;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (invoice_number !== undefined) updateData.invoice_number = invoice_number;
      if (invoice_url !== undefined) updateData.invoice_url = invoice_url;
      if (invoice_date !== undefined) updateData.invoice_date = invoice_date;
      if (payment_date !== undefined) updateData.payment_date = payment_date;

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Éxito',
        description: 'Transacción actualizada',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Éxito',
        description: 'Transacción eliminada',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate totals
  const income = transactions
    .filter(t => t.transaction_type === 'income' && ['confirmed', 'invoiced', 'paid'].includes(t.status))
    .reduce((sum, t) => sum + (t.net_amount || t.amount), 0);
  
  const expenses = transactions
    .filter(t => t.transaction_type === 'expense' && ['confirmed', 'invoiced', 'paid'].includes(t.status))
    .reduce((sum, t) => sum + (t.net_amount || t.amount), 0);
  
  const netProfit = income - expenses;

  return {
    transactions,
    isLoading,
    error,
    refetch,
    createTransaction: createTransactionMutation.mutateAsync,
    updateTransaction: updateTransactionMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
    totals: {
      income,
      expenses,
      netProfit,
      transactionCount: transactions.length,
    },
  };
}

// Hook for P&L view
export function useProfitAndLoss(filters: { artist_id?: string; project_id?: string } = {}) {
  return useQuery({
    queryKey: ['profit-and-loss', filters],
    queryFn: async () => {
      let query = supabase
        .from('profit_and_loss')
        .select('*')
        .order('period', { ascending: false });

      if (filters.artist_id) {
        query = query.eq('artist_id', filters.artist_id);
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
