-- Table for Tour Roadmaps (Hojas de Ruta)
CREATE TABLE public.tour_roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  promoter TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for roadmap blocks (modular sections)
CREATE TABLE public.tour_roadmap_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_id UUID NOT NULL REFERENCES public.tour_roadmaps(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('header', 'schedule', 'travel', 'hospitality', 'production', 'contacts')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tour_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_roadmap_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tour_roadmaps
CREATE POLICY "Users can view roadmaps they created or for their artists"
ON public.tour_roadmaps FOR SELECT
USING (
  auth.uid() = created_by 
  OR artist_id IN (
    SELECT artist_id FROM public.artist_role_bindings WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create roadmaps"
ON public.tour_roadmaps FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their roadmaps"
ON public.tour_roadmaps FOR UPDATE
USING (
  auth.uid() = created_by 
  OR artist_id IN (
    SELECT artist_id FROM public.artist_role_bindings WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their roadmaps"
ON public.tour_roadmaps FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for tour_roadmap_blocks
CREATE POLICY "Users can view blocks for accessible roadmaps"
ON public.tour_roadmap_blocks FOR SELECT
USING (
  roadmap_id IN (
    SELECT id FROM public.tour_roadmaps 
    WHERE auth.uid() = created_by 
    OR artist_id IN (
      SELECT artist_id FROM public.artist_role_bindings WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage blocks for their roadmaps"
ON public.tour_roadmap_blocks FOR INSERT
WITH CHECK (
  roadmap_id IN (
    SELECT id FROM public.tour_roadmaps 
    WHERE auth.uid() = created_by 
    OR artist_id IN (
      SELECT artist_id FROM public.artist_role_bindings WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update blocks for their roadmaps"
ON public.tour_roadmap_blocks FOR UPDATE
USING (
  roadmap_id IN (
    SELECT id FROM public.tour_roadmaps 
    WHERE auth.uid() = created_by 
    OR artist_id IN (
      SELECT artist_id FROM public.artist_role_bindings WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete blocks for their roadmaps"
ON public.tour_roadmap_blocks FOR DELETE
USING (
  roadmap_id IN (
    SELECT id FROM public.tour_roadmaps 
    WHERE auth.uid() = created_by 
    OR artist_id IN (
      SELECT artist_id FROM public.artist_role_bindings WHERE user_id = auth.uid()
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_tour_roadmaps_artist ON public.tour_roadmaps(artist_id);
CREATE INDEX idx_tour_roadmaps_created_by ON public.tour_roadmaps(created_by);
CREATE INDEX idx_tour_roadmap_blocks_roadmap ON public.tour_roadmap_blocks(roadmap_id);

-- Trigger for updated_at
CREATE TRIGGER update_tour_roadmaps_updated_at
BEFORE UPDATE ON public.tour_roadmaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tour_roadmap_blocks_updated_at
BEFORE UPDATE ON public.tour_roadmap_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();