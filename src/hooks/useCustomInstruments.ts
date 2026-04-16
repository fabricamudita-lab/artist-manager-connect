import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { normalizeInstrumentLabel } from '@/lib/instruments/dittoInstruments';

type CustomInstrumentRow = Database['public']['Tables']['custom_instruments']['Row'];

const instrumentNameSchema = z
  .string()
  .trim()
  .min(1, 'El instrumento no puede estar vacío')
  .max(60, 'El instrumento no puede superar los 60 caracteres')
  .regex(/^[\p{L}\p{N}\s\-']+$/u, 'Solo se permiten letras, números, espacios, guiones y apóstrofes')
  .transform(normalizeInstrumentLabel);

export function useCustomInstruments(
  workspaceId: string | undefined,
  page = 0,
  pageSize = 200,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['custom_instruments', workspaceId, page, pageSize],
    enabled: !!workspaceId,
    queryFn: async (): Promise<CustomInstrumentRow[]> => {
      if (!workspaceId) return [];

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('custom_instruments')
        .select('id, name, workspace_id, created_at, created_by')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (rawName: string): Promise<CustomInstrumentRow> => {
      if (!workspaceId) {
        throw new Error('No se pudo identificar el workspace actual');
      }

      const name = instrumentNameSchema.parse(rawName);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Debes iniciar sesión para guardar instrumentos');
      }

      const { data, error } = await supabase
        .from('custom_instruments')
        .insert({
          workspace_id: workspaceId,
          name,
          created_by: user.id,
        })
        .select('id, name, workspace_id, created_at, created_by')
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existing, error: existingError } = await supabase
            .from('custom_instruments')
            .select('id, name, workspace_id, created_at, created_by')
            .eq('workspace_id', workspaceId)
            .ilike('name', name)
            .maybeSingle();

          if (existingError) throw existingError;
          if (existing) return existing;
        }

        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['custom_instruments'],
      });
    },
    onError: (error) => {
      const description =
        error instanceof z.ZodError
          ? error.issues[0]?.message || 'Instrumento inválido'
          : error instanceof Error
            ? error.message
            : 'No se pudo guardar el instrumento';

      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    },
  });

  return {
    instruments: query.data ?? [],
    isLoading: query.isLoading,
    addInstrument: mutation.mutateAsync,
    isAddingInstrument: mutation.isPending,
  };
}
