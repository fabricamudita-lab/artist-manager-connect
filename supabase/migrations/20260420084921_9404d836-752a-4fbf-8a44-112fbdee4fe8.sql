-- Contract draft participants tracking
CREATE TABLE IF NOT EXISTS public.contract_draft_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.contract_drafts(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'viewer',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 1,
  UNIQUE (draft_id, email)
);

CREATE INDEX IF NOT EXISTS idx_cdp_draft ON public.contract_draft_participants(draft_id);

ALTER TABLE public.contract_draft_participants ENABLE ROW LEVEL SECURITY;

-- Public read for token-based access (matches contract_drafts public read pattern)
CREATE POLICY "Anyone can read draft participants"
ON public.contract_draft_participants
FOR SELECT
USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_draft_participants;
ALTER TABLE public.contract_draft_participants REPLICA IDENTITY FULL;

-- RPC: track participant by draft token + identity
CREATE OR REPLACE FUNCTION public.track_draft_participant(
  p_token text,
  p_name text,
  p_email text,
  p_role text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft_id uuid;
  v_email text;
  v_profile_id uuid;
  v_contact_id uuid;
  v_participant public.contract_draft_participants%ROWTYPE;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email = '' OR v_email IS NULL THEN
    RAISE EXCEPTION 'Email required';
  END IF;

  -- Resolve draft from token (try producer or collaborator token)
  SELECT id INTO v_draft_id
  FROM public.contract_drafts
  WHERE producer_token = p_token OR collaborator_token = p_token
  LIMIT 1;

  IF v_draft_id IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  -- Try linking to a profile
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE lower(email) = v_email
  LIMIT 1;

  -- Else try linking to a contact
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_contact_id
    FROM public.contacts
    WHERE lower(COALESCE(email, '')) = v_email
    LIMIT 1;
  END IF;

  -- Upsert participant
  INSERT INTO public.contract_draft_participants
    (draft_id, name, email, profile_id, contact_id, role)
  VALUES
    (v_draft_id, p_name, v_email, v_profile_id, v_contact_id, COALESCE(p_role, 'viewer'))
  ON CONFLICT (draft_id, email) DO UPDATE SET
    name = EXCLUDED.name,
    last_seen_at = now(),
    view_count = public.contract_draft_participants.view_count + 1,
    profile_id = COALESCE(public.contract_draft_participants.profile_id, EXCLUDED.profile_id),
    contact_id = COALESCE(public.contract_draft_participants.contact_id, EXCLUDED.contact_id),
    role = CASE WHEN public.contract_draft_participants.role = 'viewer' THEN EXCLUDED.role ELSE public.contract_draft_participants.role END
  RETURNING * INTO v_participant;

  RETURN to_jsonb(v_participant);
END;
$$;

-- RPC: heartbeat (refresh last_seen)
CREATE OR REPLACE FUNCTION public.touch_draft_participant(
  p_token text,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft_id uuid;
BEGIN
  SELECT id INTO v_draft_id
  FROM public.contract_drafts
  WHERE producer_token = p_token OR collaborator_token = p_token
  LIMIT 1;

  IF v_draft_id IS NULL THEN RETURN; END IF;

  UPDATE public.contract_draft_participants
  SET last_seen_at = now()
  WHERE draft_id = v_draft_id AND email = lower(trim(p_email));
END;
$$;