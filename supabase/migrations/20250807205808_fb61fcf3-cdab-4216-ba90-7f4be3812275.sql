-- Add decision comment and metadata to solicitudes
ALTER TABLE public.solicitudes
  ADD COLUMN IF NOT EXISTS comentario_estado text,
  ADD COLUMN IF NOT EXISTS decision_por uuid,
  ADD COLUMN IF NOT EXISTS decision_fecha timestamptz;

-- Optional index to query by decision date later
CREATE INDEX IF NOT EXISTS idx_solicitudes_decision_fecha ON public.solicitudes(decision_fecha);
