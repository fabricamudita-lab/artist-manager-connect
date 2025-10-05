-- Create contact_groups table
CREATE TABLE public.contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_group_members table (many-to-many relationship)
CREATE TABLE public.contact_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, contact_id)
);

-- Enable Row Level Security
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_groups
CREATE POLICY "Users can view contact groups"
  ON public.contact_groups
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create contact groups"
  ON public.contact_groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their contact groups"
  ON public.contact_groups
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their contact groups"
  ON public.contact_groups
  FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for contact_group_members
CREATE POLICY "Users can view contact group members"
  ON public.contact_group_members
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage contact group members"
  ON public.contact_group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_groups
      WHERE contact_groups.id = contact_group_members.group_id
      AND contact_groups.created_by = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_contact_groups_updated_at
  BEFORE UPDATE ON public.contact_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();