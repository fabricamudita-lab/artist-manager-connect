import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DraftParticipant {
  id: string;
  draft_id: string;
  name: string;
  email: string;
  profile_id: string | null;
  contact_id: string | null;
  role: string;
  first_seen_at: string;
  last_seen_at: string;
  view_count: number;
  // enriched
  avatar_url?: string | null;
  display_name?: string | null;
}

export function useDraftParticipants(draftId: string | undefined, token: string | undefined) {
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    if (!draftId) return;
    const { data, error } = await supabase
      .from('contract_draft_participants')
      .select('*')
      .eq('draft_id', draftId)
      .order('last_seen_at', { ascending: false });
    if (error) {
      console.error('Error loading participants:', error);
      setLoading(false);
      return;
    }

    // Enrich with profile/contact info
    const profileIds = (data || []).map(p => p.profile_id).filter(Boolean) as string[];
    const contactIds = (data || []).map(p => p.contact_id).filter(Boolean) as string[];

    const [profilesRes, contactsRes] = await Promise.all([
      profileIds.length
        ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', profileIds)
        : Promise.resolve({ data: [] as any[] }),
      contactIds.length
        ? supabase.from('contacts').select('id, name, avatar_url').in('id', contactIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const contactMap = new Map((contactsRes.data || []).map((c: any) => [c.id, c]));

    const enriched: DraftParticipant[] = (data || []).map((p: any) => {
      const prof = p.profile_id ? profileMap.get(p.profile_id) : null;
      const cont = p.contact_id ? contactMap.get(p.contact_id) : null;
      return {
        ...p,
        avatar_url: prof?.avatar_url || cont?.avatar_url || null,
        display_name: prof?.full_name || cont?.name || p.name,
      };
    });
    setParticipants(enriched);
    setLoading(false);
  }, [draftId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Realtime subscription
  useEffect(() => {
    if (!draftId) return;
    const channel = supabase
      .channel(`draft-participants-${draftId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_draft_participants', filter: `draft_id=eq.${draftId}` },
        () => fetchParticipants(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [draftId, fetchParticipants]);

  // Track + heartbeat
  const lastTouch = useRef<number>(0);
  const trackParticipant = useCallback(
    async (name: string, email: string, role: string = 'viewer') => {
      if (!token) return;
      const { error } = await supabase.rpc('track_draft_participant', {
        p_token: token,
        p_name: name,
        p_email: email,
        p_role: role,
      });
      if (error) console.error('track_draft_participant error:', error);
      lastTouch.current = Date.now();
    },
    [token],
  );

  const touchParticipant = useCallback(
    async (email: string) => {
      if (!token) return;
      const now = Date.now();
      if (now - lastTouch.current < 5 * 60 * 1000) return; // 5min debounce
      lastTouch.current = now;
      await supabase.rpc('touch_draft_participant', { p_token: token, p_email: email });
    },
    [token],
  );

  return { participants, loading, trackParticipant, touchParticipant, refetch: fetchParticipants };
}
