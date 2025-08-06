-- Create contacts table for managing external contacts
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  role TEXT, -- manager, prensa, técnico, promotor, etc.
  notes TEXT,
  artist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update contacts" 
ON public.contacts 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete contacts" 
ON public.contacts 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add contact_id to solicitudes table
ALTER TABLE public.solicitudes 
ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;