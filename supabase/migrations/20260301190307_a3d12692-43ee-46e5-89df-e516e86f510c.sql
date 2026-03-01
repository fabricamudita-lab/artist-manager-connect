
-- Add fiscal profile fields to artists table
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS irpf_type TEXT DEFAULT 'profesional_establecido',
  ADD COLUMN IF NOT EXISTS irpf_porcentaje DECIMAL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS actividad_inicio DATE,
  ADD COLUMN IF NOT EXISTS nif TEXT,
  ADD COLUMN IF NOT EXISTS tipo_entidad TEXT DEFAULT 'persona_fisica';
