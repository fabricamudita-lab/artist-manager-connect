
CREATE TABLE public.contact_form_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE DEFAULT substring(gen_random_uuid()::text from 1 for 36) NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_form_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contact form tokens"
  ON public.contact_form_tokens FOR ALL TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Anon can read active tokens"
  ON public.contact_form_tokens FOR SELECT TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Anon can read contacts via form token"
  ON public.contacts FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.contact_form_tokens
    WHERE contact_form_tokens.contact_id = contacts.id
      AND contact_form_tokens.is_active = true
      AND (contact_form_tokens.expires_at IS NULL OR contact_form_tokens.expires_at > now())
  ));

CREATE POLICY "Anon can update contacts via form token"
  ON public.contacts FOR UPDATE TO anon
  USING (EXISTS (
    SELECT 1 FROM public.contact_form_tokens
    WHERE contact_form_tokens.contact_id = contacts.id
      AND contact_form_tokens.is_active = true
      AND (contact_form_tokens.expires_at IS NULL OR contact_form_tokens.expires_at > now())
  ));
