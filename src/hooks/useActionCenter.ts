import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export type ActionItemType = 
  | 'booking_request'
  | 'budget_approval'
  | 'expense_approval'
  | 'vacation_request'
  | 'interview_request'
  | 'collaboration'
  | 'general';

export type ActionItemStatus = 
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ActionItemPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  item_type: ActionItemType;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  artist_id: string | null;
  project_id: string | null;
  booking_id: string | null;
  budget_id: string | null;
  created_by: string;
  assigned_to: string | null;
  [key: string]: unknown; // Allow additional properties
  decided_by: string | null;
  decided_at: string | null;
  amount: number | null;
  currency: string;
  requester_name: string | null;
  requester_email: string | null;
  requester_company: string | null;
  requested_date: string | null;
  deadline: string | null;
  decision_comment: string | null;
  conditions: string | null;
  metadata: Record<string, unknown>;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
}

export interface ActionCenterComment {
  id: string;
  action_id: string;
  author_id: string;
  message: string;
  is_system: boolean;
  created_at: string;
}

export interface CreateActionItemParams {
  title: string;
  description?: string;
  item_type: ActionItemType;
  priority?: ActionItemPriority;
  artist_id?: string;
  project_id?: string;
  booking_id?: string;
  budget_id?: string;
  assigned_to?: string;
  amount?: number;
  requester_name?: string;
  requester_email?: string;
  requester_company?: string;
  requested_date?: string;
  deadline?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionCenterFilters {
  status?: ActionItemStatus[];
  item_type?: ActionItemType[];
  priority?: ActionItemPriority[];
  artist_id?: string;
  assigned_to?: string;
}

export function useActionCenter(filters: ActionCenterFilters = {}) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ['action-center', filters],
    queryFn: async () => {
      let query = supabase
        .from('action_center')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.item_type && filters.item_type.length > 0) {
        query = query.in('item_type', filters.item_type);
      }
      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }
      if (filters.artist_id) {
        query = query.eq('artist_id', filters.artist_id);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActionItem[];
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (params: CreateActionItemParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        title: params.title,
        description: params.description,
        item_type: params.item_type,
        priority: params.priority || 'normal',
        artist_id: params.artist_id,
        project_id: params.project_id,
        booking_id: params.booking_id,
        budget_id: params.budget_id,
        assigned_to: params.assigned_to,
        amount: params.amount,
        requester_name: params.requester_name,
        requester_email: params.requester_email,
        requester_company: params.requester_company,
        requested_date: params.requested_date,
        deadline: params.deadline,
        metadata: (params.metadata || {}) as Json,
        created_by: user.id,
        status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('action_center')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-center'] });
      toast({
        title: 'Éxito',
        description: 'Solicitud creada correctamente',
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      itemId, 
      status, 
      decision_comment,
      conditions 
    }: { 
      itemId: string; 
      status: ActionItemStatus;
      decision_comment?: string;
      conditions?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = { status };
      if (decision_comment) updateData.decision_comment = decision_comment;
      if (conditions) updateData.conditions = conditions;

      if (['approved', 'rejected'].includes(status)) {
        updateData.decided_by = user.id;
        updateData.decided_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('action_center')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['action-center'] });
      const statusMessages: Record<ActionItemStatus, string> = {
        draft: 'Guardado como borrador',
        pending: 'Marcado como pendiente',
        in_review: 'En revisión',
        approved: 'Solicitud aprobada',
        rejected: 'Solicitud rechazada',
        cancelled: 'Solicitud cancelada',
      };
      toast({
        title: 'Éxito',
        description: statusMessages[data.status as ActionItemStatus] || 'Estado actualizado',
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

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('action_center')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-center'] });
      toast({
        title: 'Éxito',
        description: 'Solicitud eliminada',
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

  // Stats
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const inReviewCount = items.filter(i => i.status === 'in_review').length;
  const urgentCount = items.filter(i => i.priority === 'urgent' && !['approved', 'rejected', 'cancelled'].includes(i.status)).length;

  return {
    items,
    isLoading,
    error,
    refetch,
    createItem: createItemMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    isCreating: createItemMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    stats: {
      total: items.length,
      pending: pendingCount,
      inReview: inReviewCount,
      urgent: urgentCount,
    },
  };
}

// Hook for action center comments
export function useActionCenterComments(actionId: string | null) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['action-center-comments', actionId],
    queryFn: async () => {
      if (!actionId) return [];
      
      const { data, error } = await supabase
        .from('action_center_comments')
        .select('*')
        .eq('action_id', actionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ActionCenterComment[];
    },
    enabled: !!actionId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!actionId) throw new Error('Action ID required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('action_center_comments')
        .insert({
          action_id: actionId,
          author_id: profile.id,
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-center-comments', actionId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutateAsync,
    isAdding: addCommentMutation.isPending,
  };
}
