-- Create contract_signers table for multi-signer support
CREATE TABLE public.contract_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.booking_documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Firmante',
  email TEXT,
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signature_image_url TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX idx_contract_signers_token ON public.contract_signers(token);
CREATE INDEX idx_contract_signers_document_id ON public.contract_signers(document_id);

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can view signers"
  ON public.contract_signers
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create signers"
  ON public.contract_signers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update signers"
  ON public.contract_signers
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete signers"
  ON public.contract_signers
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Public access for signing via token
CREATE POLICY "Anyone can view signers by token"
  ON public.contract_signers
  FOR SELECT
  USING (token IS NOT NULL);

CREATE POLICY "Anyone can sign via token"
  ON public.contract_signers
  FOR UPDATE
  USING (token IS NOT NULL AND status = 'pending')
  WITH CHECK (token IS NOT NULL);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_signers;