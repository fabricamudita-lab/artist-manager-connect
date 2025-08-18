-- Create table for storing event document index
CREATE TABLE public.event_document_index (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL, -- id_oferta from booking_offers
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  subfolder TEXT NOT NULL,
  content_fragment TEXT NOT NULL,
  fragment_index INTEGER NOT NULL DEFAULT 0,
  page_number INTEGER DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(384), -- For sentence-transformers embeddings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking reindex status
CREATE TABLE public.event_index_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  total_documents INTEGER NOT NULL DEFAULT 0,
  processed_documents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'idle', -- idle, processing, completed, error
  last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_document_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_index_status ENABLE ROW LEVEL SECURITY;

-- Create policies for event_document_index
CREATE POLICY "Users can view event document index" 
ON public.event_document_index 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create event document index" 
ON public.event_document_index 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update event document index" 
ON public.event_document_index 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete event document index" 
ON public.event_document_index 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Create policies for event_index_status
CREATE POLICY "Users can view event index status" 
ON public.event_index_status 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create event index status" 
ON public.event_index_status 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update event index status" 
ON public.event_index_status 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

-- Create indexes for better performance
CREATE INDEX idx_event_document_index_event_id ON public.event_document_index(event_id);
CREATE INDEX idx_event_document_index_file_path ON public.event_document_index(file_path);
CREATE INDEX idx_event_document_index_subfolder ON public.event_document_index(subfolder);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_event_index_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_event_document_index_updated_at
BEFORE UPDATE ON public.event_document_index
FOR EACH ROW
EXECUTE FUNCTION public.update_event_index_updated_at();

CREATE TRIGGER update_event_index_status_updated_at
BEFORE UPDATE ON public.event_index_status
FOR EACH ROW
EXECUTE FUNCTION public.update_event_index_updated_at();