-- Fix the infinite recursion in RLS policies by simplifying them

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view their own profile and related profiles" ON public.profiles;

-- Create simplified policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "All authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Update other policies to be simpler and avoid recursion
DROP POLICY IF EXISTS "Users can view their related requests" ON public.requests;
DROP POLICY IF EXISTS "Management can create requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their related requests" ON public.requests;

DROP POLICY IF EXISTS "Users can view their related events" ON public.events;
DROP POLICY IF EXISTS "Users can create events for their artists" ON public.events;
DROP POLICY IF EXISTS "Users can update their related events" ON public.events;

DROP POLICY IF EXISTS "Users can view their related financial reports" ON public.financial_reports;
DROP POLICY IF EXISTS "Management can create financial reports" ON public.financial_reports;

DROP POLICY IF EXISTS "Users can view their related documents" ON public.documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;

-- Create simplified policies for requests
CREATE POLICY "Users can view requests" 
ON public.requests 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create requests" 
ON public.requests 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update requests" 
ON public.requests 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create simplified policies for events
CREATE POLICY "Users can view events" 
ON public.events 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update events" 
ON public.events 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create simplified policies for financial_reports
CREATE POLICY "Users can view financial reports" 
ON public.financial_reports 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create financial reports" 
ON public.financial_reports 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Create simplified policies for documents
CREATE POLICY "Users can view documents" 
ON public.documents 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Create simplified policies for chat_messages
CREATE POLICY "Users can view messages" 
ON public.chat_messages 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');