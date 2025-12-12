-- Create song_splits table for managing royalty percentages
CREATE TABLE public.song_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  collaborator_name TEXT NOT NULL,
  collaborator_email TEXT,
  collaborator_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  percentage NUMERIC NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  role TEXT NOT NULL DEFAULT 'writer',
  payment_info TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create platform_earnings table for streaming income per platform
CREATE TABLE public.platform_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  streams INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  currency TEXT DEFAULT 'EUR',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.song_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

-- Song splits policies
CREATE POLICY "Users can view song splits" ON public.song_splits
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create song splits" ON public.song_splits
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update song splits" ON public.song_splits
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete song splits" ON public.song_splits
  FOR DELETE USING (auth.uid() = created_by);

-- Platform earnings policies
CREATE POLICY "Users can view platform earnings" ON public.platform_earnings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create platform earnings" ON public.platform_earnings
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update platform earnings" ON public.platform_earnings
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete platform earnings" ON public.platform_earnings
  FOR DELETE USING (auth.uid() = created_by);

-- Add triggers for updated_at
CREATE TRIGGER update_song_splits_updated_at
  BEFORE UPDATE ON public.song_splits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_earnings_updated_at
  BEFORE UPDATE ON public.platform_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();