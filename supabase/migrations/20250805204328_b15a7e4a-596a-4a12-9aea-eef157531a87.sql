-- Create enum for request types
CREATE TYPE public.request_type AS ENUM ('entrevista', 'booking', 'otro');

-- Create enum for request status  
CREATE TYPE public.request_status AS ENUM ('pendiente', 'aprobada', 'denegada');

-- Create solicitudes table with all required fields
CREATE TABLE public.solicitudes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.request_type NOT NULL,
  nombre_solicitante TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  observaciones TEXT,
  notas_internas TEXT,
  estado public.request_status NOT NULL DEFAULT 'pendiente',
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  artist_id UUID REFERENCES public.profiles(id),
  
  -- Campos específicos para entrevistas
  medio TEXT,
  nombre_entrevistador TEXT,
  nombre_programa TEXT,
  hora_entrevista TIMESTAMP WITH TIME ZONE,
  informacion_programa TEXT,
  
  -- Campos específicos para bookings
  hora_show TIMESTAMP WITH TIME ZONE,
  nombre_festival TEXT,
  lugar_concierto TEXT,
  ciudad TEXT,
  
  -- Campo libre para tipo "otro"
  descripcion_libre TEXT,
  
  -- Campos para adjuntos
  archivos_adjuntos JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view solicitudes" 
ON public.solicitudes 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create solicitudes" 
ON public.solicitudes 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update solicitudes" 
ON public.solicitudes 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete solicitudes" 
ON public.solicitudes 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Create notifications table for the notification system
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_solicitudes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_solicitudes_updated_at
BEFORE UPDATE ON public.solicitudes
FOR EACH ROW
EXECUTE FUNCTION public.update_solicitudes_updated_at();

-- Function to create notifications when solicitudes status changes
CREATE OR REPLACE FUNCTION public.notify_solicitud_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status actually changed
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      related_id
    ) VALUES (
      (SELECT user_id FROM public.profiles WHERE id = NEW.artist_id),
      'Solicitud actualizada',
      CASE NEW.estado
        WHEN 'aprobada' THEN 'Tu solicitud "' || NEW.nombre_solicitante || '" ha sido aprobada'
        WHEN 'denegada' THEN 'Tu solicitud "' || NEW.nombre_solicitante || '" ha sido denegada'
        ELSE 'Tu solicitud "' || NEW.nombre_solicitante || '" ha sido actualizada'
      END,
      'request',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change notifications
CREATE TRIGGER notify_solicitud_status_change_trigger
AFTER UPDATE ON public.solicitudes
FOR EACH ROW
EXECUTE FUNCTION public.notify_solicitud_status_change();