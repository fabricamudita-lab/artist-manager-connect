
-- Email provider enum
CREATE TYPE public.email_provider AS ENUM ('gmail', 'outlook');

-- Email link type enum
CREATE TYPE public.email_link_type AS ENUM ('contact', 'booking', 'project', 'solicitud', 'budget');

-- ===========================================
-- 1. email_accounts
-- ===========================================
CREATE TABLE public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider email_provider NOT NULL,
  email_address TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_cursor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, email_address)
);

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email accounts"
  ON public.email_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 2. email_messages
-- ===========================================
CREATE TABLE public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  to_addresses JSONB DEFAULT '[]'::jsonb,
  cc_addresses JSONB DEFAULT '[]'::jsonb,
  snippet TEXT,
  body_html TEXT,
  body_text TEXT,
  date TIMESTAMPTZ,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  folder TEXT NOT NULL DEFAULT 'inbox',
  labels JSONB DEFAULT '[]'::jsonb,
  thread_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email_account_id, provider_message_id)
);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own email messages"
  ON public.email_messages FOR ALL
  USING (
    email_account_id IN (
      SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    email_account_id IN (
      SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_email_messages_account_folder ON public.email_messages(email_account_id, folder);
CREATE INDEX idx_email_messages_date ON public.email_messages(date DESC);
CREATE INDEX idx_email_messages_thread ON public.email_messages(thread_id);

-- ===========================================
-- 3. email_attachments
-- ===========================================
CREATE TABLE public.email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  provider_attachment_id TEXT
);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own email attachments"
  ON public.email_attachments FOR ALL
  USING (
    email_message_id IN (
      SELECT em.id FROM public.email_messages em
      JOIN public.email_accounts ea ON ea.id = em.email_account_id
      WHERE ea.user_id = auth.uid()
    )
  )
  WITH CHECK (
    email_message_id IN (
      SELECT em.id FROM public.email_messages em
      JOIN public.email_accounts ea ON ea.id = em.email_account_id
      WHERE ea.user_id = auth.uid()
    )
  );

-- ===========================================
-- 4. email_links
-- ===========================================
CREATE TABLE public.email_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  link_type email_link_type NOT NULL,
  linked_entity_id UUID NOT NULL,
  linked_automatically BOOLEAN NOT NULL DEFAULT false,
  linked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email_message_id, link_type, linked_entity_id)
);

ALTER TABLE public.email_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email links"
  ON public.email_links FOR ALL
  USING (
    email_message_id IN (
      SELECT em.id FROM public.email_messages em
      JOIN public.email_accounts ea ON ea.id = em.email_account_id
      WHERE ea.user_id = auth.uid()
    )
  )
  WITH CHECK (
    email_message_id IN (
      SELECT em.id FROM public.email_messages em
      JOIN public.email_accounts ea ON ea.id = em.email_account_id
      WHERE ea.user_id = auth.uid()
    )
  );

-- ===========================================
-- 5. email_signatures
-- ===========================================
CREATE TABLE public.email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email signatures"
  ON public.email_signatures FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- Trigger for updated_at on email_accounts
-- ===========================================
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_solicitudes_updated_at();
