-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('artist', 'management');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'artist',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create requests table for booking/interview requests
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  management_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking', 'interview', 'consultation')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table for calendar
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('concert', 'recording', 'meeting', 'deadline', 'other')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_reports table for royalties and sales
CREATE TABLE public.financial_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('royalties', 'sales', 'merchandise')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for file management
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('contract', 'photos', 'videos', 'other')),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table for internal communication
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile and related profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id OR 
       auth.uid() IN (
         SELECT user_id FROM public.profiles 
         WHERE (role = 'management' AND EXISTS(
           SELECT 1 FROM public.profiles p2 
           WHERE p2.user_id = auth.uid() AND p2.role = 'artist'
         )) OR (role = 'artist' AND EXISTS(
           SELECT 1 FROM public.profiles p2 
           WHERE p2.user_id = auth.uid() AND p2.role = 'management'
         ))
       ));

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for requests
CREATE POLICY "Users can view their related requests" 
ON public.requests 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = artist_id OR id = management_id
));

CREATE POLICY "Management can create requests" 
ON public.requests 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE role = 'management' AND id = management_id
));

CREATE POLICY "Users can update their related requests" 
ON public.requests 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = artist_id OR id = management_id
));

-- Create RLS policies for events
CREATE POLICY "Users can view their related events" 
ON public.events 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = artist_id OR id = created_by
));

CREATE POLICY "Users can create events for their artists" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = created_by
));

CREATE POLICY "Users can update their related events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = artist_id OR id = created_by
));

-- Create RLS policies for financial_reports
CREATE POLICY "Users can view their related financial reports" 
ON public.financial_reports 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = artist_id OR id = created_by
));

CREATE POLICY "Management can create financial reports" 
ON public.financial_reports 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE role = 'management' AND id = created_by
));

-- Create RLS policies for documents
CREATE POLICY "Users can view their related documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = artist_id OR id = uploaded_by
));

CREATE POLICY "Users can upload documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = uploaded_by
));

-- Create RLS policies for chat_messages
CREATE POLICY "Users can view their own messages" 
ON public.chat_messages 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = sender_id OR id = recipient_id
));

CREATE POLICY "Users can send messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE id = sender_id
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
BEFORE UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_reports_updated_at
BEFORE UPDATE ON public.financial_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'artist')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on user registration
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for documents
CREATE POLICY "Users can view their related document files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = ANY(
  SELECT p.user_id::text FROM public.profiles p
  JOIN public.documents d ON (p.id = d.artist_id OR p.id = d.uploaded_by)
  WHERE d.file_url LIKE '%' || name || '%'
));

CREATE POLICY "Users can upload document files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their document files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.uid()::text = ANY(
  SELECT p.user_id::text FROM public.profiles p
  JOIN public.documents d ON p.id = d.uploaded_by
  WHERE d.file_url LIKE '%' || name || '%'
));

CREATE POLICY "Users can delete their document files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid()::text = ANY(
  SELECT p.user_id::text FROM public.profiles p
  JOIN public.documents d ON p.id = d.uploaded_by
  WHERE d.file_url LIKE '%' || name || '%'
));