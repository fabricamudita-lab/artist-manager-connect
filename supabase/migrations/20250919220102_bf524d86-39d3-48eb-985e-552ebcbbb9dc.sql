-- Fix security warnings by setting search_path on the new functions
ALTER FUNCTION public.generate_epk_slug(text) SET search_path = 'public';
ALTER FUNCTION public.check_epk_password_attempts(text, inet) SET search_path = 'public';
ALTER FUNCTION public.record_failed_password_attempt(text, inet) SET search_path = 'public';
ALTER FUNCTION public.reset_password_attempts(text, inet) SET search_path = 'public';