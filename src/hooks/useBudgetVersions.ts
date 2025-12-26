import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BudgetVersion {
  id: string;
  budget_id: string;
  version_type: 'estimated' | 'locked' | 'actual' | 'final';
  version_name: string;
  version_number: number;
  snapshot_data: Record<string, any>;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  locked_at: string | null;
  locked_by: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateVersionParams {
  budget_id: string;
  version_type: 'estimated' | 'locked' | 'actual' | 'final';
  version_name: string;
  notes?: string;
}

export function useBudgetVersions(budgetId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading, error } = useQuery({
    queryKey: ['budget-versions', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_versions')
        .select('*')
        .eq('budget_id', budgetId!)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as BudgetVersion[];
    },
    enabled: !!budgetId,
  });

  const createVersion = useMutation({
    mutationFn: async (params: CreateVersionParams) => {
      // First, get current budget items to snapshot
      const { data: items } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', params.budget_id);

      // Calculate totals
      const totalExpenses = (items || []).reduce((sum, item) => {
        const base = (item.unit_price || 0) * (item.quantity || 1);
        const iva = base * ((item.iva_percentage || 0) / 100);
        return sum + base + iva;
      }, 0);

      // Get income from payment schedules
      const { data: incomes } = await supabase
        .from('payment_schedules')
        .select('amount, payment_status')
        .eq('budget_id', params.budget_id);

      const totalIncome = (incomes || []).reduce((sum, i) => sum + (i.amount || 0), 0);

      // Get next version number
      const { data: lastVersion } = await supabase
        .from('budget_versions')
        .select('version_number')
        .eq('budget_id', params.budget_id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = (lastVersion?.version_number || 0) + 1;

      const { data, error } = await supabase
        .from('budget_versions')
        .insert({
          budget_id: params.budget_id,
          version_type: params.version_type,
          version_name: params.version_name,
          version_number: nextNumber,
          snapshot_data: { items, incomes },
          total_income: totalIncome,
          total_expenses: totalExpenses,
          net_profit: totalIncome - totalExpenses,
          locked_at: params.version_type === 'locked' ? new Date().toISOString() : null,
          locked_by: params.version_type === 'locked' ? profile?.user_id : null,
          notes: params.notes,
          created_by: profile?.user_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-versions'] });
      toast.success('Versión del presupuesto creada');
    },
    onError: (error) => {
      toast.error('Error al crear versión');
      console.error(error);
    },
  });

  // Get variance between two versions
  const getVariance = (estimatedVersion?: BudgetVersion, actualVersion?: BudgetVersion) => {
    if (!estimatedVersion || !actualVersion) return null;

    return {
      incomeVariance: actualVersion.total_income - estimatedVersion.total_income,
      expenseVariance: actualVersion.total_expenses - estimatedVersion.total_expenses,
      profitVariance: actualVersion.net_profit - estimatedVersion.net_profit,
      incomePercentage: estimatedVersion.total_income > 0 
        ? ((actualVersion.total_income - estimatedVersion.total_income) / estimatedVersion.total_income) * 100 
        : 0,
      expensePercentage: estimatedVersion.total_expenses > 0
        ? ((actualVersion.total_expenses - estimatedVersion.total_expenses) / estimatedVersion.total_expenses) * 100
        : 0,
    };
  };

  const estimatedVersion = versions.find(v => v.version_type === 'estimated' || v.version_type === 'locked');
  const actualVersion = versions.find(v => v.version_type === 'actual');
  const variance = getVariance(estimatedVersion, actualVersion);

  return {
    versions,
    isLoading,
    error,
    estimatedVersion,
    actualVersion,
    variance,
    createVersion,
    getVariance,
  };
}
