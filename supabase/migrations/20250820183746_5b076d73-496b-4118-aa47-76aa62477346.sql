-- RBAC Schema Implementation for Multi-Scope Permissions

-- Create enums for role types
CREATE TYPE public.workspace_role AS ENUM ('OWNER', 'TEAM_MANAGER');
CREATE TYPE public.artist_role AS ENUM ('ARTIST_MANAGER', 'ARTIST_OBSERVER');
CREATE TYPE public.project_role AS ENUM ('EDITOR', 'COMMENTER', 'VIEWER');
CREATE TYPE public.project_type AS ENUM ('TOUR', 'SINGLE_RELEASE', 'VIDEO', 'CAMPAIGN');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_memberships table
CREATE TABLE public.workspace_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Update artists table to include workspace relationship
ALTER TABLE public.profiles ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create artists table (separate from profiles for business logic)
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage_name TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create artist_role_bindings table
CREATE TABLE public.artist_role_bindings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.artist_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_id, user_id)
);

-- Update projects table for new schema
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN project_type public.project_type DEFAULT 'CAMPAIGN';
ALTER TABLE public.projects ADD COLUMN labels TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.projects ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Create project_role_bindings table
CREATE TABLE public.project_role_bindings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.project_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.workspace_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance indexes for authorization lookups
CREATE INDEX idx_workspace_memberships_user_id ON public.workspace_memberships(user_id);
CREATE INDEX idx_workspace_memberships_workspace_id ON public.workspace_memberships(workspace_id);
CREATE INDEX idx_artist_role_bindings_user_id ON public.artist_role_bindings(user_id);
CREATE INDEX idx_artist_role_bindings_artist_id ON public.artist_role_bindings(artist_id);
CREATE INDEX idx_project_role_bindings_user_id ON public.project_role_bindings(user_id);
CREATE INDEX idx_project_role_bindings_project_id ON public.project_role_bindings(project_id);
CREATE INDEX idx_artists_workspace_id ON public.artists(workspace_id);
CREATE INDEX idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX idx_projects_artist_id ON public.projects(artist_id);
CREATE INDEX idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_workspace_roles(_user_id UUID)
RETURNS TABLE(workspace_id UUID, role public.workspace_role)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wm.workspace_id, wm.role
  FROM public.workspace_memberships wm
  WHERE wm.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_artist_roles(_user_id UUID)
RETURNS TABLE(artist_id UUID, role public.artist_role)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT arb.artist_id, arb.role
  FROM public.artist_role_bindings arb
  WHERE arb.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_project_roles(_user_id UUID)
RETURNS TABLE(project_id UUID, role public.project_role)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT prb.project_id, prb.role
  FROM public.project_role_bindings prb
  WHERE prb.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_has_workspace_permission(_user_id UUID, _workspace_id UUID, _required_role public.workspace_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.user_id = _user_id 
    AND wm.workspace_id = _workspace_id
    AND (
      (wm.role = 'OWNER') OR
      (wm.role = _required_role)
    )
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_role_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_role_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (public.user_has_workspace_permission(auth.uid(), id, 'OWNER'));

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for workspace_memberships
CREATE POLICY "Users can view memberships in their workspaces"
  ON public.workspace_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage memberships"
  ON public.workspace_memberships FOR ALL
  USING (public.user_has_workspace_permission(auth.uid(), workspace_id, 'OWNER'));

-- RLS Policies for artists
CREATE POLICY "Users can view artists in their workspaces"
  ON public.artists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_memberships wm
      WHERE wm.workspace_id = artists.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team managers can create artists"
  ON public.artists FOR INSERT
  WITH CHECK (public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'));

CREATE POLICY "Team managers can update artists"
  ON public.artists FOR UPDATE
  USING (public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'));

-- RLS Policies for artist_role_bindings
CREATE POLICY "Users can view artist roles in their workspaces"
  ON public.artist_role_bindings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists a
      JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
      WHERE a.id = artist_id AND wm.user_id = auth.uid()
    )
  );

-- RLS Policies for project_role_bindings
CREATE POLICY "Users can view project roles they have access to"
  ON public.project_role_bindings FOR SELECT
  USING (
    -- User can see roles if they have workspace access or direct project access
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.artists a ON a.id = p.artist_id
      JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
      WHERE p.id = project_id AND wm.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs for resources they access"
  ON public.audit_logs FOR SELECT
  USING (
    -- Simplified: users can see logs for actions they performed
    actor_user_id = auth.uid()
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations for their workspaces"
  ON public.invitations FOR SELECT
  USING (public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'));

CREATE POLICY "Team managers can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_memberships_updated_at
  BEFORE UPDATE ON public.workspace_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_role_bindings_updated_at
  BEFORE UPDATE ON public.artist_role_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_role_bindings_updated_at
  BEFORE UPDATE ON public.project_role_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();