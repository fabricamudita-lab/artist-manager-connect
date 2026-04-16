import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomField {
  id: string;
  workspace_id: string;
  entity_type: 'artist' | 'contact';
  field_key: string;
  label: string;
  field_type: string;
  section: string;
  sort_order: number;
  created_at: string;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
] as const;

export { FIELD_TYPE_OPTIONS };

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);
}

export function useCustomFields(workspaceId: string | undefined, entityType: 'artist' | 'contact') {
  const queryClient = useQueryClient();
  const queryKey = ['custom-fields', workspaceId, entityType];

  const { data: fields = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('custom_fields' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', entityType)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CustomField[];
    },
    enabled: !!workspaceId,
  });

  const createField = useMutation({
    mutationFn: async ({ label, fieldType }: { label: string; fieldType: string }) => {
      if (!workspaceId) throw new Error('No workspace');
      const field_key = slugify(label) + '_' + Date.now().toString(36);
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('custom_fields' as any)
        .insert({
          workspace_id: workspaceId,
          entity_type: entityType,
          field_key,
          label: label.trim(),
          field_type: fieldType,
          sort_order: fields.length,
          created_by: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CustomField;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteField = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from('custom_fields' as any)
        .delete()
        .eq('id', fieldId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { fields, isLoading, createField, deleteField };
}

/** Load custom fields for a public form (anon, by workspace_id) */
export async function loadCustomFieldsForEntity(workspaceId: string, entityType: 'artist' | 'contact'): Promise<CustomField[]> {
  const { data, error } = await supabase
    .from('custom_fields' as any)
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', entityType)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Error loading custom fields:', error);
    return [];
  }
  return (data || []) as unknown as CustomField[];
}
