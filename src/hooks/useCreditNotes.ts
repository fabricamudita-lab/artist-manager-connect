import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { toast } from 'sonner';

export type CreditNoteScope = 'publishing' | 'master';

export interface CreditNote {
  id: string;
  release_id: string;
  track_id: string | null;
  scope: CreditNoteScope;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const noteSchema = z.string().trim().max(2000, 'La nota no puede exceder 2000 caracteres');

export function useCreditNotes(releaseId: string | undefined, scope: CreditNoteScope) {
  return useQuery({
    queryKey: ['credit-notes', releaseId, scope],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('release_id', releaseId)
        .eq('scope', scope);
      if (error) throw error;
      return (data || []) as CreditNote[];
    },
    enabled: !!releaseId,
  });
}

interface SaveArgs {
  releaseId: string;
  scope: CreditNoteScope;
  trackId: string | null;
  note: string;
  existingId?: string | null;
}

export function useSaveCreditNote() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ releaseId, scope, trackId, note, existingId }: SaveArgs) => {
      const parsed = noteSchema.safeParse(note);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Nota inválida');
      }
      const trimmed = parsed.data;

      // Empty note → delete existing
      if (trimmed.length === 0) {
        if (existingId) {
          const { error } = await supabase.from('credit_notes').delete().eq('id', existingId);
          if (error) throw error;
        }
        return null;
      }

      if (existingId) {
        const { data, error } = await supabase
          .from('credit_notes')
          .update({ note: trimmed })
          .eq('id', existingId)
          .select()
          .single();
        if (error) throw error;
        return data as CreditNote;
      }

      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('credit_notes')
        .insert({
          release_id: releaseId,
          scope,
          track_id: trackId,
          note: trimmed,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CreditNote;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['credit-notes', vars.releaseId, vars.scope] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
