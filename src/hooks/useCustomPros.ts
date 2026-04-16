import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface CustomPro {
  id: string;
  workspace_id: string;
  name: string;
  country: string | null;
  created_by: string;
  created_at: string;
}

const customProSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'Usa código ISO de 2 letras (ES, US…)')
    .nullable()
    .optional(),
});

export function useCustomPros(workspaceId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['custom-pros', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as CustomPro[];
      const { data, error } = await supabase
        .from('custom_pros')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');
      if (error) throw error;
      return (data || []) as CustomPro[];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; country?: string | null }) => {
      if (!workspaceId) throw new Error('Sin workspace');
      if (!user?.id) throw new Error('Sin usuario');
      const parsed = customProSchema.parse({
        name: input.name,
        country: input.country?.trim() ? input.country : null,
      });
      const { data, error } = await supabase
        .from('custom_pros')
        .insert({
          name: parsed.name,
          country: parsed.country ?? null,
          workspace_id: workspaceId,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CustomPro;
    },
    onSuccess: (pro) => {
      queryClient.invalidateQueries({ queryKey: ['custom-pros', workspaceId] });
      toast({ title: 'Sociedad añadida', description: pro.name });
    },
    onError: (err: any) => {
      const msg =
        err?.message?.includes('duplicate') || err?.code === '23505'
          ? 'Ya existe una sociedad con ese nombre.'
          : err?.message || 'No se pudo guardar la sociedad';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  return { ...list, create };
}
