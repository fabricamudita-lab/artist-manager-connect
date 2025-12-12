-- Chat channels table for contextual conversations
CREATE TABLE public.chat_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'project' CHECK (channel_type IN ('project', 'department', 'general')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Channel messages table
CREATE TABLE public.channel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_by UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Channel members table
CREATE TABLE public.channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_channels
CREATE POLICY "Authenticated users can view channels" ON public.chat_channels
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create channels" ON public.chat_channels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Channel creators can update their channels" ON public.chat_channels
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Channel creators can delete their channels" ON public.chat_channels
  FOR DELETE USING (created_by = auth.uid());

-- RLS policies for channel_messages
CREATE POLICY "Authenticated users can view channel messages" ON public.channel_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can send messages" ON public.channel_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Message senders can update their messages" ON public.channel_messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Message senders can delete their messages" ON public.channel_messages
  FOR DELETE USING (sender_id = auth.uid());

-- RLS policies for channel_members
CREATE POLICY "Authenticated users can view channel members" ON public.channel_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can join channels" ON public.channel_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can leave channels" ON public.channel_members
  FOR DELETE USING (user_id = auth.uid());

-- Enable realtime for channel messages
ALTER TABLE public.channel_messages REPLICA IDENTITY FULL;