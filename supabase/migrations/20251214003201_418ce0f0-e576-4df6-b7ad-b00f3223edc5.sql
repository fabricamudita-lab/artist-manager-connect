-- Add signature-related columns to booking_documents
ALTER TABLE public.booking_documents
ADD COLUMN IF NOT EXISTS contract_token UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS signer_name TEXT,
ADD COLUMN IF NOT EXISTS signature_image_url TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_booking_documents_contract_token ON public.booking_documents(contract_token);

-- Create a public policy for viewing documents by token (for signature page)
CREATE POLICY "Anyone can view documents by token"
ON public.booking_documents
FOR SELECT
USING (contract_token IS NOT NULL);

-- Create a public policy for updating documents by token (for signing)
CREATE POLICY "Anyone can sign documents by token"
ON public.booking_documents
FOR UPDATE
USING (contract_token IS NOT NULL AND status = 'pending_signature')
WITH CHECK (contract_token IS NOT NULL);

-- Create storage bucket for signatures if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for signatures bucket
CREATE POLICY "Anyone can upload signatures"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Anyone can view signatures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures');