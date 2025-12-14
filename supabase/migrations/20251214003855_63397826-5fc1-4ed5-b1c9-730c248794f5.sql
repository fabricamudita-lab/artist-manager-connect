-- Remove old check constraint and add new one with pending_signature
ALTER TABLE public.booking_documents DROP CONSTRAINT IF EXISTS booking_documents_status_check;

ALTER TABLE public.booking_documents 
ADD CONSTRAINT booking_documents_status_check 
CHECK (status IN ('draft', 'pending_signature', 'signed', 'other'));