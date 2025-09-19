-- Fix security definer functions with proper search_path
CREATE OR REPLACE FUNCTION public.increment_epk_view(epk_slug text, visitor_ip inet DEFAULT NULL, is_unique boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.epks 
  SET 
    vistas_totales = vistas_totales + 1,
    vistas_unicas = CASE WHEN is_unique THEN vistas_unicas + 1 ELSE vistas_unicas END,
    ultima_vista_en = now()
  WHERE slug = epk_slug;
  
  -- Insert analytics record if tracking is enabled
  INSERT INTO public.epk_analytics (epk_id, ip_address, accion)
  SELECT id, visitor_ip, 'vista'
  FROM public.epks 
  WHERE slug = epk_slug AND rastrear_analiticas = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_epk_download(epk_slug text, recurso text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.epks 
  SET descargas_totales = descargas_totales + 1
  WHERE slug = epk_slug;
  
  -- Insert analytics record if tracking is enabled
  INSERT INTO public.epk_analytics (epk_id, accion, recurso)
  SELECT id, 'descarga', recurso
  FROM public.epks 
  WHERE slug = epk_slug AND rastrear_analiticas = true;
END;
$$;