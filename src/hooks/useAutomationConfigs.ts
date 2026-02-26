import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AUTOMATIONS } from '@/lib/automationDefinitions';

export interface AutomationConfig {
  id: string;
  workspace_id: string;
  automation_key: string;
  is_enabled: boolean;
  trigger_days: number | null;
  notify_role: string | null;
  notify_channel: string;
  custom_settings: Record<string, unknown>;
}

export function useAutomationConfigs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch workspace_id from profiles table
  const { data: workspaceId } = useQuery({
    queryKey: ['my_workspace_id', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .single();
      return data?.workspace_id as string | null;
    },
    enabled: !!user?.id,
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['automation_configs', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('automation_configs')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return (data || []) as AutomationConfig[];
    },
    enabled: !!workspaceId,
  });

  // Merge DB configs with definitions
  const mergedConfigs = AUTOMATIONS.map(def => {
    const saved = configs.find(c => c.automation_key === def.key);
    return {
      ...def,
      is_enabled: saved?.is_enabled ?? false,
      trigger_days: saved?.trigger_days ?? def.defaultTriggerDays,
      notify_role: saved?.notify_role ?? def.defaultNotifyRole,
      notify_channel: saved?.notify_channel ?? def.defaultChannel,
      config_id: saved?.id ?? null,
    };
  });

  const upsertConfig = useMutation({
    mutationFn: async (params: {
      automation_key: string;
      is_enabled?: boolean;
      trigger_days?: number | null;
      notify_role?: string;
      notify_channel?: string;
    }) => {
      if (!workspaceId) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('automation_configs')
        .upsert({
          workspace_id: workspaceId,
          automation_key: params.automation_key,
          is_enabled: params.is_enabled,
          trigger_days: params.trigger_days,
          notify_role: params.notify_role,
          notify_channel: params.notify_channel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,automation_key' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_configs', workspaceId] });
    },
  });

  const enableAllRecommended = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('No workspace');
      const recommended = AUTOMATIONS.filter(a => a.recommended);
      const rows = recommended.map(a => ({
        workspace_id: workspaceId,
        automation_key: a.key,
        is_enabled: true,
        trigger_days: a.defaultTriggerDays,
        notify_role: a.defaultNotifyRole,
        notify_channel: a.defaultChannel,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('automation_configs')
        .upsert(rows, { onConflict: 'workspace_id,automation_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_configs', workspaceId] });
    },
  });

  const activeCount = mergedConfigs.filter(c => c.is_enabled).length;

  return { configs: mergedConfigs, isLoading, upsertConfig, enableAllRecommended, activeCount, totalCount: AUTOMATIONS.length };
}
