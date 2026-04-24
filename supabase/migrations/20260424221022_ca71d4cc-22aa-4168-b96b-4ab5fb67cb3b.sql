ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS recording_fixation_date date;

COMMENT ON COLUMN public.tracks.recording_fixation_date IS
  'Fecha en la que se fijo (grabo) por primera vez la interpretacion. Util para contratos de Propiedad Intelectual y registros legales.';