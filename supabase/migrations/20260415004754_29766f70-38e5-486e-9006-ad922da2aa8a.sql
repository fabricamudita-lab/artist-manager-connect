
-- 1. Add 'negociando' to contract_status enum
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'negociando';
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'listo_para_firma';

-- 2. Make project_id nullable on contracts
ALTER TABLE public.contracts ALTER COLUMN project_id DROP NOT NULL;

-- 3. Add new columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'booking',
  ADD COLUMN IF NOT EXISTS draft_id uuid REFERENCES public.contract_drafts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_document_id uuid REFERENCES public.booking_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_token text DEFAULT encode(gen_random_bytes(24), 'base64');

-- 4. Migrate existing booking_documents that have signers into contracts
INSERT INTO public.contracts (
  title, status, file_url, created_by, contract_type, booking_document_id, booking_id, created_at
)
SELECT DISTINCT ON (bd.id)
  bd.file_name,
  CASE bd.status
    WHEN 'signed' THEN 'firmado'::contract_status
    WHEN 'pending_signature' THEN 'pendiente_firma'::contract_status
    ELSE 'borrador'::contract_status
  END,
  bd.file_url,
  bd.created_by,
  'booking',
  bd.id,
  bd.booking_id,
  bd.created_at
FROM public.booking_documents bd
WHERE EXISTS (
  SELECT 1 FROM public.contract_signers cs WHERE cs.document_id = bd.id
);

-- 5. Drop old FK on contract_signers
ALTER TABLE public.contract_signers
  DROP CONSTRAINT IF EXISTS contract_signers_document_id_fkey;

-- 6. Update contract_signers.document_id to point to new contracts rows
UPDATE public.contract_signers cs
SET document_id = c.id
FROM public.contracts c
WHERE c.booking_document_id = cs.document_id;

-- 7. Add new FK to contracts
ALTER TABLE public.contract_signers
  ADD CONSTRAINT contract_signers_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- 8. Create index for common queries
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON public.contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_booking_document_id ON public.contracts(booking_document_id);
CREATE INDEX IF NOT EXISTS idx_contracts_draft_id ON public.contracts(draft_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_token ON public.contracts(contract_token);
CREATE INDEX IF NOT EXISTS idx_contracts_booking_id ON public.contracts(booking_id);

-- 9. RLS policies for contracts (drop existing if any, then recreate)
DROP POLICY IF EXISTS "Owner full access" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated read via token" ON public.contracts;
DROP POLICY IF EXISTS "Anon read via token" ON public.contracts;

-- Owner can do everything with their contracts
CREATE POLICY "Owner full access" ON public.contracts
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Any authenticated user can read contracts with a token (for signing)
CREATE POLICY "Authenticated read via token" ON public.contracts
  FOR SELECT TO authenticated
  USING (contract_token IS NOT NULL);

-- Anon users can read contracts with a token (for external signers)
CREATE POLICY "Anon read via token" ON public.contracts
  FOR SELECT TO anon
  USING (contract_token IS NOT NULL);

-- Allow anon to update contracts (for signature status updates)
CREATE POLICY "Anon update signed contracts" ON public.contracts
  FOR UPDATE TO anon
  USING (contract_token IS NOT NULL)
  WITH CHECK (contract_token IS NOT NULL);
