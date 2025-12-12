-- Create booking_itinerary table for timeline items (flights, hotels, transport, shows)
CREATE TABLE public.booking_itinerary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('flight', 'hotel', 'transport', 'show', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  cost NUMERIC DEFAULT 0,
  handler TEXT DEFAULT 'agency',
  payer TEXT DEFAULT 'promoter',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking_expenses table for variable expenses
CREATE TABLE public.booking_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  iva_percentage NUMERIC DEFAULT 21,
  handler TEXT NOT NULL DEFAULT 'agency',
  payer TEXT NOT NULL DEFAULT 'promoter',
  category TEXT DEFAULT 'other',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking_documents table for contracts and attachments
CREATE TABLE public.booking_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  document_type TEXT NOT NULL DEFAULT 'other' CHECK (document_type IN ('contract', 'rider', 'press_kit', 'invoice', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.booking_itinerary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_itinerary
CREATE POLICY "Users can view booking itinerary" ON public.booking_itinerary FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create booking itinerary" ON public.booking_itinerary FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update booking itinerary" ON public.booking_itinerary FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete booking itinerary" ON public.booking_itinerary FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for booking_expenses
CREATE POLICY "Users can view booking expenses" ON public.booking_expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create booking expenses" ON public.booking_expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update booking expenses" ON public.booking_expenses FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete booking expenses" ON public.booking_expenses FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for booking_documents
CREATE POLICY "Users can view booking documents" ON public.booking_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create booking documents" ON public.booking_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update booking documents" ON public.booking_documents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete booking documents" ON public.booking_documents FOR DELETE USING (auth.role() = 'authenticated');