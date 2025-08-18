-- Add metadata column to event_index_status table
ALTER TABLE public.event_index_status 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Update the column description
COMMENT ON COLUMN public.event_index_status.metadata IS 'Stores processing statistics and summary information';