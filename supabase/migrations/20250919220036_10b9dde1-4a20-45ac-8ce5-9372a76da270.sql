-- Add fields for link generation and access control
ALTER TABLE public.epks ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.epks ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.epks ADD COLUMN IF NOT EXISTS expira_el date;
ALTER TABLE public.epks ADD COLUMN IF NOT EXISTS acceso_directo boolean NOT NULL DEFAULT true;

-- Create index for slug lookup
CREATE INDEX IF NOT EXISTS idx_epks_slug ON public.epks(slug);

-- Create table for tracking password attempts
CREATE TABLE IF NOT EXISTS public.epk_password_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_slug text NOT NULL,
  ip_address inet,
  failed_attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  locked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on password attempts table
ALTER TABLE public.epk_password_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for password attempts (system-level access)
CREATE POLICY "System can manage password attempts" 
ON public.epk_password_attempts 
FOR ALL 
USING (true);

-- Add unique constraint for IP tracking per EPK
CREATE UNIQUE INDEX IF NOT EXISTS idx_epk_password_attempts_slug_ip 
ON public.epk_password_attempts(epk_slug, ip_address);

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_epk_slug(artista_proyecto text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
  slug_exists boolean;
BEGIN
  -- Create base slug from artist name
  base_slug := lower(trim(regexp_replace(artista_proyecto, '[^a-zA-Z0-9\s]', '', 'g')));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  -- Ensure base_slug is not empty
  IF base_slug = '' THEN
    base_slug := 'epk';
  END IF;
  
  -- Add random suffix to ensure uniqueness
  final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);
  
  -- Check if slug exists (shouldn't happen with UUID but safety check)
  SELECT EXISTS(SELECT 1 FROM public.epks WHERE slug = final_slug) INTO slug_exists;
  
  WHILE slug_exists LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);
    SELECT EXISTS(SELECT 1 FROM public.epks WHERE slug = final_slug) INTO slug_exists;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Function to check password attempts and handle lockout
CREATE OR REPLACE FUNCTION public.check_epk_password_attempts(epk_slug text, client_ip inet DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_record public.epk_password_attempts%ROWTYPE;
  max_attempts integer := 3;
  lockout_duration interval := '5 minutes';
  result jsonb;
BEGIN
  -- Get or create attempt record
  SELECT * INTO attempt_record 
  FROM public.epk_password_attempts 
  WHERE epk_slug = check_epk_password_attempts.epk_slug 
  AND ip_address = client_ip;
  
  IF NOT FOUND THEN
    INSERT INTO public.epk_password_attempts (epk_slug, ip_address)
    VALUES (check_epk_password_attempts.epk_slug, client_ip)
    RETURNING * INTO attempt_record;
  END IF;
  
  -- Check if currently locked
  IF attempt_record.locked_until IS NOT NULL AND attempt_record.locked_until > now() THEN
    result := jsonb_build_object(
      'allowed', false,
      'locked', true,
      'locked_until', attempt_record.locked_until,
      'remaining_attempts', 0
    );
  ELSE
    -- Reset if lockout period has passed
    IF attempt_record.locked_until IS NOT NULL AND attempt_record.locked_until <= now() THEN
      UPDATE public.epk_password_attempts 
      SET failed_attempts = 0, locked_until = NULL 
      WHERE id = attempt_record.id;
      attempt_record.failed_attempts := 0;
      attempt_record.locked_until := NULL;
    END IF;
    
    result := jsonb_build_object(
      'allowed', attempt_record.failed_attempts < max_attempts,
      'locked', false,
      'remaining_attempts', max_attempts - attempt_record.failed_attempts,
      'lockout_duration_minutes', extract(epoch from lockout_duration) / 60
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function to record failed password attempt
CREATE OR REPLACE FUNCTION public.record_failed_password_attempt(epk_slug text, client_ip inet DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_attempts integer := 3;
  lockout_duration interval := '5 minutes';
  new_attempts integer;
  locked_until_time timestamp with time zone := NULL;
BEGIN
  -- Update failed attempts
  UPDATE public.epk_password_attempts 
  SET 
    failed_attempts = failed_attempts + 1,
    last_attempt_at = now(),
    locked_until = CASE 
      WHEN failed_attempts + 1 >= max_attempts THEN now() + lockout_duration
      ELSE locked_until
    END
  WHERE epk_slug = record_failed_password_attempt.epk_slug 
  AND ip_address = client_ip
  RETURNING failed_attempts, locked_until INTO new_attempts, locked_until_time;
  
  RETURN jsonb_build_object(
    'attempts', new_attempts,
    'locked', new_attempts >= max_attempts,
    'locked_until', locked_until_time,
    'remaining_attempts', GREATEST(0, max_attempts - new_attempts)
  );
END;
$$;

-- Function to reset password attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_password_attempts(epk_slug text, client_ip inet DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.epk_password_attempts 
  SET failed_attempts = 0, locked_until = NULL 
  WHERE epk_slug = reset_password_attempts.epk_slug 
  AND ip_address = client_ip;
END;
$$;