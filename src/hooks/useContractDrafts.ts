import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type DraftStatus = 'borrador' | 'en_negociacion' | 'listo_para_firma' | 'firmado';
export type DraftType = 'ip_license' | 'booking';

export interface ContractDraft {
  id: string;
  draft_type: string;
  status: string;
  title: string;
  form_data: any;
  clauses_data: any;
  share_token: string;
  created_by: string;
  release_id: string | null;
  booking_id: string | null;
  artist_id: string | null;
  signed_pdf_url: string | null;
  firma_fecha: string | null;
  firma_lugar: string | null;
  producer_email: string | null;
  collaborator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftComment {
  id: string;
  draft_id: string;
  section_key: string;
  message: string;
  author_name: string;
  author_profile_id: string | null;
  parent_comment_id: string | null;
  resolved: boolean;
  created_at: string;
  // Negotiation fields
  selected_text: string | null;
  clause_number: string | null;
  selection_start: number | null;
  selection_end: number | null;
  proposed_change: string | null;
  comment_status: string;
  approved_by_producer: boolean;
  approved_by_collaborator: boolean;
}

export function useContractDrafts(filters?: { releaseId?: string; bookingId?: string; status?: DraftStatus }) {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<ContractDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from('contract_drafts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filters?.releaseId) query = query.eq('release_id', filters.releaseId);
    if (filters?.bookingId) query = query.eq('booking_id', filters.bookingId);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (!error && data) setDrafts(data as unknown as ContractDraft[]);
    setLoading(false);
  }, [user, filters?.releaseId, filters?.bookingId, filters?.status]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  useEffect(() => {
    const channel = supabase
      .channel('contract_drafts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_drafts' }, () => { fetchDrafts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDrafts]);

  const saveDraft = async (data: {
    draftType: DraftType; title: string; formData: any; clausesData?: any;
    releaseId?: string; bookingId?: string; artistId?: string;
    producerEmail?: string; collaboratorEmail?: string;
  }): Promise<ContractDraft | null> => {
    if (!user) return null;
    const { data: result, error } = await supabase
      .from('contract_drafts')
      .insert({
        draft_type: data.draftType, title: data.title, form_data: data.formData,
        clauses_data: data.clausesData || null, created_by: user.id,
        release_id: data.releaseId || null, booking_id: data.bookingId || null,
        artist_id: data.artistId || null,
        producer_email: data.producerEmail || null,
        collaborator_email: data.collaboratorEmail || null,
      })
      .select().single();
    if (error) { toast.error('Error al guardar borrador: ' + error.message); return null; }
    toast.success('Borrador guardado');
    return result as unknown as ContractDraft;
  };

  const updateDraft = async (draftId: string, updates: {
    formData?: any; clausesData?: any; title?: string; firmaFecha?: string; firmaLugar?: string;
  }): Promise<boolean> => {
    const updateObj: any = {};
    if (updates.formData !== undefined) updateObj.form_data = updates.formData;
    if (updates.clausesData !== undefined) updateObj.clauses_data = updates.clausesData;
    if (updates.title !== undefined) updateObj.title = updates.title;
    if (updates.firmaFecha !== undefined) updateObj.firma_fecha = updates.firmaFecha;
    if (updates.firmaLugar !== undefined) updateObj.firma_lugar = updates.firmaLugar;

    const { error } = await supabase.from('contract_drafts').update(updateObj).eq('id', draftId);
    if (error) { toast.error('Error al actualizar: ' + error.message); return false; }
    toast.success('Borrador actualizado');
    return true;
  };

  const updateStatus = async (draftId: string, status: DraftStatus): Promise<boolean> => {
    const { error } = await supabase.from('contract_drafts').update({ status }).eq('id', draftId);
    if (error) { toast.error('Error al cambiar estado: ' + error.message); return false; }
    const labels: Record<DraftStatus, string> = {
      borrador: 'Borrador', en_negociacion: 'En negociación',
      listo_para_firma: 'Listo para firma', firmado: 'Firmado',
    };
    toast.success(`Estado: ${labels[status]}`);
    return true;
  };

  const deleteDraft = async (draftId: string): Promise<boolean> => {
    const { error } = await supabase.from('contract_drafts').delete().eq('id', draftId);
    if (error) { toast.error('Error al eliminar: ' + error.message); return false; }
    toast.success('Borrador eliminado');
    return true;
  };

  const createContractFromDraft = async (draftId: string): Promise<string | null> => {
    if (!user) return null;
    
    // Fetch the draft
    const { data: draft, error: fetchError } = await supabase
      .from('contract_drafts')
      .select('*')
      .eq('id', draftId)
      .single();
    
    if (fetchError || !draft) {
      toast.error('Error al obtener el borrador');
      return null;
    }

    const draftData = draft as unknown as ContractDraft;
    
    // Create unified contract record
    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        title: draftData.title,
        status: 'pendiente_firma',
        created_by: user.id,
        contract_type: draftData.draft_type === 'ip_license' ? 'ip_license' : 'booking',
        draft_id: draftId,
        booking_id: draftData.booking_id,
        release_id: draftData.release_id,
        artist_id: draftData.artist_id,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error('Error al crear contrato: ' + error.message);
      return null;
    }

    // Update draft status to listo_para_firma
    await updateStatus(draftId, 'listo_para_firma');
    
    toast.success('Contrato creado y listo para firma');
    return (contract as any)?.id || null;
  };

  return { drafts, loading, fetchDrafts, saveDraft, updateDraft, updateStatus, deleteDraft, createContractFromDraft };
}

// ── Public draft view (by token, no auth required) ─────────────────────
export function usePublicDraft(token: string | undefined) {
  const [draft, setDraft] = useState<ContractDraft | null>(null);
  const [comments, setComments] = useState<DraftComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDraft = useCallback(async () => {
    if (!token) return;
    const { data, error } = await supabase
      .from('contract_drafts')
      .select('*')
      .eq('share_token', token)
      .single();
    if (!error && data) setDraft(data as unknown as ContractDraft);
    setLoading(false);
  }, [token]);

  const fetchComments = useCallback(async () => {
    if (!draft) return;
    const { data } = await supabase
      .from('contract_draft_comments')
      .select('*')
      .eq('draft_id', draft.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data as unknown as DraftComment[]);
  }, [draft?.id]);

  useEffect(() => { fetchDraft(); }, [fetchDraft]);
  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Realtime
  useEffect(() => {
    if (!draft) return;
    const channel = supabase
      .channel(`draft_${draft.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_drafts', filter: `id=eq.${draft.id}` }, () => { fetchDraft(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_draft_comments', filter: `draft_id=eq.${draft.id}` }, () => { fetchComments(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [draft?.id, fetchDraft, fetchComments]);

  const addComment = async (sectionKey: string, message: string, authorName: string, parentId?: string) => {
    const { error } = await supabase.from('contract_draft_comments').insert({
      draft_id: draft!.id,
      section_key: sectionKey,
      message,
      author_name: authorName,
      parent_comment_id: parentId || null,
    } as any);
    if (error) toast.error('Error al añadir comentario');
  };

  const addSelectionComment = async (data: {
    sectionKey: string; message: string; authorName: string;
    selectedText: string; clauseNumber: string; selectionStart: number; selectionEnd: number;
  }) => {
    const { error } = await supabase.from('contract_draft_comments').insert({
      draft_id: draft!.id,
      section_key: data.sectionKey,
      message: data.message,
      author_name: data.authorName,
      selected_text: data.selectedText,
      clause_number: data.clauseNumber,
      selection_start: data.selectionStart,
      selection_end: data.selectionEnd,
      comment_status: 'open',
    } as any);
    if (error) toast.error('Error al añadir comentario');
  };

  const proposeChange = async (commentId: string, proposedText: string) => {
    const { error } = await supabase.from('contract_draft_comments')
      .update({ proposed_change: proposedText, comment_status: 'pending_approval' } as any)
      .eq('id', commentId);
    if (error) toast.error('Error al proponer cambio');
    else toast.success('Propuesta de cambio enviada');
  };

  const approveChange = async (commentId: string, role: 'producer' | 'collaborator') => {
    console.log('🔍 approveChange called with role:', role, 'commentId:', commentId);
    
    if (!role || role === 'viewer' as any || (role !== 'producer' && role !== 'collaborator')) {
      console.error('❌ Invalid role for approval:', role);
      toast.error('No tienes permisos para aprobar cambios');
      return;
    }
    
    const updateData = role === 'producer' 
      ? { approved_by_producer: true }
      : { approved_by_collaborator: true };
    
    console.log('📤 Updating ONLY field:', updateData);
    
    const { error } = await supabase.from('contract_draft_comments')
      .update(updateData as any)
      .eq('id', commentId);
    if (error) { 
      console.error('❌ Error updating:', error);
      toast.error('Error al aprobar'); 
      return; 
    }

    // Re-fetch to check if both approved
    const { data: updated } = await supabase.from('contract_draft_comments')
      .select('*').eq('id', commentId).single();
    if (updated) {
      const comment = updated as unknown as DraftComment;
      console.log('📊 After update - producer:', comment.approved_by_producer, 'collaborator:', comment.approved_by_collaborator);
      if (comment.approved_by_producer && comment.approved_by_collaborator) {
        console.log('🎉 Both approved! Applying change...');
        await applyChange(comment);
      } else {
        console.log('⏳ Waiting for other party approval');
      }
    }
    toast.success('Cambio aprobado');
  };

  const applyChange = async (comment: DraftComment) => {
    if (!draft || !comment.proposed_change || !comment.selected_text) return;

    // Update clauses_data by replacing old text with new
    const clausesData = { ...draft.clauses_data };
    let applied = false;
    for (const key of Object.keys(clausesData)) {
      if (typeof clausesData[key] === 'string' && clausesData[key].includes(comment.selected_text)) {
        clausesData[key] = clausesData[key].replace(comment.selected_text, comment.proposed_change);
        applied = true;
        break;
      }
    }

    if (applied) {
      await supabase.from('contract_drafts').update({ clauses_data: clausesData } as any).eq('id', draft.id);
    }

    await supabase.from('contract_draft_comments')
      .update({ comment_status: 'approved', resolved: true } as any)
      .eq('id', comment.id);

    toast.success('✅ Cambio aplicado — El contrato se ha actualizado');
  };

  const rejectChange = async (commentId: string) => {
    const { error } = await supabase.from('contract_draft_comments')
      .update({
        proposed_change: null,
        comment_status: 'open',
        approved_by_producer: false,
        approved_by_collaborator: false,
      } as any)
      .eq('id', commentId);
    if (error) toast.error('Error al rechazar');
    else toast.success('Propuesta rechazada');
  };

  const resolveComment = async (commentId: string) => {
    await supabase.from('contract_draft_comments')
      .update({ resolved: true, comment_status: 'resolved' } as any)
      .eq('id', commentId);
  };

  return {
    draft, comments, loading,
    addComment, addSelectionComment,
    resolveComment, proposeChange, approveChange, rejectChange,
    refetch: fetchDraft,
  };
}
