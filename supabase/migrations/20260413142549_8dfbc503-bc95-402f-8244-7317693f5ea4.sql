
CREATE TABLE public.release_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text,
  file_type text DEFAULT 'application/pdf',
  document_type text NOT NULL DEFAULT 'contract',
  status text NOT NULL DEFAULT 'draft',
  content text,
  contract_token text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.release_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view release documents"
  ON public.release_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert release documents"
  ON public.release_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update release documents"
  ON public.release_documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete release documents"
  ON public.release_documents FOR DELETE
  TO authenticated
  USING (true);
